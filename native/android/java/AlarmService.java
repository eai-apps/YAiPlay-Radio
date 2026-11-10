package com.yaiplay.radio;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import androidx.core.app.NotificationCompat;

/** Играет станцию будильника при закрытом приложении: плавное нарастание громкости, кнопка «Стоп». */
public class AlarmService extends Service {
    private static final String CH = "YAi_alarm";
    private static final int NOTIF_ID = 7320;
    private final Handler h = new Handler(Looper.getMainLooper());
    private MediaPlayer mp;
    private Ringtone fallback;
    private PowerManager.WakeLock wl;
    private float vol = 0.05f;
    private boolean started;

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "stop".equals(intent.getAction())) {
            stopSelf();
            return START_NOT_STICKY;
        }
        String url = intent != null ? intent.getStringExtra("url") : null;
        String name = intent != null ? intent.getStringExtra("name") : null;
        int fade = intent != null ? intent.getIntExtra("fade", 20) : 20;
        if (name == null || name.isEmpty()) name = "YAiPlay Radio";

        Notification n = buildNotification(name);
        if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(NOTIF_ID, n);

        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "YAi:alarm");
            wl.acquire(31 * 60 * 1000L);
        } catch (Exception ignored) {}

        play(url, Math.max(5, fade));
        h.postDelayed(() -> { if (!started) playFallback(); }, 20000); // станция не ответила за 20 с — обычный сигнал
        h.postDelayed(this::stopSelf, 30 * 60 * 1000L); // через 30 минут выключаемся сами
        return START_NOT_STICKY;
    }

    private void play(String url, int fadeSec) {
        release();
        if (url == null || url.isEmpty()) {
            playFallback();
            return;
        }
        try {
            mp = new MediaPlayer();
            mp.setAudioAttributes(new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ALARM)
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .build());
            mp.setDataSource(url);
            mp.setVolume(vol, vol);
            mp.setOnPreparedListener(p -> {
                started = true;
                p.start();
                final int steps = fadeSec * 2;
                for (int k = 1; k <= steps; k++) {
                    final float v = 0.05f + 0.95f * k / steps;
                    h.postDelayed(() -> { if (mp != null) { vol = v; mp.setVolume(v, v); } }, k * 500L);
                }
            });
            mp.setOnErrorListener((p, what, extra) -> {
                playFallback();
                return true;
            });
            mp.prepareAsync();
        } catch (Exception e) {
            playFallback();
        }
    }

    private void playFallback() {
        if (fallback != null && fallback.isPlaying()) return;
        started = true;
        release();
        try {
            Uri u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (u == null) u = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
            fallback = RingtoneManager.getRingtone(this, u);
            if (fallback != null) {
                fallback.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).build());
                fallback.play();
            }
        } catch (Exception ignored) {}
    }

    private Notification buildNotification(String name) {
        NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= 26 && nm != null && nm.getNotificationChannel(CH) == null) {
            NotificationChannel ch = new NotificationChannel(CH, "Будильник", NotificationManager.IMPORTANCE_HIGH);
            ch.setSound(null, null);
            nm.createNotificationChannel(ch);
        }
        int fl = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
        Intent open = new Intent(this, MainActivity.class).putExtra("YAi_action", "alarm")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent openPi = PendingIntent.getActivity(this, 7321, open, fl);
        PendingIntent stopPi = PendingIntent.getService(this, 7322, new Intent(this, AlarmService.class).setAction("stop"), fl);
        return new NotificationCompat.Builder(this, CH)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("⏰ Доброе утро! Будильник YAi")
            .setContentText(name)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setOngoing(true)
            .setContentIntent(openPi)
            .addAction(android.R.drawable.ic_media_pause, "Стоп", stopPi)
            .addAction(android.R.drawable.ic_media_play, "Открыть", openPi)
            .build();
    }

    private void release() {
        if (mp != null) {
            try { mp.stop(); } catch (Exception ignored) {}
            try { mp.release(); } catch (Exception ignored) {}
            mp = null;
        }
    }

    @Override
    public void onDestroy() {
        h.removeCallbacksAndMessages(null);
        release();
        if (fallback != null) {
            try { fallback.stop(); } catch (Exception ignored) {}
            fallback = null;
        }
        if (wl != null && wl.isHeld()) {
            try { wl.release(); } catch (Exception ignored) {}
        }
        if (Build.VERSION.SDK_INT >= 24) stopForeground(STOP_FOREGROUND_REMOVE);
        else stopForeground(true);
        super.onDestroy();
    }
}
