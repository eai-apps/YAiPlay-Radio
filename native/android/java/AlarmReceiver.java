package com.yaiplay.radio;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;
import org.json.JSONArray;
import org.json.JSONObject;

/** Срабатывание будильника + перепланирование после перезагрузки, обновления и смены времени. */
public class AlarmReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context c, Intent i) {
        if (AlarmScheduler.ACTION_FIRE.equals(i.getAction())) {
            JSONObject a = AlarmScheduler.load(c);
            if (a.optBoolean("enabled", false)) {
                Intent s = new Intent(c, AlarmService.class)
                    .putExtra("url", a.optString("url", ""))
                    .putExtra("name", a.optString("name", "YAiPlay Radio"))
                    .putExtra("fade", a.optInt("fadeSec", 20));
                try {
                    ContextCompat.startForegroundService(c, s);
                } catch (Exception ignored) {}
                JSONArray days = a.optJSONArray("days");
                if (days == null || days.length() == 0) {
                    try {
                        a.put("enabled", false); // одноразовый будильник
                        AlarmScheduler.save(c, a);
                    } catch (Exception ignored) {}
                }
            }
        }
        AlarmScheduler.schedule(c);
    }
}
