import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, MessageCircle, Send } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface ShareShipmentAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shipment: any;
  agentId: string | null;
}

export function ShareShipmentAgentDialog({
  open,
  onOpenChange,
  shipment,
  agentId,
}: ShareShipmentAgentDialogProps) {
  const [copied, setCopied] = useState(false);
  const [editedMessage, setEditedMessage] = useState<string | null>(null);

  const initialMessage = useMemo(() => {
    if (!shipment || !agentId) return '';

    // Filter items for this agent
    const agentItems = shipment.items.filter((item: any) => item.agentId === agentId || item.agent?.id === agentId);
    if (agentItems.length === 0) return '';

    const agentName = agentItems[0].agentName || agentItems[0].agent?.name;

    const dateStr = new Date(shipment.date).toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    let text = `📦 *كشف شحنة القات*\n`;
    text += `الوكيل: *${agentName}*\n`;
    text += `التاريخ: ${dateStr}\n\n`;

    let totalPieces = 0;
    const khatTypeTotals: Record<string, number> = {};

    agentItems.forEach((item: any) => {
      const farmerName = item.farmerAlias || item.farmerName || item.farmer?.name;
      text += `👤 *المزارع: ${farmerName}*\n`;

      item.khatDetails.forEach((detail: any) => {
        text += `- ${detail.khatTypeName}: ${detail.pieces} حبة\n`;
        totalPieces += detail.pieces;

        if (!khatTypeTotals[detail.khatTypeName]) {
          khatTypeTotals[detail.khatTypeName] = 0;
        }
        khatTypeTotals[detail.khatTypeName] += detail.pieces;
      });

      if (item.notes) {
        text += `  📝 ملاحظة: ${item.notes}\n`;
      }
      text += `\n`;
    });

    text += `📊 *الإجمالي:*\n`;
    Object.entries(khatTypeTotals).forEach(([type, count]) => {
      text += `▪️ ${type}: ${count} حبة\n`;
    });
    text += `*العدد الكلي: ${totalPieces} حبة*\n`;

    return text;
  }, [shipment, agentId]);

  const agentPhone = useMemo(() => {
    if (!shipment || !agentId) return null;
    const agentItems = shipment.items.filter((item: any) => item.agentId === agentId || item.agent?.id === agentId);
    if (agentItems.length === 0) return null;
    return agentItems[0].agent?.phone || null;
  }, [shipment, agentId]);

  const currentMessage = editedMessage !== null ? editedMessage : initialMessage;

  // Reset edited message when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => setEditedMessage(null), 0);
    }
  }, [open, shipment, agentId]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  const shareWhatsApp = () => {
    const encodedMessage = encodeURIComponent(currentMessage);
    const url = agentPhone
      ? `https://wa.me/${agentPhone.replace(/[^0-9]/g, '')}?text=${encodedMessage}`
      : `https://wa.me/?text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  const shareTelegram = () => {
    const encodedMessage = encodeURIComponent(currentMessage);
    const url = `https://t.me/share/url?url=&text=${encodedMessage}`;
    window.open(url, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>مشاركة مع الوكيل</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={currentMessage}
            onChange={(e) => setEditedMessage(e.target.value)}
            className="min-h-[300px] text-right font-mono"
            dir="rtl"
          />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4 me-2 text-green-500" /> : <Copy className="h-4 w-4 me-2" />}
            {copied ? 'تم النسخ' : 'نسخ النص'}
          </Button>

          <Button
            variant="outline"
            className="w-full sm:w-auto bg-[#229ED9] text-white hover:bg-[#229ED9]/90 hover:text-white"
            onClick={shareTelegram}
          >
            <Send className="h-4 w-4 me-2" />
            تليجرام
          </Button>

          <Button
            className="w-full sm:w-auto bg-[#25D366] text-white hover:bg-[#25D366]/90"
            onClick={shareWhatsApp}
          >
            <MessageCircle className="h-4 w-4 me-2" />
            واتساب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
