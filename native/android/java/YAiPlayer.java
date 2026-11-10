package com.yaiplay.radio;

import android.content.Context;
import android.net.Uri;
import android.os.SystemClock;
import android.os.Handler;
import android.os.Looper;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.AudioAttributes;
import androidx.media3.common.C;
import androidx.media3.common.MediaItem;
import androidx.media3.common.MediaMetadata;
import androidx.media3.common.Metadata;
import androidx.media3.common.PlaybackException;
import androidx.media3.common.Player;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.datasource.DefaultHttpDataSource;
import androidx.media3.exoplayer.DefaultLoadControl;
import androidx.media3.exoplayer.DefaultRenderersFactory;
import androidx.media3.exoplayer.ExoPlayer;
import androidx.media3.exoplayer.audio.AudioSink;
import androidx.media3.exoplayer.audio.DefaultAudioSink;
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory;
import androidx.media3.extractor.metadata.icy.IcyInfo;

/**
 * Нативный плеер радио (Media3 / ExoPlayer) — им управляет приложение через YAiNativePlugin.
 * Плюсы против плеера WebView: http-станции, эквалайзер и визуализация (YAiDsp),
 * настраиваемый буфер от обрывов, автопереподключение, название песни прямо из потока (ICY).
 */
@OptIn(markerClass = UnstableApi.class)
public class YAiPlayer {
    public interface Listener {
        void onState(String state, String message);

        void onTitle(String title);

        void onViz(float[] bars);
    }

    private static YAiPlayer inst;

    static synchronized YAiPlayer get(Context c) {
        if (inst == null) inst = new YAiPlayer(c.getApplicationContext());
        return inst;
    }

    private final Context ctx;
    private final Handler main = new Handler(Looper.getMainLooper());
    final YAiDsp dsp = new YAiDsp();
    private ExoPlayer player;
    private volatile Listener listener;
    private String url = "";
    private int bufferMs = 2500;
    private float volume = 1f;
    private boolean wantPlay = false;
    private boolean startedOnce = false;
    private int retries = 0;
    private String lastState = "";
    private long pausedAt = 0;
    /** Название/станция/обложка для карточки в шторке и на экране блокировки (присылает приложение) */
    private MediaMetadata meta = new MediaMetadata.Builder().setTitle("YAi Radio").build();

    private YAiPlayer(Context c) {
        ctx = c;
        dsp.vizListener = bars -> {
            Listener l = listener;
            if (l != null) l.onViz(bars);
        };
    }

    void setListener(@Nullable Listener l) {
        listener = l;
    }

    void run(Runnable r) {
        if (Looper.myLooper() == Looper.getMainLooper()) r.run();
        else main.post(r);
    }

    private void ensure() {
        if (player != null) return;
        DefaultRenderersFactory rf = new DefaultRenderersFactory(ctx) {
            @Nullable
            @Override
            protected AudioSink buildAudioSink(@NonNull Context context, boolean enableFloatOutput, boolean enableAudioTrackPlaybackParams) {
                return new DefaultAudioSink.Builder(context).setAudioProcessors(new AudioProcessor[] { dsp }).build();
            }
        };
        int min = Math.max(15000, bufferMs);
        DefaultLoadControl lc = new DefaultLoadControl.Builder()
            .setBufferDurationsMs(min, Math.max(50000, min), bufferMs, bufferMs)
            .build();
        DefaultHttpDataSource.Factory http = new DefaultHttpDataSource.Factory()
            .setUserAgent("YAiPlayer/1.0 (Android)")
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(10000)
            .setReadTimeoutMs(20000);
        player = new ExoPlayer.Builder(ctx, rf)
            .setLoadControl(lc)
            .setMediaSourceFactory(new DefaultMediaSourceFactory(http))
            .build();
        player.setAudioAttributes(
            new AudioAttributes.Builder().setUsage(C.USAGE_MEDIA).setContentType(C.AUDIO_CONTENT_TYPE_MUSIC).build(),
            true // сам уступает звук звонку/навигатору и возвращается
        );
        player.setHandleAudioBecomingNoisy(true); // выдернули наушники — пауза
        player.setWakeMode(C.WAKE_MODE_NETWORK); // экран выключен — сеть и процессор не засыпают
        player.setVolume(volume);
        YAiPlaybackService.playerChanged(player);
        player.addListener(new Player.Listener() {
            @Override
            public void onIsPlayingChanged(boolean isPlaying) {
                if (isPlaying) {
                    startedOnce = true;
                    retries = 0;
                }
                emitState();
            }

            @Override
            public void onPlaybackStateChanged(int s) {
                // Живой эфир «закончился» — сервер оборвал поток: переподключаемся
                if (s == Player.STATE_ENDED && wantPlay) {
                    reconnect("ended");
                    return;
                }
                emitState();
            }

            @Override
            public void onPlayWhenReadyChanged(boolean playWhenReady, int reason) {
                if (!playWhenReady && reason != Player.PLAY_WHEN_READY_CHANGE_REASON_USER_REQUEST) wantPlay = false;
                emitState();
            }

            @Override
            public void onPlayerError(@NonNull PlaybackException e) {
                // Уже играло и оборвалось — тихо переподключаемся (до 6 раз). Не стартовало — ошибка: приложение проверит станцию.
                if (startedOnce && wantPlay && retries < 6) {
                    reconnect(e.getErrorCodeName());
                    return;
                }
                wantPlay = false;
                emit("error", e.getErrorCodeName());
            }

            @Override
            public void onMetadata(@NonNull Metadata md) {
                for (int i = 0; i < md.length(); i++) {
                    Metadata.Entry en = md.get(i);
                    if (en instanceof IcyInfo && ((IcyInfo) en).title != null) {
                        Listener l = listener;
                        if (l != null) l.onTitle(((IcyInfo) en).title);
                        // Песня в карточке шторки меняется сама, даже если приложение «спит»
                        setMeta(((IcyInfo) en).title.trim(), metaArtist, metaArt);
                    }
                }
            }
        });
    }

