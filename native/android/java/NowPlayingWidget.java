package com.yaiplay.radio;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

/** Виджет на рабочий стол: логотип, станция, кнопка ▶/⏸. */
public class NowPlayingWidget extends AppWidgetProvider {
    static final String TOGGLE = "com.yaiplay.radio.WIDGET_TOGGLE";
    private static final int FLAGS = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

    @Override
    public void onUpdate(Context c, AppWidgetManager m, int[] ids) {
        for (int id : ids) m.updateAppWidget(id, views(c));
    }

    @Override
    public void onReceive(Context c, Intent i) {
        super.onReceive(c, i);
        if (TOGGLE.equals(i.getAction())) {
            if (YAiNativePlugin.instance != null) {
                YAiNativePlugin.emitRemote("toggle");
            } else {
                YAiNativePlugin.prefs(c).edit().putBoolean("np_playing", false).apply();
                updateAll(c);
            }
        }
    }

    static RemoteViews views(Context c) {
        SharedPreferences p = YAiNativePlugin.prefs(c);
        boolean playing = p.getBoolean("np_playing", false);
        boolean alive = YAiNativePlugin.instance != null;
        RemoteViews v = new RemoteViews(c.getPackageName(), R.layout.widget_now_playing);
        v.setTextViewText(R.id.w_title, p.getString("np_title", "YAiPlay Radio"));
        String sub = p.getString("np_subtitle", "");
        v.setTextViewText(R.id.w_sub, playing ? "● В эфире" + (sub.isEmpty() ? "" : " · " + sub) : (sub.isEmpty() ? "Нажмите ▶, чтобы слушать" : sub));
        v.setImageViewResource(R.id.w_btn, playing ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play);

        Intent open = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        v.setOnClickPendingIntent(R.id.w_root, PendingIntent.getActivity(c, 7310, open, FLAGS));

        PendingIntent btn;
        if (alive) {
            // приложение запущено — переключаем без открытия
            btn = PendingIntent.getBroadcast(c, 7311, new Intent(c, NowPlayingWidget.class).setAction(TOGGLE), FLAGS);
        } else {
            // приложение закрыто — открываем и сразу включаем последнюю станцию
            Intent play = new Intent(c, MainActivity.class).putExtra("YAi_action", "play")
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            btn = PendingIntent.getActivity(c, 7312, play, FLAGS);
        }
        v.setOnClickPendingIntent(R.id.w_btn, btn);
        return v;
    }

    static void updateAll(Context c) {
        AppWidgetManager m = AppWidgetManager.getInstance(c);
        int[] ids = m.getAppWidgetIds(new ComponentName(c, NowPlayingWidget.class));
        if (ids == null || ids.length == 0) return;
        RemoteViews v = views(c);
        for (int id : ids) m.updateAppWidget(id, v);
    }
}
