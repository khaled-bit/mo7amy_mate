import { useState } from "react";
import Layout from "@/components/layout";
import Header from "@/components/header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { User, Bell, Shield, Settings, Mail, Phone, AlertTriangle, Lock } from "lucide-react";

export default function SettingsPage() {
  const [tab, setTab] = useState("profile");
  // Dummy data for demonstration
  const user = { name: "أحمد محمد", username: "ahmed", email: "ahmed@email.com", phone: "01000000000", role: "admin", createdAt: "2024-01-01" };
  const [notifications, setNotifications] = useState({
    email: true,
    sms: false,
    newCase: true,
    sessionReminder: true,
    document: true,
    invoice: true,
  });
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [systemSettings, setSystemSettings] = useState({
    timezone: "Africa/Cairo",
    dateFormat: "DD/MM/YYYY",
    currency: "EGP",
    autoBackup: true,
    systemTime: "12:00",
  });

  function formatDualDate(dateStr: string) {
    const date = new Date(dateStr);
    const gregorian = date.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const hijri = date.toLocaleDateString('ar-SA-u-ca-islamic', { year: 'numeric', month: 'numeric', day: 'numeric' });
    return `${gregorian.replace(/-/g, '/')} (${hijri} هـ)`;
  }

  return (
    <div dir="rtl" className="text-right">
    <Layout>
      <Header title="الإعدادات" subtitle="إدارة إعدادات النظام والملف الشخصي" />
        <div className="max-w-3xl mx-auto mt-8">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid grid-cols-4 bg-gray-100 rounded-lg mb-8">
              <TabsTrigger value="profile" className="text-base font-bold">الملف الشخصي</TabsTrigger>
              <TabsTrigger value="notifications" className="text-base font-bold">الإشعارات</TabsTrigger>
              <TabsTrigger value="security" className="text-base font-bold">الأمان</TabsTrigger>
              <TabsTrigger value="system" className="text-base font-bold">النظام</TabsTrigger>
          </TabsList>

            {/* الملف الشخصي */}
          <TabsContent value="profile">
              <Card className="mb-8">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 justify-end"><User className="w-5 h-5" />معلومات الحساب</CardTitle>
              </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <Label>الاسم الكامل</Label>
                      <Input value={user.name} className="text-right" readOnly />
                    </div>
                    <div>
                        <Label>اسم المستخدم</Label>
                      <Input value={user.username} className="text-right" readOnly />
                    </div>
                    <div>
                      <Label>البريد الإلكتروني</Label>
                      <Input value={user.email} className="text-right" readOnly />
                    </div>
                    <div>
                      <Label>رقم الهاتف</Label>
                      <Input value={user.phone} className="text-right" readOnly />
                      </div>
                    <div>
                        <Label>الدور</Label>
                      <Input value={user.role === 'admin' ? 'مدير' : user.role === 'lawyer' ? 'محامي' : 'مساعد'} className="text-right" readOnly />
                        </div>
                    <div>
                        <Label>تاريخ الانضمام</Label>
                      <Input value={formatDualDate(user.createdAt)} className="text-right" readOnly />
                    </div>
                  </div>
                    <Separator />
                  <div className="space-y-2">
                    <Label>تغيير كلمة المرور</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <Input type="password" placeholder="كلمة المرور الحالية" className="text-right" />
                      <Input type="password" placeholder="كلمة المرور الجديدة" className="text-right" />
                      <Input type="password" placeholder="تأكيد كلمة المرور" className="text-right" />
                    </div>
                    <Button className="mt-4">حفظ التغييرات</Button>
                  </div>
              </CardContent>
            </Card>
          </TabsContent>

            {/* الإشعارات */}
          <TabsContent value="notifications">
              <Card className="mb-8">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2 justify-end"><Bell className="w-5 h-5" />إعدادات الإشعارات</CardTitle>
              </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-6">
                  <h3 className="text-lg font-semibold">طرق الإشعار</h3>
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 items-center">
                        <div>
                          <Label>إشعارات البريد الإلكتروني</Label>
                          <p className="text-sm text-muted-foreground">تلقي الإشعارات عبر البريد الإلكتروني</p>
                        </div>
                        <div className="flex justify-end">
                          <Switch checked={notifications.email} onCheckedChange={v => setNotifications(n => ({ ...n, email: v }))} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 items-center">
                        <div>
                          <Label>إشعارات الرسائل النصية</Label>
                          <p className="text-sm text-muted-foreground">تلقي الإشعارات عبر الرسائل النصية</p>
                        </div>
                        <div className="flex justify-end">
                          <Switch checked={notifications.sms} onCheckedChange={v => setNotifications(n => ({ ...n, sms: v }))} />
                        </div>
                      </div>
                    </div>
                  </div>
                <Separator />
                  <div className="space-y-6">
                  <h3 className="text-lg font-semibold">أنواع الإشعارات</h3>
                  <div className="space-y-4">
                      <div className="grid grid-cols-2 items-center">
                      <div>
                        <Label>القضايا الجديدة</Label>
                        <p className="text-sm text-muted-foreground">إشعار عند إضافة قضية جديدة</p>
                      </div>
                        <div className="flex justify-end">
                          <Switch checked={notifications.newCase} onCheckedChange={v => setNotifications(n => ({ ...n, newCase: v }))} />
                        </div>
                    </div>
                      <div className="grid grid-cols-2 items-center">
                      <div>
                        <Label>تذكير الجلسات</Label>
                        <p className="text-sm text-muted-foreground">تذكير قبل موعد الجلسات</p>
                      </div>
                        <div className="flex justify-end">
                          <Switch checked={notifications.sessionReminder} onCheckedChange={v => setNotifications(n => ({ ...n, sessionReminder: v }))} />
                        </div>
                    </div>
                      <div className="grid grid-cols-2 items-center">
                      <div>
                        <Label>المستندات الجديدة</Label>
                        <p className="text-sm text-muted-foreground">إشعار عند رفع مستندات جديدة</p>
                      </div>
                        <div className="flex justify-end">
                          <Switch checked={notifications.document} onCheckedChange={v => setNotifications(n => ({ ...n, document: v }))} />
                        </div>
                    </div>
                      <div className="grid grid-cols-2 items-center">
                      <div>
                        <Label>الفواتير</Label>
                        <p className="text-sm text-muted-foreground">إشعار عند إنشاء أو تحديث الفواتير</p>
                      </div>
                        <div className="flex justify-end">
                          <Switch checked={notifications.invoice} onCheckedChange={v => setNotifications(n => ({ ...n, invoice: v }))} />
                        </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

            {/* الأمان */}
          <TabsContent value="security">
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 justify-end"><Shield className="w-5 h-5" />إعدادات الأمان</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">الجلسة النشطة</h3>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200 flex items-center gap-3 justify-end">
                      <div className="w-3 h-3 bg-green-500 rounded-full ml-2"></div>
                        <div>
                          <p className="font-medium text-green-800">جلسة نشطة</p>
                        <p className="text-sm text-green-600">تم تسجيل الدخول في: ٢٠٢٤/٠١/٠١ ١٢:٠٠:٠٠</p>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">إعدادات كلمة المرور</h3>
                    <div className="grid grid-cols-2 gap-4 items-center">
                      <span className="text-right">آخر تغيير لكلمة المرور</span>
                      <span className="text-right text-sm text-muted-foreground">منذ 30 يوماً</span>
                      <span className="text-right">قوة كلمة المرور</span>
                      <span className="text-right"><Badge variant="outline" className="bg-green-100 text-green-800">قوية</Badge></span>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold">إعدادات الجلسة</h3>
                    <div className="grid grid-cols-2 gap-4 items-center">
                      <div className="text-right">
                        <Label className="block text-right">مهلة انتهاء الجلسة</Label>
                          <p className="text-sm text-muted-foreground">المدة قبل تسجيل الخروج التلقائي</p>
                        </div>
                      <div className="text-right">
                        <select value={sessionTimeout} onChange={e => setSessionTimeout(e.target.value)} className="w-32 border rounded px-2 py-1 text-right">
                          <option value="15">15 دقيقة</option>
                          <option value="30">30 دقيقة</option>
                          <option value="60">ساعة واحدة</option>
                          <option value="120">ساعتان</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-red-700 flex items-center gap-2 justify-end"><AlertTriangle className="w-5 h-5" />المنطقة الخطرة</h3>
                    <div>
                      <p className="text-sm text-muted-foreground mb-4">سيؤدي هذا إلى تسجيل الخروج من جميع الأجهزة</p>
                      <Button variant="destructive" size="sm" className="flex items-center gap-2 justify-end"><Lock className="w-4 h-4" />إنهاء جميع الجلسات</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

            {/* النظام */}
            <TabsContent value="system">
              <Card className="mb-8">
                  <CardHeader>
                  <CardTitle className="flex items-center gap-2 justify-end"><Settings className="w-5 h-5" />إعدادات النظام</CardTitle>
                  </CardHeader>
                <CardContent className="space-y-8">
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                        <Label>المنطقة الزمنية</Label>
                      <select value={systemSettings.timezone} onChange={e => setSystemSettings(s => ({ ...s, timezone: e.target.value }))} className="w-full border rounded px-2 py-1 text-right">
                        <option value="Africa/Cairo">القاهرة (GMT+2)</option>
                        <option value="Asia/Riyadh">الرياض (GMT+3)</option>
                        <option value="Asia/Kuwait">الكويت (GMT+3)</option>
                        <option value="Asia/Dubai">دبي (GMT+4)</option>
                      </select>
                      </div>
                    <div>
                        <Label>تنسيق التاريخ</Label>
                      <select value={systemSettings.dateFormat} onChange={e => setSystemSettings(s => ({ ...s, dateFormat: e.target.value }))} className="w-full border rounded px-2 py-1 text-right">
                        <option value="DD/MM/YYYY">يوم/شهر/سنة</option>
                        <option value="MM/DD/YYYY">شهر/يوم/سنة</option>
                        <option value="YYYY-MM-DD">سنة-شهر-يوم</option>
                      </select>
                      </div>
                    <div>
                        <Label>العملة</Label>
                      <select value={systemSettings.currency} onChange={e => setSystemSettings(s => ({ ...s, currency: e.target.value }))} className="w-full border rounded px-2 py-1 text-right">
                        <option value="EGP">جنيه مصري (EGP)</option>
                        <option value="SAR">ريال سعودي (SAR)</option>
                        <option value="AED">درهم إماراتي (AED)</option>
                        <option value="KWD">دينار كويتي (KWD)</option>
                        <option value="USD">دولار أمريكي (USD)</option>
                      </select>
                      </div>
                    <div>
                      <Label>توقيت النظام</Label>
                      <input type="time" value={systemSettings.systemTime} onChange={e => setSystemSettings(s => ({ ...s, systemTime: e.target.value }))} className="w-full border rounded px-2 py-1 text-right" />
                    </div>
                  </div>
                </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
      </div>
    </Layout>
    </div>
  );
}
