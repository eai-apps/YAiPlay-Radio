package com.yaiplay.radio;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.Proxy;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import org.json.JSONObject;

/**
 * Запасной путь, когда Cloudflare заблокирован (Россия без VPN, владелец 17.11):
 * тот же запрос через наши ретрансляторы на серверах «Оператор», «Голландец», «Молдова».
 * У ретранслятора нет домена: доверяем ровно его сертификату (SHA-256), как плеер YAiPlayer (ApiRoutes).
 */
final class YAiRelay {
    private YAiRelay() {}

    static final String[][] RELAYS = {
        {"https://194.26.203.2:8443", "1311c85f3584b8627cf6434355338982486a5cf59cee06c8ebe0a5d243fdefe9"},
        {"https://130.49.185.16:8443", "771205b3c5f3f4ac42964970916926e5c20cff0c5d3fd2c44922351205213e40"},
        {"https://143.246.223.135:9443", "19c36be67ba4ee96d079c21987cff457668face6db5e803aee7c24376d5fa3b9"},
    };

    /** Хост сервиса → префикс на ретрансляторе (такой же список в Caddyfile ретранслятора). */
    static final Map<String, String> HOSTS = new LinkedHashMap<>();
    static {
        HOSTS.put("yaiplay-radio.pages.dev", "/radio-site");
        HOSTS.put("yaiplay-radio-api.yai-media-player.workers.dev", "/radio-api");
        HOSTS.put("de1.api.radio-browser.info", "/radio-rb");
    }

    static final class Answer {
        int status;
        String body;
        String contentType;
    }

    static Answer fetch(String url, String method, JSONObject headers, String body) throws Exception {
        URL u = new URL(url);
        String prefix = HOSTS.get(u.getHost());
        if (prefix == null) throw new IllegalArgumentException("host not relayed");
        String path = u.getFile(); // путь + ?запрос
        Exception last = null;
        for (String[] r : RELAYS) {
            try {
                return once(r[0] + prefix + path, r[1], method, headers, body);
            } catch (Exception e) {
                last = e;
            }
        }
        throw last != null ? last : new Exception("no relay");
    }

    private static Answer once(String target, String sha256, String method, JSONObject headers, String body) throws Exception {
        HttpsURLConnection c = (HttpsURLConnection) new URL(target).openConnection(Proxy.NO_PROXY);
        c.setSSLSocketFactory(pinned(sha256).getSocketFactory());
        c.setHostnameVerifier((h, s) -> true); // личность ретранслятора — закреплённый сертификат, а не имя
        c.setConnectTimeout(8000);
        c.setReadTimeout(20000);
        c.setRequestMethod(method == null ? "GET" : method);
        if (headers != null) {
            Iterator<String> it = headers.keys();
            while (it.hasNext()) {
                String k = it.next();
                c.setRequestProperty(k, headers.optString(k));
            }
        }
        try {
            if (body != null && !body.isEmpty()) {
                c.setDoOutput(true);
                try (OutputStream os = c.getOutputStream()) {
                    os.write(body.getBytes(StandardCharsets.UTF_8));
                }
            }
            Answer a = new Answer();
            a.status = c.getResponseCode();
            a.contentType = c.getContentType();
            InputStream in = a.status >= 400 ? c.getErrorStream() : c.getInputStream();
            a.body = in == null ? "" : read(in);
            return a;
        } finally {
            c.disconnect();
        }
    }

    private static String read(InputStream in) throws Exception {
        try (InputStream s = in; ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            byte[] buf = new byte[16384];
            int n;
            while ((n = s.read(buf)) > 0) out.write(buf, 0, n);
            return out.toString("UTF-8");
        }
    }

    private static SSLContext pinned(String sha256) throws Exception {
        X509TrustManager tm = new X509TrustManager() {
            @Override public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
            @Override public void checkClientTrusted(X509Certificate[] chain, String authType) throws CertificateException { throw new CertificateException(); }
            @Override public void checkServerTrusted(X509Certificate[] chain, String authType) throws CertificateException {
                if (chain == null || chain.length == 0) throw new CertificateException("no certificate");
                try {
                    byte[] d = MessageDigest.getInstance("SHA-256").digest(chain[0].getEncoded());
                    StringBuilder sb = new StringBuilder();
                    for (byte b : d) sb.append(String.format("%02x", b));
                    if (!sb.toString().equals(sha256)) throw new CertificateException("relay certificate mismatch");
                } catch (CertificateException e) {
                    throw e;
                } catch (Exception e) {
                    throw new CertificateException(e);
                }
            }
        };
        SSLContext ctx = SSLContext.getInstance("TLS");
        ctx.init(null, new TrustManager[] {tm}, null);
        return ctx;
    }
}
