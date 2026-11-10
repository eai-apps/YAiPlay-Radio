package com.yaiplay.radio;

import android.Manifest;
import android.app.AlarmManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Мост между сайтом (JS) и Android: виджет, нативный будильник, данные для Android Auto. */
@CapacitorPlugin(name = "YAiNative")
public class YAiNativePlugin extends Plugin {
    static final String PREFS = "YAi_native";
    static volatile YAiNativePlugin instance;
    private String pendingAction;

    static SharedPreferences prefs(Context c) {
        return c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @Override
    public void load() {
        instance = this;
        if (getActivity() != null) stash(getActivity().getIntent());
        YAiPlayer.get(getContext()).setListener(new YAiPlayer.Listener() {
            @Override
            public void onState(String state, String message) {
                JSObject o = new JSObject();
                o.put("state", state);
                o.put("message", message);
                notifyListeners("player", o);
            }

            @Override
            public void onTitle(String title) {
                JSObject o = new JSObject();
                o.put("title", title);
                notifyListeners("playerTitle", o);
            }

            @Override
            public void onViz(float[] bars) {
                JSArray a = new JSArray();
                for (float b : bars) a.put((Object) Double.valueOf(Math.round(b * 100) / 100.0));
                JSObject o = new JSObject();
                o.put("b", a);
                notifyListeners("viz", o);
            }
        });
    }

    @Override
    protected void handleOnDestroy() {
        if (instance == this) instance = null;
        // Приложение закрыли — без интерфейса нативный плеер не оставляем играть
        YAiPlayer p = YAiPlayer.get(getContext());
        p.setListener(null);
        p.stop();
        YAiPlaybackService.stop(getContext());
        prefs(getContext()).edit().putBoolean("np_playing", false).apply();
        NowPlayingWidget.updateAll(getContext());
        super.handleOnDestroy();
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        super.handleOnNewIntent(intent);
        String a = stash(intent);
        if (a != null) {
            JSObject o = new JSObject();
            o.put("action", a);
            notifyListeners("launchAction", o, true);
            pendingAction = null;
        }
    }

    private String stash(Intent i) {
        if (i == null) return null;
        android.net.Uri data = i.getData();
        if (data != null && "YAi".equals(data.getScheme())) {
            String h = data.getQueryParameter("h");
            i.setData(null);
            if (h != null && !h.isEmpty()) {
                pendingAction = "open:" + h;
                return pendingAction;
            }
        }
        String a = i.getStringExtra("YAi_action");
        if (a != null) {
            pendingAction = a;
            i.removeExtra("YAi_action");
        }
        return a;
    }

    /** Сообщить сайту о нажатии кнопки (виджет и т. п.) */
    static void emitRemote(String action) {
        YAiNativePlugin p = instance;
        if (p == null) return;
        JSObject o = new JSObject();
        o.put("action", action);
        p.notifyListeners("remote", o);
    }

    @PluginMethod
    public void getLaunchAction(PluginCall call) {
        JSObject o = new JSObject();
        o.put("action", pendingAction);
        pendingAction = null;
        call.resolve(o);
    }

    @PluginMethod
    public void updateNowPlaying(PluginCall call) {
        Boolean playing = call.getBoolean("playing", false);
        prefs(getContext()).edit()
            .putString("np_title", call.getString("title", "YAiPlay Radio"))
            .putString("np_subtitle", call.getString("subtitle", ""))
            .putBoolean("np_playing", playing != null && playing)
            .apply();
        NowPlayingWidget.updateAll(getContext());
        call.resolve();
    }

    /** Избранное, недавние и Radio Record — для Android Auto */
    @PluginMethod
    public void saveLibrary(PluginCall call) {
        prefs(getContext()).edit().putString("library", call.getData().toString()).apply();
        call.resolve();
    }

    /** Будильник: {enabled, hour, minute, days:[0..6, 0=вс], url, name, fadeSec} */
    @PluginMethod
    public void setAlarm(PluginCall call) {
        Context c = getContext();
        prefs(c).edit().putString("alarm", call.getData().toString()).apply();
        boolean exact = AlarmScheduler.schedule(c);
        if (Build.VERSION.SDK_INT >= 33 && getActivity() != null
            && ContextCompat.checkSelfPermission(c, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(getActivity(), new String[] { Manifest.permission.POST_NOTIFICATIONS }, 7302);
        }
        JSObject o = new JSObject();
        o.put("exact", exact);
        o.put("next", AlarmScheduler.nextTime(c));
        call.resolve(o);
    }

    /** Системное окно «Поделиться» (Telegram, WhatsApp, сообщения…) */
    @PluginMethod
    public void share(PluginCall call) {
        Intent send = new Intent(Intent.ACTION_SEND);
        send.setType("text/plain");
        send.putExtra(Intent.EXTRA_SUBJECT, call.getString("title", "YAiPlay Radio"));
        send.putExtra(Intent.EXTRA_TEXT, call.getString("text", ""));
        Intent chooser = Intent.createChooser(send, "Поделиться");
        chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try {
            getContext().startActivity(chooser);
            call.resolve();
        } catch (Exception e) {
            call.reject("share failed");
        }
    }

    @PluginMethod
    public void stopAlarm(PluginCall call) {
        getContext().stopService(new Intent(getContext(), AlarmService.class));
        call.resolve();
    }

    /** Открыть системную настройку «Будильники и напоминания» (Android 12+), если точные будильники запрещены */
    @PluginMethod
    public void openExactAlarmSettings(PluginCall call) {
        if (Build.VERSION.SDK_INT >= 31) {
            AlarmManager am = (AlarmManager) getContext().getSystemService(Context.ALARM_SERVICE);
            if (am != null && !am.canScheduleExactAlarms()) {
                Intent i = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                i.setData(android.net.Uri.parse("package:" + getContext().getPackageName()));
                i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try {
                    getContext().startActivity(i);
                } catch (Exception ignored) {}
            }
        }
        call.resolve();
    }

    // ---------- Нативный плеер (Media3): звук, эквалайзер, визуализация, буфер ----------
    /** Есть ли в этом APK нативный плеер и какие полосы у эквалайзера */
    @PluginMethod
    public void playerInfo(PluginCall call) {
        JSArray f = new JSArray();
        for (float x : YAiDsp.FREQS) f.put((int) x);
        JSObject o = new JSObject();
        o.put("version", 2); // 2 — своя карточка в шторке и на экране блокировки (YAiPlaybackService)
        o.put("bands", f);
        call.resolve(o);
    }

    @PluginMethod
    public void playerLoad(PluginCall call) {
        YAiPlayer.get(getContext()).load(call.getString("url", ""));
        call.resolve();
    }

    @PluginMethod
    public void playerPlay(PluginCall call) {
        YAiPlayer.get(getContext()).play();
        call.resolve();
    }

    @PluginMethod
    public void playerPause(PluginCall call) {
        YAiPlayer.get(getContext()).pause();
        call.resolve();
    }

    @PluginMethod
    public void playerStop(PluginCall call) {
        YAiPlayer.get(getContext()).stop();
        call.resolve();
    }

    /** Карточка в шторке / на экране блокировки: {title, artist, artwork} */
    @PluginMethod
    public void playerMeta(PluginCall call) {
        YAiPlayer.get(getContext()).setMeta(call.getString("title", ""), call.getString("artist", ""), call.getString("artwork", ""));
        call.resolve();
    }

    @PluginMethod
    public void playerVolume(PluginCall call) {
        Double v = call.getDouble("volume", 1.0);
        YAiPlayer.get(getContext()).setVolume(v == null ? 1f : v.floatValue());
        call.resolve();
    }

    /** Громкость телефона (поток «Музыка») 0…1 — ползунок в приложении двигает её же, как боковые кнопки */
    @PluginMethod
    public void getSystemVolume(PluginCall call) {
        android.media.AudioManager am = (android.media.AudioManager) getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
        JSObject r = new JSObject();
        int max = am == null ? 0 : am.getStreamMaxVolume(android.media.AudioManager.STREAM_MUSIC);
        r.put("volume", max > 0 ? am.getStreamVolume(android.media.AudioManager.STREAM_MUSIC) / (double) max : 1.0);
        call.resolve(r);
    }

    @PluginMethod
    public void setSystemVolume(PluginCall call) {
        Double v = call.getDouble("volume", 1.0);
        android.media.AudioManager am = (android.media.AudioManager) getContext().getSystemService(android.content.Context.AUDIO_SERVICE);
        if (am != null && v != null) {
            int max = am.getStreamMaxVolume(android.media.AudioManager.STREAM_MUSIC);
            int idx = Math.round((float) (Math.max(0.0, Math.min(1.0, v)) * max));
            am.setStreamVolume(android.media.AudioManager.STREAM_MUSIC, idx, 0);
        }
        call.resolve();
    }

    /** {enabled, gains:[10 чисел, дБ −12…+12], bass: 0…12 дБ} */
    @PluginMethod
    public void playerEq(PluginCall call) {
        JSArray a = call.getArray("gains", new JSArray());
        float[] g = new float[YAiDsp.FREQS.length];
        for (int i = 0; i < g.length && i < a.length(); i++) g[i] = (float) a.optDouble(i, 0);
        Boolean en = call.getBoolean("enabled", false);
        Double bass = call.getDouble("bass", 0.0);
        YAiPlayer.get(getContext()).setEq(en != null && en, g, bass == null ? 0f : bass.floatValue());
        call.resolve();
    }

    @PluginMethod
    public void playerBuffer(PluginCall call) {
        Integer ms = call.getInt("ms", 2500);
        YAiPlayer.get(getContext()).setBuffer(ms == null ? 2500 : ms);
        call.resolve();
    }

    @PluginMethod
    public void playerViz(PluginCall call) {
        Boolean on = call.getBoolean("enabled", false);
        YAiPlayer.get(getContext()).setViz(on != null && on);
        call.resolve();
    }
}
