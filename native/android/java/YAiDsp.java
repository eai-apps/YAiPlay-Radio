package com.yaiplay.radio;

import androidx.annotation.OptIn;
import androidx.media3.common.C;
import androidx.media3.common.util.UnstableApi;
import androidx.media3.common.audio.AudioProcessor;
import androidx.media3.common.audio.BaseAudioProcessor;
import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/**
 * Звуковой обработчик внутри плеера (Media3):
 *  — 10-полосный эквалайзер + усиление басов (фильтры biquad, формулы RBJ);
 *  — спектр для визуализации (БПФ 1024 точки, 32 полосы, ~30 раз в секунду).
 * Работает прямо со звуком плеера, поэтому микрофон и особые разрешения не нужны.
 */
@OptIn(markerClass = UnstableApi.class)
public class YAiDsp extends BaseAudioProcessor {
    public interface VizListener {
        void onBars(float[] bars);
    }

    static final float[] FREQS = { 31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000 };
    private static final int N = FREQS.length; // + 1 фильтр басов
    private static final int FFT = 1024;
    static final int BARS = 32;

    // Настройки (меняются из приложения в любой момент)
    volatile boolean eqEnabled = false;
    final float[] gains = new float[N];
    volatile float bassDb = 0f;
    volatile boolean dirty = true;
    volatile boolean vizEnabled = false;
    volatile VizListener vizListener;

    private int sampleRate = 44100;
    private int channels = 2;
    private int encoding = C.ENCODING_PCM_16BIT;
    private final double[][] coef = new double[N + 1][5];
    private double[][][] state = new double[N + 1][2][2];
    private double preGain = 1.0;
    private boolean wasEq = false;

    private final float[] ring = new float[FFT];
    private int ringPos = 0;
    private int sinceViz = 0;
    private final double[] re = new double[FFT];
    private final double[] im = new double[FFT];
    private final float[] bars = new float[BARS];

    @Override
    protected AudioFormat onConfigure(AudioFormat in) throws UnhandledAudioFormatException {
        if (in.encoding != C.ENCODING_PCM_16BIT && in.encoding != C.ENCODING_PCM_FLOAT) {
            throw new UnhandledAudioFormatException(in);
        }
        sampleRate = in.sampleRate;
        channels = in.channelCount;
        encoding = in.encoding;
        state = new double[N + 1][Math.max(1, channels)][2];
        dirty = true;
        return in;
    }

    @Override
    public void queueInput(ByteBuffer input) {
        int remaining = input.remaining();
        if (remaining == 0) return;
        input.order(ByteOrder.nativeOrder());
        if (dirty) recompute();
        boolean eq = eqEnabled;
        if (eq != wasEq) {
            resetState();
            wasEq = eq;
        }
        VizListener vl = vizListener;
        boolean viz = vizEnabled && vl != null;
        boolean f32 = encoding == C.ENCODING_PCM_FLOAT;
        int bytes = f32 ? 4 : 2;
        int frames = remaining / (bytes * channels);
        ByteBuffer out = replaceOutputBuffer(remaining);
        int vizEvery = Math.max(1, sampleRate / 30);

        for (int f = 0; f < frames; f++) {
            float mono = 0f;
            for (int c = 0; c < channels; c++) {
                double x = f32 ? input.getFloat() : input.getShort() / 32768.0;
                if (eq) {
                    x *= preGain;
                    for (int b = 0; b <= N; b++) {
                        double[] k = coef[b];
                        double[] s = state[b][c];
                        double y = k[0] * x + s[0];
                        s[0] = k[1] * x - k[3] * y + s[1];
                        s[1] = k[2] * x - k[4] * y;
                        x = y;
                    }
                    if (x > 1.0) x = 1.0;
                    else if (x < -1.0) x = -1.0;
                }
                if (f32) out.putFloat((float) x);
                else out.putShort((short) Math.max(-32768, Math.min(32767, Math.round(x * 32767.0))));
                mono += (float) x;
            }
            if (viz) {
                ring[ringPos] = mono / channels;
                ringPos = (ringPos + 1) & (FFT - 1);
                if (++sinceViz >= vizEvery) {
                    sinceViz = 0;
                    vl.onBars(spectrum());
                }
            }
        }
        while (input.hasRemaining()) out.put(input.get()); // хвост неполного кадра (на всякий случай)
        out.flip();
    }

    @Override
    protected void onFlush() {
        resetState();
    }

    @Override
    protected void onReset() {
        resetState();
    }

    private void resetState() {
        for (double[][] a : state) for (double[] s : a) { s[0] = 0; s[1] = 0; }
    }

