#!/bin/bash

# ========================================
# سكربت تشغيل المشروع على الشبكة المحلية
# ========================================

echo "🚀 بدء تشغيل نظام محاسبة تصدير القات..."
echo ""

# الحصول على عنوان IP المحلي
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
else
    # Linux
    LOCAL_IP=$(hostname -I | awk '{print $1}')
fi

if [ -z "$LOCAL_IP" ]; then
    echo "⚠️  لم يتم العثور على عنوان IP محلي"
    LOCAL_IP="localhost"
fi

echo "📡 عنوان IP المحلي: $LOCAL_IP"
echo ""
echo "📱 للوصول من هاتفك على شبكة الواي فاي:"
echo "   http://$LOCAL_IP:3000"
echo ""
echo "💡 نصائح:"
echo "   - تأكد أن الهاتف والكمبيوتر على نفس شبكة الواي فاي"
echo "   - يمكنك إضافة التطبيق للشاشة الرئيسية من متصفح الكروم"
echo "   - افتح Chrome > القائمة > 'إضافة إلى الشاشة الرئيسية'"
echo ""
echo "🔧 لتثبيت التطبيق كـ PWA على Android:"
echo "   1. افتح الرابط في Chrome"
echo "   2. اضغط على قائمة Chrome (3 نقاط)"
echo "   3. اختر 'تثبيت التطبيق' أو 'إضافة إلى الشاشة الرئيسية'"
echo ""
echo "----------------------------------------"
echo ""

# تشغيل Next.js مع الاستماع على جميع الواجهات
exec bun run dev -- -H 0.0.0.0
