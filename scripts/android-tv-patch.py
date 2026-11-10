"""Делает один APK пригодным и для телефона, и для Android TV (иконка-баннер в меню ТВ, управление пультом)."""
import re, shutil, pathlib, sys
root = pathlib.Path(__file__).resolve().parent.parent
man = root / 'android/app/src/main/AndroidManifest.xml'
s = man.read_text()
# Фоновое воспроизведение (Android 14+ требует отдельное разрешение для медиа-сервиса)
for perm in ['android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK', 'android.permission.WAKE_LOCK', 'android.permission.POST_NOTIFICATIONS']:
    if perm not in s:
        s = s.replace('<application', f'<uses-permission android:name="{perm}" />\n    <application', 1)
if 'android.software.leanback' not in s:
    s = s.replace('<application', '<uses-feature android:name="android.software.leanback" android:required="false" />\n'
                  '    <uses-feature android:name="android.hardware.touchscreen" android:required="false" />\n\n    <application', 1)
if 'android:banner' not in s:
    s = s.replace('<application', '<application\n        android:banner="@drawable/tv_banner"', 1)
if 'LEANBACK_LAUNCHER' not in s:
    s = re.sub(r'(<category android:name="android.intent.category.LAUNCHER"\s*/>)',
               r'\1\n                <category android:name="android.intent.category.LEANBACK_LAUNCHER" />', s, count=1)
man.write_text(s)
dst = root / 'android/app/src/main/res/drawable'
dst.mkdir(parents=True, exist_ok=True)
shutil.copy(root / 'assets/tv-banner.png', dst / 'tv_banner.png')
# Номер версии приложения = номер сборки (приложение сравнивает его с последним APK)
n = int(sys.argv[1]) if len(sys.argv) > 1 and sys.argv[1].isdigit() else 1
g = root / 'android/app/build.gradle'
gs = g.read_text()
gs = re.sub(r'versionCode \d+', f'versionCode {n}', gs)
gs = re.sub(r'versionName "[^"]*"', f'versionName "1.0.{n}"', gs)
# Постоянный ключ подписи (из секретов GitHub) → обновления ставятся поверх
import os
if os.environ.get('YAi_KEYSTORE') and 'signingConfigs' not in gs:
    gs = gs.replace('android {', '''android {
    signingConfigs {
        release {
            storeFile file(System.getenv("YAi_KEYSTORE"))
            storePassword System.getenv("YAi_KEYSTORE_PASSWORD")
            keyAlias System.getenv("YAi_KEY_ALIAS")
            keyPassword System.getenv("YAi_KEYSTORE_PASSWORD")
        }
    }''', 1)
    gs = re.sub(r'(buildTypes\s*\{\s*release\s*\{)', r'\1\n            signingConfig signingConfigs.release', gs, count=1)
    print('Подпись: постоянный ключ YAi')
g.write_text(gs)
print('Android TV: манифест обновлён, версия 1.0.%d' % n)
