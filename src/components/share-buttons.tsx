'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Share2, Copy, Printer, MessageCircle, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonsProps {
  title: string;
  text: string;
  phone?: string; // رقم الوكيل للواتساب المباشر
  onPrint?: () => void;
}

export function ShareButtons({
  title,
  text,
  phone,
  onPrint,
}: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  // مشاركة عبر واتساب
  const handleWhatsAppShare = () => {
    const message = `${title}\n\n${text}`;
    const encodedMessage = encodeURIComponent(message);

    // إذا كان هناك رقم هاتف، نستخدم wa.me للرسالة المباشرة
    if (phone) {
      // إزالة أي أحرف غير رقمية من رقم الهاتف
      const cleanPhone = phone.replace(/\D/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
    } else {
      // مشاركة عامة عبر واتساب
      window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
    }
  };

  // نسخ النص للحافظة
  const handleCopy = async () => {
    try {
      const fullText = `${title}\n\n${text}`;
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      toast.success('تم نسخ النص بنجاح', {
        description: 'يمكنك لصقه الآن في أي مكان',
        duration: 2000,
      });

      // إعادة تعيين حالة النسخ بعد ثانيتين
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // fallback للمتصفحات القديمة
      const textArea = document.createElement('textarea');
      textArea.value = `${title}\n\n${text}`;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.select();

      try {
        document.execCommand('copy');
        setCopied(true);
        toast.success('تم نسخ النص بنجاح');
        setTimeout(() => setCopied(false), 2000);
      } catch {
        toast.error('فشل في نسخ النص');
      }

      document.body.removeChild(textArea);
    }
  };

  // مشاركة عامة باستخدام Web Share API
  const handleShare = async () => {
    // التحقق من دعم المتصفح لـ Web Share API
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          text: text,
        });
        toast.success('تمت المشاركة بنجاح');
      } catch (error) {
        // المستخدم ألغى المشاركة أو حدث خطأ
        if ((error as Error).name !== 'AbortError') {
          toast.error('فشل في المشاركة');
        }
      }
    } else {
      // المتصفح لا يدعم Web Share API - نستخدم النسخ كبديل
      handleCopy();
      toast.info('تم النسخ بدلاً من المشاركة', {
        description: 'متصفحك لا يدعم المشاركة المباشرة',
      });
    }
  };

  // طباعة
  const handlePrint = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* زر واتساب */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleWhatsAppShare}
            className="gap-2 text-green-600 border-green-200 hover:bg-green-50 hover:border-green-300 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
          >
            <MessageCircle className="h-4 w-4" />
            <span className="hidden sm:inline">واتساب</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {phone ? `مشاركة مباشرة مع ${phone}` : 'مشاركة عبر واتساب'}
        </TooltipContent>
      </Tooltip>

      {/* زر نسخ */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-2 text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300 dark:text-gray-400 dark:border-gray-700 dark:hover:bg-gray-800"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                <span className="hidden sm:inline">تم النسخ</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span className="hidden sm:inline">نسخ</span>
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {copied ? 'تم النسخ!' : 'نسخ النص للحافظة'}
        </TooltipContent>
      </Tooltip>

      {/* زر مشاركة عامة */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
            className="gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 hover:border-blue-300 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
          >
            <Share2 className="h-4 w-4" />
            <span className="hidden sm:inline">مشاركة</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {typeof navigator !== 'undefined' && navigator.share
            ? 'مشاركة عبر التطبيقات'
            : 'النسخ كبديل للمشاركة'}
        </TooltipContent>
      </Tooltip>

      {/* زر طباعة */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrint}
            className="gap-2 text-sky-600 border-sky-200 hover:bg-sky-50 hover:border-sky-300 dark:text-sky-400 dark:border-sky-800 dark:hover:bg-sky-950"
          >
            <Printer className="h-4 w-4" />
            <span className="hidden sm:inline">طباعة</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>طباعة التقرير</TooltipContent>
      </Tooltip>
    </div>
  );
}