    /** Пересчёт фильтров после изменения настроек */
    private void recompute() {
        dirty = false;
        double maxBoost = Math.max(0, bassDb);
        for (int i = 0; i < N; i++) {
            peaking(coef[i], FREQS[i], gains[i], 1.41);
            maxBoost = Math.max(maxBoost, gains[i]);
        }
        lowShelf(coef[N], 80, bassDb);
        // Запас по громкости, чтобы усиление не «хрипело»
        preGain = Math.pow(10, -maxBoost * 0.8 / 20.0);
    }

    private void identity(double[] k) {
        k[0] = 1; k[1] = 0; k[2] = 0; k[3] = 0; k[4] = 0;
    }

    private void peaking(double[] k, double f, double gainDb, double q) {
        if (Math.abs(gainDb) < 0.05 || f >= sampleRate * 0.45) { identity(k); return; }
        double a = Math.pow(10, gainDb / 40.0);
        double w = 2 * Math.PI * f / sampleRate;
        double cos = Math.cos(w), alpha = Math.sin(w) / (2 * q);
        double a0 = 1 + alpha / a;
        k[0] = (1 + alpha * a) / a0;
        k[1] = (-2 * cos) / a0;
        k[2] = (1 - alpha * a) / a0;
        k[3] = (-2 * cos) / a0;
        k[4] = (1 - alpha / a) / a0;
    }

    private void lowShelf(double[] k, double f, double gainDb) {
        if (Math.abs(gainDb) < 0.05) { identity(k); return; }
        double a = Math.pow(10, gainDb / 40.0);
        double w = 2 * Math.PI * f / sampleRate;
        double cos = Math.cos(w), sin = Math.sin(w);
        double alpha = sin / 2 * Math.sqrt(2); // S = 1
        double sq = 2 * Math.sqrt(a) * alpha;
        double a0 = (a + 1) + (a - 1) * cos + sq;
        k[0] = a * ((a + 1) - (a - 1) * cos + sq) / a0;
        k[1] = 2 * a * ((a - 1) - (a + 1) * cos) / a0;
        k[2] = a * ((a + 1) - (a - 1) * cos - sq) / a0;
        k[3] = -2 * ((a - 1) + (a + 1) * cos) / a0;
        k[4] = ((a + 1) + (a - 1) * cos - sq) / a0;
    }

    /** БПФ последних 1024 сэмплов → 32 полосы (логарифмически 40 Гц … 16 кГц), значения 0…1 */
    private float[] spectrum() {
        for (int i = 0; i < FFT; i++) {
            double w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (FFT - 1)); // окно Ханна
            re[i] = ring[(ringPos + i) & (FFT - 1)] * w;
            im[i] = 0;
        }
        fft(re, im);
        double binHz = (double) sampleRate / FFT;
        double lo = Math.log(40), hi = Math.log(Math.min(16000, sampleRate / 2.0 - binHz));
        for (int b = 0; b < BARS; b++) {
            int from = (int) Math.max(1, Math.floor(Math.exp(lo + (hi - lo) * b / BARS) / binHz));
            int to = (int) Math.max(from + 1, Math.ceil(Math.exp(lo + (hi - lo) * (b + 1) / BARS) / binHz));
            double peak = 0;
            for (int i = from; i < to && i < FFT / 2; i++) peak = Math.max(peak, Math.hypot(re[i], im[i]));
            double db = 20 * Math.log10(peak / (FFT / 4.0) + 1e-9); // примерно −90…0 дБ
            bars[b] = (float) Math.max(0, Math.min(1, (db + 60) / 60));
        }
        return bars.clone();
    }

    private static void fft(double[] re, double[] im) {
        int n = re.length;
        for (int i = 1, j = 0; i < n; i++) {
            int bit = n >> 1;
            for (; (j & bit) != 0; bit >>= 1) j ^= bit;
            j ^= bit;
            if (i < j) {
                double t = re[i]; re[i] = re[j]; re[j] = t;
                t = im[i]; im[i] = im[j]; im[j] = t;
            }
        }
        for (int len = 2; len <= n; len <<= 1) {
            double ang = -2 * Math.PI / len;
            double wr = Math.cos(ang), wi = Math.sin(ang);
            for (int i = 0; i < n; i += len) {
                double cr = 1, ci = 0;
                for (int k = 0; k < len / 2; k++) {
                    int a = i + k, b = i + k + len / 2;
                    double xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
                    re[b] = re[a] - xr; im[b] = im[a] - xi;
                    re[a] += xr; im[a] += xi;
                    double t = cr * wr - ci * wi;
                    ci = cr * wi + ci * wr;
                    cr = t;
                }
            }
        }
    }
}
