#!/bin/bash
# =====================================================
# سكربت بناء تطبيق محاسبة القات APK
# =====================================================

echo "🚀 بدء بناء تطبيق محاسبة القات..."

# 1. بناء التطبيق للويب
echo "📦 بناء التطبيق للويب..."
bun run build

# 2. نسخ الملفات الثابتة
echo "📋 نسخ الملفات الثابتة..."
mkdir -p out
cp -r .next/static out/_next
cp -r public/* out/

# 3. إضافة منصة أندرويد
echo "📱 إضافة منصة أندرويد..."
npx cap add android

# 4. مزامنة الملفات
echo "🔄 مزامنة الملفات..."
npx cap sync android

# 5. فتح Android Studio (اختياري)
echo "✅ تم الإعداد بنجاح!"
echo ""
echo "📋 الخطوات التالية:"
echo "1. افتح Android Studio"
echo "2. اختر 'Open an Existing Project'"
echo "3. اختر مجلد 'android' في المشروع"
echo "4. انتظر تحميل Gradle"
echo "5. اضغط Build > Build Bundle(s) / APK(s) > Build APK(s)"
echo ""
echo "📁 ملف APK سيكون في:"
echo "android/app/build/outputs/apk/debug/app-debug.apk"
