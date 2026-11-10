package com.yaiplay.radio;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import java.util.Calendar;
import java.util.HashSet;
import java.util.Set;
import org.json.JSONArray;
import org.json.JSONObject;

/** Планирование радио-будильника через системный AlarmManager (работает при закрытом приложении). */
public class AlarmScheduler {
    static final String ACTION_FIRE = "com.yaiplay.radio.ALARM_FIRE";
    private static final int REQ = 7301;
    private static final int FLAGS = PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;

    static JSONObject load(Context c) {
        try {
            return new JSONObject(YAiNativePlugin.prefs(c).getString("alarm", "{}"));
        } catch (Exception e) {
            return new JSONObject();
        }
    }

    static void save(Context c, JSONObject a) {
        YAiNativePlugin.prefs(c).edit().putString("alarm", a.toString()).apply();
    }

    private static PendingIntent firePi(Context c) {
        Intent i = new Intent(c, AlarmReceiver.class).setAction(ACTION_FIRE);
        return PendingIntent.getBroadcast(c, REQ, i, FLAGS);
    }

    /** @return true — точный будильник; false — выключен или Android разрешил только приблизительный */
    static boolean schedule(Context c) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return false;
        am.cancel(firePi(c));
        JSONObject a = load(c);
        if (!a.optBoolean("enabled", false) || a.optString("url", "").isEmpty()) return false;
        long at = next(a);
        if (at <= 0) return false;
        if (Build.VERSION.SDK_INT >= 31 && !am.canScheduleExactAlarms()) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, firePi(c));
            return false;
        }
        Intent show = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        PendingIntent showPi = PendingIntent.getActivity(c, REQ + 1, show, FLAGS);
        am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, showPi), firePi(c));
        return true;
    }

    static long nextTime(Context c) {
        JSONObject a = load(c);
        return a.optBoolean("enabled", false) ? next(a) : -1;
    }

    /** Ближайшее время срабатывания. days: 0=вс … 6=сб; пусто — один раз. */
    static long next(JSONObject a) {
        int h = a.optInt("hour", 7);
        int m = a.optInt("minute", 30);
        Set<Integer> days = new HashSet<>();
        JSONArray d = a.optJSONArray("days");
        if (d != null) for (int i = 0; i < d.length(); i++) days.add(d.optInt(i));
        Calendar cal = Calendar.getInstance();
        cal.set(Calendar.HOUR_OF_DAY, h);
        cal.set(Calendar.MINUTE, m);
        cal.set(Calendar.SECOND, 0);
        cal.set(Calendar.MILLISECOND, 0);
        long now = System.currentTimeMillis();
        for (int k = 0; k < 8; k++) {
            int dow = cal.get(Calendar.DAY_OF_WEEK) - 1; // Calendar: 1=вс → 0
            if (cal.getTimeInMillis() > now && (days.isEmpty() || days.contains(dow))) return cal.getTimeInMillis();
            cal.add(Calendar.DAY_OF_MONTH, 1);
        }
        return -1;
    }
}
