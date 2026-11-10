"""Добавляет в Android-проект свои нативные части: виджет, будильник, Android Auto (папка native/android)."""
import pathlib, re, shutil
root = pathlib.Path(__file__).resolve().parent.parent
src = root / 'native/android'
app = root / 'android/app'
pkg = app / 'src/main/java/com/yaiplay/radio'
pkg.mkdir(parents=True, exist_ok=True)
for f in (src / 'java').glob('*.java'):
    shutil.copy(f, pkg / f.name)
res = app / 'src/main/res'
for f in (src / 'res').rglob('*'):
    if f.is_file():
        d = res / f.relative_to(src / 'res')
        d.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(f, d)

man = app / 'src/main/AndroidManifest.xml'
s = man.read_text()
for perm in ['android.permission.RECEIVE_BOOT_COMPLETED', 'android.permission.USE_EXACT_ALARM']:
    if perm not in s:
        s = s.replace('<application', f'<uses-permission android:name="{perm}" />\n    <application', 1)
if 'SCHEDULE_EXACT_ALARM' not in s:
    s = s.replace('<application', '<uses-permission android:name="android.permission.SCHEDULE_EXACT_ALARM" android:maxSdkVersion="32" />\n    <application', 1)
block = '''
        <!-- Виджет на рабочий стол -->
        <receiver android:name=".NowPlayingWidget" android:exported="true" android:label="YAiPlay Radio">
            <intent-filter>
                <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
            </intent-filter>
            <meta-data android:name="android.appwidget.provider" android:resource="@xml/widget_now_playing_info" />
        </receiver>

        <!-- Радио-будильник -->
        <receiver android:name=".AlarmReceiver" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.BOOT_COMPLETED" />
                <action android:name="android.intent.action.MY_PACKAGE_REPLACED" />
                <action android:name="android.intent.action.TIME_SET" />
                <action android:name="android.intent.action.TIMEZONE_CHANGED" />
            </intent-filter>
        </receiver>
        <service android:name=".AlarmService" android:exported="false" android:foregroundServiceType="mediaPlayback" />

        <!-- Android Auto -->
        <service android:name=".AutoMediaService" android:exported="true" android:foregroundServiceType="mediaPlayback">
            <intent-filter>
                <action android:name="android.media.browse.MediaBrowserService" />
            </intent-filter>
        </service>
        <meta-data android:name="com.google.android.gms.car.application" android:resource="@xml/automotive_app_desc" />
'''
if 'NowPlayingWidget' not in s:
    s = s.replace('</application>', block + '    </application>', 1)
# Карточка плеера в шторке и на экране блокировки (Media3 MediaSessionService)
for perm in ['android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK']:
    if f'"{perm}"' not in s:
        s = s.replace('<application', f'<uses-permission android:name="{perm}" />\n    <application', 1)
if 'YAiPlaybackService' not in s:
    s = s.replace('</application>', '''
        <!-- Шторка, экран блокировки, наушники, Bluetooth -->
        <service android:name=".YAiPlaybackService" android:exported="true" android:foregroundServiceType="mediaPlayback">
            <intent-filter>
                <action android:name="androidx.media3.session.MediaSessionService" />
            </intent-filter>
        </service>
    </application>''', 1)
# Ссылки yaiplayradio://open — «Открыть в приложении» из браузера
if 'android:scheme="yaiplayradio"' not in s:
    s = re.sub(r'(<activity[^>]*MainActivity[\s\S]*?</intent-filter>)', r'''\1
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="yaiplayradio" android:host="open" />
            </intent-filter>''', s, count=1)
# Нативный плеер может играть и http-станции (их много), WebView по-прежнему только https
if 'usesCleartextTraffic' not in s:
    s = s.replace('<application', '<application\n        android:usesCleartextTraffic="true"', 1)
man.write_text(s)

g = app / 'build.gradle'
gs = g.read_text()
if 'androidx.media:media' not in gs:
    gs = re.sub(r'(dependencies\s*\{)', r'\1\n    implementation "androidx.media:media:1.7.0"', gs, count=1)
# Нативный плеер радио (Media3/ExoPlayer): эквалайзер, визуализация, буфер, HLS
if 'media3-exoplayer' not in gs:
    gs = re.sub(r'(dependencies\s*\{)', r'\1\n    implementation "androidx.media3:media3-exoplayer:1.5.1"\n    implementation "androidx.media3:media3-exoplayer-hls:1.5.1"', gs, count=1)
if 'media3-session' not in gs:
    gs = re.sub(r'(dependencies\s*\{)', r'\1\n    implementation "androidx.media3:media3-session:1.5.1"', gs, count=1)
g.write_text(gs)
print('Нативные части добавлены: виджет, будильник, Android Auto, карточка плеера')
