package com.yaiplay.radio;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.media.MediaPlayer;
import android.os.Build;
import android.os.Bundle;
import android.support.v4.media.MediaBrowserCompat;
import android.support.v4.media.MediaDescriptionCompat;
import android.support.v4.media.MediaMetadataCompat;
import android.support.v4.media.session.MediaSessionCompat;
import android.support.v4.media.session.PlaybackStateCompat;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import androidx.media.MediaBrowserServiceCompat;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Android Auto: каталог (Избранное, Недавние, Radio Record) и собственный плеер.
 * Данные приходят из приложения (YAiNative.saveLibrary).
 */
public class AutoMediaService extends MediaBrowserServiceCompat {
    private static final String ROOT = "root";
    private static final String CH = "YAi_auto";
    private static final int NOTIF_ID = 7330;
    private static final String[][] FOLDERS = {
        { "fav", "★ Избранное" },
        { "recent", "🕘 Недавние" },
        { "record", "🔥 Radio Record" },
    };

    private MediaSessionCompat session;
    private MediaPlayer mp;
    private final List<JSONObject> queue = new ArrayList<>();
    private int index = -1;
    private AudioManager audio;
    private AudioFocusRequest focusReq;
    private boolean foreground;

    @Override
    public void onCreate() {
        super.onCreate();
        audio = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
        session = new MediaSessionCompat(this, "YAiAuto");
        session.setCallback(new Callback());
        Intent open = new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        session.setSessionActivity(PendingIntent.getActivity(this, 7331, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        setState(PlaybackStateCompat.STATE_NONE, null);
        setSessionToken(session.getSessionToken());
    }

    // ---------- каталог ----------
    private JSONObject library() {
        try {
            return new JSONObject(YAiNativePlugin.prefs(this).getString("library", "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    private List<JSONObject> list(String folder) {
        List<JSONObject> out = new ArrayList<>();
        JSONArray a = library().optJSONArray(folder);
        if (a != null) for (int i = 0; i < a.length(); i++) {
            JSONObject o = a.optJSONObject(i);
            if (o != null && !o.optString("url", "").isEmpty()) out.add(o);
        }
        return out;
    }

    @Nullable
    @Override
    public BrowserRoot onGetRoot(@NonNull String clientPackageName, int clientUid, @Nullable Bundle rootHints) {
        return new BrowserRoot(ROOT, null);
    }

    @Override
    public void onLoadChildren(@NonNull String parentId, @NonNull Result<List<MediaBrowserCompat.MediaItem>> result) {
        List<MediaBrowserCompat.MediaItem> items = new ArrayList<>();
        if (ROOT.equals(parentId)) {
            for (String[] f : FOLDERS) {
                if (list(f[0]).isEmpty()) continue;
                MediaDescriptionCompat d = new MediaDescriptionCompat.Builder().setMediaId(f[0]).setTitle(f[1]).build();
                items.add(new MediaBrowserCompat.MediaItem(d, MediaBrowserCompat.MediaItem.FLAG_BROWSABLE));
            }
            if (items.isEmpty()) {
                MediaDescriptionCompat d = new MediaDescriptionCompat.Builder().setMediaId("empty")
                    .setTitle("Откройте YAi Radio на телефоне").setSubtitle("и добавьте станции в избранное ♥").build();
                items.add(new MediaBrowserCompat.MediaItem(d, MediaBrowserCompat.MediaItem.FLAG_BROWSABLE));
            }
        } else {
            List<JSONObject> l = list(parentId);
            for (int i = 0; i < l.size(); i++) {
                JSONObject s = l.get(i);
                MediaDescriptionCompat d = new MediaDescriptionCompat.Builder()
                    .setMediaId(parentId + "|" + i)
                    .setTitle(s.optString("name", "Радио"))
                    .setSubtitle(s.optString("subtitle", ""))
                    .build();
                items.add(new MediaBrowserCompat.MediaItem(d, MediaBrowserCompat.MediaItem.FLAG_PLAYABLE));
            }
        }
        result.sendResult(items);
    }

    // ---------- управление ----------
    private class Callback extends MediaSessionCompat.Callback {
        @Override
        public void onPlayFromMediaId(String mediaId, Bundle extras) {
            if (mediaId == null || !mediaId.contains("|")) return;
            String[] p = mediaId.split("\\|");
            queue.clear();
            queue.addAll(list(p[0]));
            try {
                index = Integer.parseInt(p[1]);
            } catch (Exception e) {
                index = 0;
            }
            playCurrent();
        }

        @Override
        public void onPlayFromSearch(String query, Bundle extras) {
            queue.clear();
            String q = query == null ? "" : query.toLowerCase(Locale.ROOT).trim();
            for (String[] f : FOLDERS) {
                for (JSONObject s : list(f[0])) {
                    if (q.isEmpty() || s.optString("name", "").toLowerCase(Locale.ROOT).contains(q)) queue.add(s);
                }
                if (!queue.isEmpty() && !q.isEmpty()) break;
            }
            index = 0;
            if (!queue.isEmpty()) playCurrent();
            else setState(PlaybackStateCompat.STATE_ERROR, "Станция не найдена");
        }

        @Override
        public void onPlay() {
            if (mp != null && !mp.isPlaying()) {
                if (requestFocus()) {
                    mp.start();
                    setState(PlaybackStateCompat.STATE_PLAYING, null);
                    showNotification(true);
                }
                return;
            }
            if (queue.isEmpty()) {
                for (String[] f : FOLDERS) {
                    queue.addAll(list(f[0]));
                    if (!queue.isEmpty()) break;
                }
                index = 0;
            }
            if (!queue.isEmpty()) playCurrent();
        }

        @Override
        public void onPause() {
            if (mp != null && mp.isPlaying()) mp.pause();
            setState(PlaybackStateCompat.STATE_PAUSED, null);
            showNotification(false);
        }

        @Override
        public void onStop() {
            stopAll();
        }

        @Override
        public void onSkipToNext() {
            if (queue.isEmpty()) return;
            index = (index + 1) % queue.size();
            playCurrent();
        }

        @Override
        public void onSkipToPrevious() {
            if (queue.isEmpty()) return;
            index = (index - 1 + queue.size()) % queue.size();
            playCurrent();
        }
    }

    private final AudioManager.OnAudioFocusChangeListener focusListener = change -> {
        if (change == AudioManager.AUDIOFOCUS_LOSS || change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
            if (mp != null && mp.isPlaying()) {
                mp.pause();
                setState(PlaybackStateCompat.STATE_PAUSED, null);
                showNotification(false);
            }
        } else if (change == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK) {
            if (mp != null) mp.setVolume(0.3f, 0.3f);
        } else if (change == AudioManager.AUDIOFOCUS_GAIN) {
            if (mp != null) mp.setVolume(1f, 1f);
        }
    };

    private boolean requestFocus() {
        if (audio == null) return true;
        if (Build.VERSION.SDK_INT >= 26) {
            focusReq = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                .setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build())
                .setOnAudioFocusChangeListener(focusListener)
                .build();
            return audio.requestAudioFocus(focusReq) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
        }
        return audio.requestAudioFocus(focusListener, AudioManager.STREAM_MUSIC, AudioManager.AUDIOFOCUS_GAIN) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED;
    }

    private void playCurrent() {
        if (index < 0 || index >= queue.size()) return;
        JSONObject s = queue.get(index);
        releasePlayer();
        if (!requestFocus()) return;
        session.setActive(true);
        session.setMetadata(new MediaMetadataCompat.Builder()
            .putString(MediaMetadataCompat.METADATA_KEY_MEDIA_ID, s.optString("id", ""))
            .putString(MediaMetadataCompat.METADATA_KEY_TITLE, s.optString("name", "Радио"))
            .putString(MediaMetadataCompat.METADATA_KEY_ARTIST, "YAi Radio")
            .putString(MediaMetadataCompat.METADATA_KEY_DISPLAY_SUBTITLE, s.optString("subtitle", ""))
            .putLong(MediaMetadataCompat.METADATA_KEY_DURATION, -1)
            .build());
        setState(PlaybackStateCompat.STATE_BUFFERING, null);
        try {
            mp = new MediaPlayer();
            mp.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build());
            mp.setDataSource(s.optString("url"));
            mp.setOnPreparedListener(p -> {
                p.start();
                setState(PlaybackStateCompat.STATE_PLAYING, null);
                showNotification(true);
            });
            mp.setOnErrorListener((p, what, extra) -> {
                setState(PlaybackStateCompat.STATE_ERROR, "Станция сейчас не отвечает — выберите другую");
                return true;
            });
            mp.prepareAsync();
        } catch (Exception e) {
            setState(PlaybackStateCompat.STATE_ERROR, "Станция сейчас не отвечает — выберите другую");
        }
    }

    private void setState(int state, @Nullable String error) {
        long actions = PlaybackStateCompat.ACTION_PLAY | PlaybackStateCompat.ACTION_PAUSE | PlaybackStateCompat.ACTION_PLAY_PAUSE
            | PlaybackStateCompat.ACTION_STOP | PlaybackStateCompat.ACTION_SKIP_TO_NEXT | PlaybackStateCompat.ACTION_SKIP_TO_PREVIOUS
            | PlaybackStateCompat.ACTION_PLAY_FROM_MEDIA_ID | PlaybackStateCompat.ACTION_PLAY_FROM_SEARCH;
        PlaybackStateCompat.Builder b = new PlaybackStateCompat.Builder().setActions(actions)
            .setState(state, PlaybackStateCompat.PLAYBACK_POSITION_UNKNOWN, 1f);
        if (error != null) b.setErrorMessage(PlaybackStateCompat.ERROR_CODE_APP_ERROR, error);
        session.setPlaybackState(b.build());
    }

    private void showNotification(boolean playing) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null && nm.getNotificationChannel(CH) == null) {
            nm.createNotificationChannel(new NotificationChannel(CH, "Android Auto", NotificationManager.IMPORTANCE_LOW));
        }
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        PendingIntent toggle = PendingIntent.getService(this, 7332, new Intent(this, AutoMediaService.class).setAction("toggle"), fl);
        String title = index >= 0 && index < queue.size() ? queue.get(index).optString("name", "YAi Radio") : "YAi Radio";
        Notification n = new NotificationCompat.Builder(this, CH)
            .setSmallIcon(android.R.drawable.ic_media_play)
            .setContentTitle(title)
            .setContentText("YAi Radio")
            .setOngoing(playing)
            .setContentIntent(session.getController().getSessionActivity())
            .addAction(playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, playing ? "Пауза" : "Играть", toggle)
            .setStyle(new androidx.media.app.NotificationCompat.MediaStyle().setMediaSession(session.getSessionToken()).setShowActionsInCompactView(0))
            .build();
        try {
            if (playing) {
                if (!foreground) ContextCompat.startForegroundService(this, new Intent(this, AutoMediaService.class));
                if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
                else startForeground(NOTIF_ID, n);
                foreground = true;
            } else {
                if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_DETACH);
                else stopForeground(false);
                foreground = false;
                if (nm != null) nm.notify(NOTIF_ID, n);
            }
        } catch (Exception ignored) {
            // Android не разрешил фоновый сервис — играем, пока Android Auto подключён
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "toggle".equals(intent.getAction())) {
            if (mp != null && mp.isPlaying()) session.getController().getTransportControls().pause();
            else session.getController().getTransportControls().play();
        }
        return START_NOT_STICKY;
    }

    private void releasePlayer() {
        if (mp != null) {
            try { mp.stop(); } catch (Exception ignored) {}
            try { mp.release(); } catch (Exception ignored) {}
            mp = null;
        }
    }

    private void stopAll() {
        releasePlayer();
        if (audio != null) {
            if (Build.VERSION.SDK_INT >= 26 && focusReq != null) audio.abandonAudioFocusRequest(focusReq);
            else audio.abandonAudioFocus(focusListener);
        }
        setState(PlaybackStateCompat.STATE_STOPPED, null);
        session.setActive(false);
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE);
        else stopForeground(true);
        foreground = false;
        stopSelf();
    }

    @Override
    public void onDestroy() {
        releasePlayer();
        session.release();
        super.onDestroy();
    }
}
