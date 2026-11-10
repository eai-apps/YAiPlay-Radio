package com.yaiplay.radio;

import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.annotation.OptIn;
import androidx.media3.common.ForwardingPlayer;
import androidx.media3.common.Player;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.session.MediaSession;
import androidx.media3.session.MediaSessionService;

/**
 * Системная карточка плеера: шторка, экран блокировки, наушники, Bluetooth, часы.
 * Работает прямо с нативным плеером (YAiPlayer), поэтому пауза/плей срабатывают, даже когда
 * страница приложения «спит» (MIUI, экономия батареи). «Дальше/назад» передаются в приложение —
 * там знают список станций.
 */
@OptIn(markerClass = UnstableApi.class)
public class YAiPlaybackService extends MediaSessionService {
    private static volatile YAiPlaybackService inst;
    private MediaSession session;

    /** Запустить сервис (вызывается, когда пользователь включает радио — приложение на экране) */
    static void start(Context c) {
        if (inst != null) return;
        try {
            c.startService(new Intent(c, YAiPlaybackService.class));
        } catch (Exception ignored) {
            // Android 12+: из фона сервис не стартует — запустится при следующем нажатии в приложении
        }
    }

    static void stop(Context c) {
        try {
            c.stopService(new Intent(c, YAiPlaybackService.class));
        } catch (Exception ignored) {}
    }

    /** Плеер пересоздан (сменили буфер) — карточка переключается на новый */
    static void playerChanged(@NonNull Player p) {
        YAiPlaybackService s = inst;
        if (s != null && s.session != null) s.session.setPlayer(new RemotePlayer(s, p));
    }

    @Override
    public void onCreate() {
        super.onCreate();
        inst = this;
        Player p = YAiPlayer.get(this).exo();
        MediaSession.Builder b = new MediaSession.Builder(this, new RemotePlayer(this, p)).setId("yaiplay-radio");
        Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
        if (open != null) {
            // Нажали на карточку — просто открываем приложение (оно уже запущено), без перезапуска радио
            open.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_REORDER_TO_FRONT);
            b.setSessionActivity(PendingIntent.getActivity(this, 7341, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        }
        session = b.build();
        addSession(session);
    }

    @Nullable
    @Override
    public MediaSession onGetSession(@NonNull MediaSession.ControllerInfo controllerInfo) {
        return session;
    }

    @Override
    public void onTaskRemoved(@Nullable Intent rootIntent) {
        Player p = session != null ? session.getPlayer() : null;
        if (p == null || !p.getPlayWhenReady()) stopSelf();
    }

    @Override
    public void onDestroy() {
        inst = null;
        if (session != null) {
            session.release(); // сам плеер принадлежит YAiPlayer — его не трогаем
            session = null;
        }
        super.onDestroy();
    }

    /**
     * Обёртка над ExoPlayer для карточки: плей/пауза идут через YAiPlayer (переподключение к живому эфиру),
     * «дальше/назад» всегда доступны и уходят в приложение.
     */
    static class RemotePlayer extends ForwardingPlayer {
        private static final Player.Commands EXTRA = new Player.Commands.Builder()
            .addAll(
                Player.COMMAND_PLAY_PAUSE,
                Player.COMMAND_STOP,
                Player.COMMAND_SEEK_TO_NEXT,
                Player.COMMAND_SEEK_TO_NEXT_MEDIA_ITEM,
                Player.COMMAND_SEEK_TO_PREVIOUS,
                Player.COMMAND_SEEK_TO_PREVIOUS_MEDIA_ITEM
            )
            .build();
        private final Context ctx;

        RemotePlayer(Context c, Player p) {
            super(p);
            ctx = c.getApplicationContext();
        }

        @NonNull
        @Override
        public Player.Commands getAvailableCommands() {
            return super.getAvailableCommands().buildUpon().addAll(EXTRA).build();
        }

        @Override
        public boolean isCommandAvailable(int command) {
            return EXTRA.contains(command) || super.isCommandAvailable(command);
        }

        @Override
        public void play() {
            YAiPlayer.get(ctx).play();
        }

        @Override
        public void pause() {
            YAiPlayer.get(ctx).pause();
        }

        @Override
        public void setPlayWhenReady(boolean playWhenReady) {
            if (playWhenReady) play();
            else pause();
        }

        @Override
        public void stop() {
            YAiPlayer.get(ctx).pause();
        }

        @Override
        public boolean hasNextMediaItem() {
            return true;
        }

        @Override
        public boolean hasPreviousMediaItem() {
            return true;
        }

        @Override
        public void seekToNext() {
            YAiNativePlugin.emitRemote("next");
        }

        @Override
        public void seekToNextMediaItem() {
            YAiNativePlugin.emitRemote("next");
        }

        @Override
        public void seekToPrevious() {
            YAiNativePlugin.emitRemote("prev");
        }

        @Override
        public void seekToPreviousMediaItem() {
            YAiNativePlugin.emitRemote("prev");
        }
    }
}
