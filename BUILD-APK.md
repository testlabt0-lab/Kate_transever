# دليل تحويل تطبيق محاسبة القات إلى APK

## 📋 المتطلبات

### 1. تثبيت Java JDK
```bash
# Ubuntu/Debian
sudo apt install openjdk-17-jdk

# macOS
brew install openjdk@17

# Windows - تحميل من موقع Oracle
```

### 2. تثبيت Android SDK
- تحميل Android Studio من: https://developer.android.com/studio
- تثبيت Android SDK من داخل Android Studio
- إضافة متغيرات البيئة:
```bash
export ANDROID_HOME=$HOME/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

### 3. تثبيت Node.js و Bun
```bash
# تثبيت Bun
curl -fsSL https://bun.sh/install | bash
```

---

## 🚀 طرق التحويل

### الطريقة الأولى: Capacitor (الأفضل)

#### 1. تثبيت Capacitor
```bash
bun add @capacitor/core @capacitor/cli @capacitor/android
```

#### 2. إنشاء ملف capacitor.config.ts
```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.khat.accounting',
  appName: 'محاسبة القات',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#10b981',
    },
  },
};

export default config;
```

#### 3. تعديل next.config.ts
```typescript
const nextConfig: NextConfig = {
  output: 'export',  // تغيير من standalone إلى export
  // ... باقي الإعدادات
};
```

#### 4. بناء التطبيق
```bash
# بناء Next.js
bun run build

# إضافة منصة أندرويد
npx cap add android

# مزامنة الملفات
npx cap sync android

# فتح في Android Studio
npx cap open android
```

#### 5. إنشاء APK من Android Studio
1. افتح Android Studio
2. انتظر تحميل Gradle
3. اضغط **Build > Build Bundle(s) / APK(s) > Build APK(s)**
4. ملف APK سيكون في: `android/app/build/outputs/apk/debug/app-debug.apk`

---

### الطريقة الثانية: PWA Builder (الأسهل)

#### 1. بناء التطبيق
```bash
bun run build
```

#### 2. رفع الملفات
1. اذهب إلى: https://www.pwabuilder.com/
2. اضغط "Start"
3. أدخل رابط موقعك: `http://localhost:3000` (أو الرابط المنشور)
4. اضغط "Generate APK"
5. تحميل ملف APK

---

### الطريقة الثالثة: Bubblewrap (TWA)

#### 1. تثبيت Bubblewrap
```bash
npm install -g @anthropic/bubblewrap
```

#### 2. إنشاء مشروع
```bash
bubblewrap init --manifest="http://localhost:3000/manifest.json"
```

#### 3. بناء APK
```bash
bubblewrap build
```

---

## 📱 ملاحظات مهمة

### 1. الإعدادات المطلوبة للعمل Offline
- تأكد من وجود Service Worker
- تأكد من وجود manifest.json
- تأكد من وجود الأيقونات

### 2. توقيع التطبيق (للنشر)
```bash
# إنشاء مفتاح التوقيع
keytool -genkey -v -keystore khat-accounting.keystore \
  -alias khat-accounting \
  -keyalg RSA -keysize 2048 -validity 10000

# توقيع APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 \
  -keystore khat-accounting.keystore \
  app-release-unsigned.apk khat-accounting
```

### 3. النشر على Google Play
1. إنشاء حساب مطور على Google Play (رسوم $25)
2. رفع APK الموقّع
3. ملء معلومات التطبيق
4. إرسال للمراجعة

---

## 🔧 استكشاف الأخطاء

### مشكلة: Gradle لا يعمل
```bash
# تحديث Gradle
cd android
./gradlew --version
./gradlew clean
```

### مشكلة: Android SDK غير موجود
```bash
# التحقق من المسار
echo $ANDROID_HOME
ls $ANDROID_HOME
```

### مشكلة: الخطوط العربية لا تظهر
- تأكد من دعم الخطوط في Android
- استخدم خطوط Google Fonts

---

## 📂 هيكل الملفات

```
khat-accounting/
├── android/                 # مشروع Android
│   ├── app/
│   │   ├── src/main/
│   │   │   ├── assets/     # ملفات الويب
│   │   │   ├── res/        # موارد Android
│   │   │   └── AndroidManifest.xml
│   │   └── build.gradle
│   └── build.gradle
├── public/
│   ├── manifest.json
│   ├── sw.js
│   └── icons/
├── capacitor.config.ts
└── next.config.ts
```

---

## ✅ قائمة التحقق

- [ ] تثبيت Java JDK 17
- [ ] تثبيت Android Studio
- [ ] تثبيت Android SDK
- [ ] تثبيت Capacitor
- [ ] بناء التطبيق
- [ ] إضافة منصة Android
- [ ] مزامنة الملفات
- [ ] إنشاء APK
- [ ] اختبار على جهاز حقيقي
- [ ] توقيع التطبيق (للنشر)