    private MediaItem item() {
        return new MediaItem.Builder().setUri(url).setMediaMetadata(meta).build();
    }

    /** Плеер для системной карточки (создаётся при необходимости). Только в главном потоке. */
    Player exo() {
        ensure();
        return player;
    }

    /** Новое название песни/станции и обложка — карточка обновляется без перезапуска эфира */
    private String metaKey = "";
    private String metaArtist = "";
    private String metaArt = "";

    void setMeta(String title, String artist, String artwork) {
        run(() -> {
            String key = title + "\u0001" + artist + "\u0001" + artwork;
            if (key.equals(metaKey)) return; // ничего не поменялось — эфир не трогаем
            metaKey = key;
            metaArtist = artist == null ? "" : artist;
            metaArt = artwork == null ? "" : artwork;
            MediaMetadata.Builder b = new MediaMetadata.Builder()
                .setTitle(title == null || title.isEmpty() ? "YAi Radio" : title)
                .setArtist(artist)
                .setAlbumTitle("YAi Radio")
                .setStation(artist);
            if (artwork != null && !artwork.isEmpty()) b.setArtworkUri(Uri.parse(artwork));
            meta = b.build();
            if (player != null && !url.isEmpty() && player.getMediaItemCount() > 0) {
                try {
                    player.replaceMediaItem(0, item());
                } catch (Exception ignored) {}
            }
        });
    }

    private void reconnect(String why) {
        retries++;
        emit("buffering", "reconnect:" + why);
        final String u = url;
        main.postDelayed(() -> {
            if (!wantPlay || player == null || !u.equals(url)) return;
            player.setMediaItem(item());
            player.prepare();
            player.play();
        }, Math.min(8000, 1500L * retries));
    }

    private void emitState() {
        if (player == null) return;
        int s = player.getPlaybackState();
        String st;
        if (player.isPlaying()) st = "playing";
        else if (!player.getPlayWhenReady()) st = "paused";
        else if (s == Player.STATE_BUFFERING || s == Player.STATE_IDLE) st = "buffering";
        else if (player.getPlaybackSuppressionReason() != Player.PLAYBACK_SUPPRESSION_REASON_NONE) st = "paused";
        else st = "buffering";
        emit(st, "");
    }

    private void emit(String st, String msg) {
        if (st.equals(lastState) && msg.isEmpty()) return;
        lastState = st;
        Listener l = listener;
        if (l != null) l.onState(st, msg);
    }

    // ---------- команды из приложения ----------
    void load(String u) {
        run(() -> {
            ensure();
            url = u == null ? "" : u;
            retries = 0;
            startedOnce = false;
            lastState = "";
            pausedAt = 0;
            if (url.isEmpty()) {
                player.stop();
                player.clearMediaItems();
                return;
            }
            player.setMediaItem(item());
            player.prepare();
        });
    }

    void play() {
        run(() -> {
            ensure();
            if (url.isEmpty()) return;
            wantPlay = true;
            YAiPlaybackService.start(ctx);
            // Пауза дольше 3 с — подключаемся к эфиру заново, чтобы играло «сейчас», а не старый кусок
            boolean stale = pausedAt > 0 && SystemClock.elapsedRealtime() - pausedAt > 3000;
            pausedAt = 0;
            if (stale || player.getPlaybackState() == Player.STATE_IDLE || player.getPlaybackState() == Player.STATE_ENDED) {
                player.setMediaItem(item());
                player.prepare();
            }
            player.play();
        });
    }

    void pause() {
        run(() -> {
            wantPlay = false;
            pausedAt = SystemClock.elapsedRealtime();
            if (player != null) player.pause();
        });
    }

    void stop() {
        run(() -> {
            wantPlay = false;
            if (player != null) {
                player.stop();
                player.clearMediaItems();
            }
        });
    }

    void setVolume(float v) {
        run(() -> {
            volume = Math.max(0f, Math.min(1f, v));
            if (player != null) player.setVolume(volume);
        });
    }

    void setEq(boolean enabled, float[] g, float bass) {
        for (int i = 0; i < YAiDsp.FREQS.length && i < g.length; i++) dsp.gains[i] = Math.max(-12f, Math.min(12f, g[i]));
        dsp.bassDb = Math.max(0f, Math.min(12f, bass));
        dsp.eqEnabled = enabled;
        dsp.dirty = true;
    }

    void setViz(boolean on) {
        dsp.vizEnabled = on;
    }

    /** Буфер (мс) перед стартом и после «заикания». Меняется пересозданием плеера, эфир продолжается. */
    void setBuffer(int ms) {
        run(() -> {
            int v = Math.max(500, Math.min(15000, ms));
            if (v == bufferMs) return;
            bufferMs = v;
            if (player == null) return;
            boolean was = wantPlay;
            player.release();
            player = null;
            lastState = "";
            if (!url.isEmpty()) {
                ensure();
                player.setMediaItem(item());
                player.prepare();
                if (was) player.play();
            }
        });
    }
}
