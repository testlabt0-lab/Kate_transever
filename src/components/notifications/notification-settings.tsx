'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  Bell,
  MessageSquare,
  Phone,
  Volume2,
  Settings,
  Save,
  Loader2,
  Plus,
  Trash2,
  Edit,
  TestTube,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ==================== Types ====================

interface NotificationSettings {
  // إعدادات SMS
  smsEnabled: boolean;
  smsProvider: string;
  smsApiKey: string;
  smsSenderId: string;

  // إعدادات واتساب
  whatsappEnabled: boolean;
  whatsappBusinessId: string;
  whatsappApiKey: string;

  // إعدادات الصوت
  soundEnabled: boolean;
  reminderSound: string;
  timerSound: string;
  urgentSound: string;
  soundVolume: number;

  // إعدادات عامة
  inAppEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;

  // أرقام الهواتف للتنبيهات
  notificationPhones: NotificationPhone[];
}

interface NotificationPhone {
  id: string;
  name: string;
  phone: string;
  types: string[]; // sms, whatsapp
  isActive: boolean;
}

interface NotificationTemplate {
  id: string;
  name: string;
  title: string;
  body: string;
  type: string;
}

// ==================== Main Component ====================

export function NotificationSettings() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState<NotificationSettings>({
    smsEnabled: false,
    smsProvider: '',
    smsApiKey: '',
    smsSenderId: '',
    whatsappEnabled: false,
    whatsappBusinessId: '',
    whatsappApiKey: '',
    soundEnabled: true,
    reminderSound: 'default',
    timerSound: 'timer',
    urgentSound: 'urgent',
    soundVolume: 80,
    inAppEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '07:00',
    notificationPhones: [],
  });

  // Templates state
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);

  // Dialog state
  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [editingPhone, setEditingPhone] = useState<NotificationPhone | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  // Phone form
  const [phoneName, setPhoneName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneTypes, setPhoneTypes] = useState<string[]>(['sms']);

  // Template form
  const [templateName, setTemplateName] = useState('');
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateBody, setTemplateBody] = useState('');
  const [templateType, setTemplateType] = useState('sms');

  // Available sounds
  const availableSounds = [
    { id: 'default', name: 'الافتراضي' },
    { id: 'urgent', name: 'عاجل' },
    { id: 'timer', name: 'مؤقت' },
    { id: 'reminder', name: 'تذكير' },
    { id: 'success', name: 'نجاح' },
  ];

  // Load settings
  useEffect(() => {
    loadSettings();
    loadTemplates();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();

      if (data.settings) {
        setSettings(prev => ({
          ...prev,
          soundEnabled: data.settings.soundEnabled ?? true,
          reminderSoundEnabled: data.settings.reminderSoundEnabled ?? true,
          inAppEnabled: data.settings.notificationsEnabled ?? true,
          // يمكن إضافة المزيد من الإعدادات
        }));
      }

      // تحميل أرقام الهواتف من التخزين المحلي (يمكن نقلها لقاعدة البيانات)
      const savedPhones = localStorage.getItem('notification_phones');
      if (savedPhones) {
        setSettings(prev => ({
          ...prev,
          notificationPhones: JSON.parse(savedPhones),
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await fetch('/api/notification-templates');
      const data = await res.json();
      setTemplates(data.templates || []);
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      // حفظ الإعدادات في قاعدة البيانات
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          soundEnabled: settings.soundEnabled,
          notificationsEnabled: settings.inAppEnabled,
          reminderSoundEnabled: settings.soundEnabled,
        }),
      });

      // حفظ أرقام الهواتف محلياً
      localStorage.setItem('notification_phones', JSON.stringify(settings.notificationPhones));

      toast({
        title: 'تم الحفظ',
        description: 'تم حفظ إعدادات التنبيهات بنجاح',
      });
    } catch (error) {
      toast({
        title: 'خطأ',
        description: 'حدث خطأ في حفظ الإعدادات',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const testNotification = async (type: string) => {
    setTesting(type);
    try {
      const res = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: type === 'sound' ? 'sound' : 'in_app',
          title: 'اختبار الإشعار',
          message: 'هذا إشعار تجريبي للتأكد من عمل النظام',
          soundType: type === 'sound' ? 'default' : undefined,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({
          title: 'نجاح',
          description: 'تم إرسال الإشعار التجريبي بنجاح',
        });
      } else {
        throw new Error(data.message);
      }
    } catch (error: any) {
      toast({
        title: 'خطأ',
        description: error.message || 'فشل في إرسال الإشعار التجريبي',
        variant: 'destructive',
      });
    } finally {
      setTesting(null);
    }
  };

  // Phone handlers
  const handleAddPhone = () => {
    if (!phoneName || !phoneNumber) {
      toast({ title: 'خطأ', description: 'الاسم ورقم الهاتف مطلوبان', variant: 'destructive' });
      return;
    }

    const newPhone: NotificationPhone = {
      id: editingPhone?.id || Date.now().toString(),
      name: phoneName,
      phone: phoneNumber,
      types: phoneTypes,
      isActive: true,
    };

    setSettings(prev => ({
      ...prev,
      notificationPhones: editingPhone
        ? prev.notificationPhones.map(p => p.id === editingPhone.id ? newPhone : p)
        : [...prev.notificationPhones, newPhone],
    }));

    resetPhoneForm();
    setShowPhoneDialog(false);
    toast({ title: 'تم', description: editingPhone ? 'تم تحديث رقم الهاتف' : 'تم إضافة رقم الهاتف' });
  };

  const handleDeletePhone = (id: string) => {
    setSettings(prev => ({
      ...prev,
      notificationPhones: prev.notificationPhones.filter(p => p.id !== id),
    }));
    toast({ title: 'تم', description: 'تم حذف رقم الهاتف' });
  };

  const resetPhoneForm = () => {
    setPhoneName('');
    setPhoneNumber('');
    setPhoneTypes(['sms']);
    setEditingPhone(null);
  };

  // Template handlers
  const handleAddTemplate = async () => {
    if (!templateName || !templateTitle || !templateBody) {
      toast({ title: 'خطأ', description: 'جميع الحقول مطلوبة', variant: 'destructive' });
      return;
    }

    try {
      const res = await fetch('/api/notification-templates', {
        method: editingTemplate ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingTemplate?.id,
          name: templateName,
          title: templateTitle,
          body: templateBody,
          type: templateType,
        }),
      });

      const data = await res.json();

      if (data.success) {
        toast({ title: 'تم', description: editingTemplate ? 'تم تحديث القالب' : 'تم إنشاء القالب' });
        resetTemplateForm();
        setShowTemplateDialog(false);
        loadTemplates();
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message || 'حدث خطأ', variant: 'destructive' });
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا القالب؟')) return;

    try {
      const res = await fetch(`/api/notification-templates?id=${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (data.success) {
        toast({ title: 'تم', description: 'تم حذف القالب' });
        loadTemplates();
      }
    } catch {
      toast({ title: 'خطأ', description: 'حدث خطأ في الحذف', variant: 'destructive' });
    }
  };

  const resetTemplateForm = () => {
    setTemplateName('');
    setTemplateTitle('');
    setTemplateBody('');
    setTemplateType('sms');
    setEditingTemplate(null);
  };

  // Update setting helper
  const updateSetting = <K extends keyof NotificationSettings>(key: K, value: NotificationSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="h-5 w-5" />
            إعدادات التنبيهات
          </h2>
          <p className="text-sm text-muted-foreground">تخصيص إعدادات الإشعارات والتنبيهات</p>
        </div>
        <Button onClick={saveSettings} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span className="ms-2">حفظ الإعدادات</span>
        </Button>
      </div>

      {/* Notification Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* SMS Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              رسائل SMS
            </CardTitle>
            <CardDescription>إرسال رسائل نصية للهواتف</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>تفعيل SMS</Label>
              <Switch
                checked={settings.smsEnabled}
                onCheckedChange={(checked) => updateSetting('smsEnabled', checked)}
              />
            </div>

            {settings.smsEnabled && (
              <>
                <div className="space-y-2">
                  <Label>مزود الخدمة</Label>
                  <Select value={settings.smsProvider} onValueChange={(v) => updateSetting('smsProvider', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر المزود" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="sms_ae">SMS.ae</SelectItem>
                      <SelectItem value="yamamah">يمامة</SelectItem>
                      <SelectItem value="other">أخرى</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={settings.smsApiKey}
                    onChange={(e) => updateSetting('smsApiKey', e.target.value)}
                    placeholder="مفتاح API"
                  />
                </div>

                <div className="space-y-2">
                  <Label>اسم المرسل</Label>
                  <Input
                    value={settings.smsSenderId}
                    onChange={(e) => updateSetting('smsSenderId', e.target.value)}
                    placeholder="اسم المرسل"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testNotification('sms')}
                  disabled={testing === 'sms'}
                >
                  <TestTube className="h-4 w-4 me-2" />
                  اختبار
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Phone className="h-4 w-4 text-green-600" />
              واتساب
            </CardTitle>
            <CardDescription>إرسال رسائل واتساب</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>تفعيل واتساب</Label>
              <Switch
                checked={settings.whatsappEnabled}
                onCheckedChange={(checked) => updateSetting('whatsappEnabled', checked)}
              />
            </div>

            {settings.whatsappEnabled && (
              <>
                <div className="space-y-2">
                  <Label>WhatsApp Business ID</Label>
                  <Input
                    value={settings.whatsappBusinessId}
                    onChange={(e) => updateSetting('whatsappBusinessId', e.target.value)}
                    placeholder="معرف الأعمال"
                  />
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <Input
                    type="password"
                    value={settings.whatsappApiKey}
                    onChange={(e) => updateSetting('whatsappApiKey', e.target.value)}
                    placeholder="مفتاح API"
                  />
                </div>

                <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
                  سيتم إنشاء رابط واتساب جاهز للمشاركة عند إرسال الإشعارات
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sound Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Volume2 className="h-4 w-4 text-purple-600" />
              أصوات التنبيه
            </CardTitle>
            <CardDescription>تخصيص أصوات التنبيهات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>تفعيل الصوت</Label>
              <Switch
                checked={settings.soundEnabled}
                onCheckedChange={(checked) => updateSetting('soundEnabled', checked)}
              />
            </div>

            {settings.soundEnabled && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>صوت التذكيرات</Label>
                    <Select value={settings.reminderSound} onValueChange={(v) => updateSetting('reminderSound', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSounds.map(sound => (
                          <SelectItem key={sound.id} value={sound.id}>{sound.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>صوت المؤقتات</Label>
                    <Select value={settings.timerSound} onValueChange={(v) => updateSetting('timerSound', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSounds.map(sound => (
                          <SelectItem key={sound.id} value={sound.id}>{sound.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>مستوى الصوت: {settings.soundVolume}%</Label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.soundVolume}
                    onChange={(e) => updateSetting('soundVolume', parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => testNotification('sound')}
                  disabled={testing === 'sound'}
                >
                  <TestTube className="h-4 w-4 me-2" />
                  اختبار الصوت
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* In-App Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4 text-amber-600" />
              إشعارات التطبيق
            </CardTitle>
            <CardDescription>الإشعارات داخل التطبيق</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>تفعيل الإشعارات الداخلية</Label>
              <Switch
                checked={settings.inAppEnabled}
                onCheckedChange={(checked) => updateSetting('inAppEnabled', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>ساعات الهدوء</Label>
              <Switch
                checked={settings.quietHoursEnabled}
                onCheckedChange={(checked) => updateSetting('quietHoursEnabled', checked)}
              />
            </div>

            {settings.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>من</Label>
                  <Input
                    type="time"
                    value={settings.quietHoursStart}
                    onChange={(e) => updateSetting('quietHoursStart', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>إلى</Label>
                  <Input
                    type="time"
                    value={settings.quietHoursEnd}
                    onChange={(e) => updateSetting('quietHoursEnd', e.target.value)}
                  />
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => testNotification('in_app')}
              disabled={testing === 'in_app'}
            >
              <TestTube className="h-4 w-4 me-2" />
              اختبار الإشعار
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Phone Numbers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Phone className="h-4 w-4" />
                أرقام الهواتف للتنبيهات
              </CardTitle>
              <CardDescription>أرقام الهواتف التي ستستقبل التنبيهات</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                resetPhoneForm();
                setShowPhoneDialog(true);
              }}
            >
              <Plus className="h-4 w-4 me-2" />
              إضافة رقم
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {settings.notificationPhones.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              لم يتم إضافة أرقام هواتف بعد
            </div>
          ) : (
            <div className="space-y-2">
              {settings.notificationPhones.map(phone => (
                <div key={phone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-full">
                      <Phone className="h-4 w-4 text-gray-600" />
                    </div>
                    <div>
                      <p className="font-medium">{phone.name}</p>
                      <p className="text-sm text-muted-foreground">{phone.phone}</p>
                    </div>
                    <div className="flex gap-1">
                      {phone.types.map(type => (
                        <Badge key={type} variant="secondary" className="text-xs">
                          {type === 'sms' ? 'SMS' : 'واتساب'}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingPhone(phone);
                        setPhoneName(phone.name);
                        setPhoneNumber(phone.phone);
                        setPhoneTypes(phone.types);
                        setShowPhoneDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => handleDeletePhone(phone.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Notification Templates */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Settings className="h-4 w-4" />
                قوالب الإشعارات
              </CardTitle>
              <CardDescription>قوالب رسائل قابلة للتخصيص</CardDescription>
            </div>
            <Button
              size="sm"
              onClick={() => {
                resetTemplateForm();
                setShowTemplateDialog(true);
              }}
            >
              <Plus className="h-4 w-4 me-2" />
              إضافة قالب
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              لم يتم إنشاء قوالب بعد
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {templates.map(template => (
                <div key={template.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{template.name}</p>
                    <p className="text-sm text-muted-foreground">{template.title}</p>
                    <Badge variant="outline" className="mt-1">
                      {template.type === 'sms' ? 'SMS' :
                       template.type === 'whatsapp' ? 'واتساب' :
                       template.type === 'email' ? 'بريد' : 'إشعار'}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingTemplate(template);
                        setTemplateName(template.name);
                        setTemplateTitle(template.title);
                        setTemplateBody(template.body);
                        setTemplateType(template.type);
                        setShowTemplateDialog(true);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Phone Dialog */}
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPhone ? 'تعديل رقم الهاتف' : 'إضافة رقم هاتف جديد'}</DialogTitle>
            <DialogDescription>أضف رقماً لاستقبال التنبيهات</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>الاسم</Label>
              <Input
                value={phoneName}
                onChange={(e) => setPhoneName(e.target.value)}
                placeholder="مثال: مدير النظام"
              />
            </div>
            <div className="space-y-2">
              <Label>رقم الهاتف</Label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="777123456"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label>طرق الإرسال</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={phoneTypes.includes('sms')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPhoneTypes([...phoneTypes, 'sms']);
                      } else {
                        setPhoneTypes(phoneTypes.filter(t => t !== 'sms'));
                      }
                    }}
                    className="rounded"
                  />
                  SMS
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={phoneTypes.includes('whatsapp')}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setPhoneTypes([...phoneTypes, 'whatsapp']);
                      } else {
                        setPhoneTypes(phoneTypes.filter(t => t !== 'whatsapp'));
                      }
                    }}
                    className="rounded"
                  />
                  واتساب
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPhoneDialog(false)}>إلغاء</Button>
            <Button onClick={handleAddPhone}>{editingPhone ? 'تحديث' : 'إضافة'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Dialog */}
      <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'تعديل القالب' : 'إنشاء قالب جديد'}</DialogTitle>
            <DialogDescription>استخدم المتغيرات مثل {"{{name}}"} و {"{{date}}"}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>اسم القالب</Label>
              <Input
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="مثال: تذكير_تسليم"
              />
            </div>
            <div className="space-y-2">
              <Label>العنوان</Label>
              <Input
                value={templateTitle}
                onChange={(e) => setTemplateTitle(e.target.value)}
                placeholder="عنوان الإشعار"
              />
            </div>
            <div className="space-y-2">
              <Label>المحتوى</Label>
              <Textarea
                value={templateBody}
                onChange={(e) => setTemplateBody(e.target.value)}
                placeholder="مرحبا {{name}}، لديك تذكير..."
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label>النوع</Label>
              <Select value={templateType} onValueChange={setTemplateType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sms">SMS</SelectItem>
                  <SelectItem value="whatsapp">واتساب</SelectItem>
                  <SelectItem value="email">بريد إلكتروني</SelectItem>
                  <SelectItem value="push">إشعار داخلي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>إلغاء</Button>
            <Button onClick={handleAddTemplate}>{editingTemplate ? 'تحديث' : 'إنشاء'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
