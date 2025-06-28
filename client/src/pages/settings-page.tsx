import Layout from "@/components/layout";
import Header from "@/components/header";
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Database, 
  Save, 
  Mail, 
  Phone, 
  Lock,
  Download,
  Upload,
  Trash2,
  AlertTriangle
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { insertUserSchema } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const profileSchema = insertUserSchema.pick({
  name: true,
  email: true,
  phone: true,
}).extend({
  currentPassword: z.string().optional(),
  newPassword: z.string().optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && !data.currentPassword) {
    return false;
  }
  if (data.newPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "كلمات المرور غير متطابقة أو كلمة المرور الحالية مطلوبة",
  path: ["confirmPassword"],
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface NotificationSettings {
  emailNotifications: boolean;
  smsNotifications: boolean;
  newCaseNotifications: boolean;
  sessionReminders: boolean;
  documentNotifications: boolean;
  invoiceNotifications: boolean;
}

interface SystemSettings {
  language: string;
  timezone: string;
  dateFormat: string;
  currency: string;
  autoBackup: boolean;
  sessionTimeout: number;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("profile");
  
  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNotifications: true,
    smsNotifications: false,
    newCaseNotifications: true,
    sessionReminders: true,
    documentNotifications: true,
    invoiceNotifications: true,
  });

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    language: "ar",
    timezone: "Asia/Riyadh",
    dateFormat: "DD/MM/YYYY",
    currency: "SAR",
    autoBackup: true,
    sessionTimeout: 30,
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      phone: user?.phone || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const updateData: any = {
        name: data.name,
        email: data.email,
        phone: data.phone,
      };
      
      if (data.newPassword && data.currentPassword) {
        updateData.password = data.newPassword;
        updateData.currentPassword = data.currentPassword;
      }
      
      const res = await apiRequest("PUT", `/api/users/${user?.id}`, updateData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      profileForm.reset({
        name: profileForm.getValues("name"),
        email: profileForm.getValues("email"),
        phone: profileForm.getValues("phone"),
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      toast({ title: "تم تحديث الملف الشخصي بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في تحديث الملف الشخصي", variant: "destructive" });
    },
  });

  const saveNotificationsMutation = useMutation({
    mutationFn: async (data: NotificationSettings) => {
      // This would typically save to user preferences in the database
      return Promise.resolve(data);
    },
    onSuccess: () => {
      toast({ title: "تم حفظ إعدادات الإشعارات" });
    },
  });

  const saveSystemMutation = useMutation({
    mutationFn: async (data: SystemSettings) => {
      // This would typically save to system configuration
      return Promise.resolve(data);
    },
    onSuccess: () => {
      toast({ title: "تم حفظ إعدادات النظام" });
    },
  });

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  const handleNotificationChange = (key: keyof NotificationSettings, value: boolean) => {
    const newSettings = { ...notifications, [key]: value };
    setNotifications(newSettings);
    saveNotificationsMutation.mutate(newSettings);
  };

  const handleSystemChange = (key: keyof SystemSettings, value: string | boolean | number) => {
    const newSettings = { ...systemSettings, [key]: value };
    setSystemSettings(newSettings);
    saveSystemMutation.mutate(newSettings);
  };

  if (!user) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">يتطلب تسجيل الدخول</h2>
            <p className="text-muted-foreground">يرجى تسجيل الدخول للوصول إلى الإعدادات</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Header title="الإعدادات" subtitle="إدارة إعدادات النظام والملف الشخصي" />
      
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              الملف الشخصي
            </TabsTrigger>
            <TabsTrigger value="notifications" className="flex items-center gap-2">
              <Bell className="w-4 h-4" />
              الإشعارات
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Shield className="w-4 h-4" />
              الأمان
            </TabsTrigger>
            {user.role === 'admin' && (
              <TabsTrigger value="system" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                النظام
              </TabsTrigger>
            )}
          </TabsList>

          {/* Profile Settings */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  معلومات الملف الشخصي
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={profileForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>الاسم الكامل</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <Label>اسم المستخدم</Label>
                        <Input value={user.username} disabled />
                        <p className="text-xs text-muted-foreground">لا يمكن تغيير اسم المستخدم</p>
                      </div>

                      <FormField
                        control={profileForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>البريد الإلكتروني</FormLabel>
                            <FormControl>
                              <Input type="email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>رقم الهاتف</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="space-y-2">
                        <Label>الدور</Label>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {user.role === 'admin' ? 'مدير' : user.role === 'lawyer' ? 'محامي' : 'مساعد'}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>تاريخ الانضمام</Label>
                        <Input 
                          value={user.createdAt ? new Date(user.createdAt).toLocaleDateString('ar-SA') : '-'} 
                          disabled 
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">تغيير كلمة المرور</h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <FormField
                          control={profileForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>كلمة المرور الحالية</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>كلمة المرور الجديدة</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={profileForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>تأكيد كلمة المرور</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      حفظ التغييرات
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  إعدادات الإشعارات
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">طرق الإشعار</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label>إشعارات البريد الإلكتروني</Label>
                          <p className="text-sm text-muted-foreground">تلقي الإشعارات عبر البريد الإلكتروني</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.emailNotifications}
                        onCheckedChange={(checked) => handleNotificationChange('emailNotifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <Label>إشعارات الرسائل النصية</Label>
                          <p className="text-sm text-muted-foreground">تلقي الإشعارات عبر الرسائل النصية</p>
                        </div>
                      </div>
                      <Switch
                        checked={notifications.smsNotifications}
                        onCheckedChange={(checked) => handleNotificationChange('smsNotifications', checked)}
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">أنواع الإشعارات</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>القضايا الجديدة</Label>
                        <p className="text-sm text-muted-foreground">إشعار عند إضافة قضية جديدة</p>
                      </div>
                      <Switch
                        checked={notifications.newCaseNotifications}
                        onCheckedChange={(checked) => handleNotificationChange('newCaseNotifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>تذكير الجلسات</Label>
                        <p className="text-sm text-muted-foreground">تذكير قبل موعد الجلسات</p>
                      </div>
                      <Switch
                        checked={notifications.sessionReminders}
                        onCheckedChange={(checked) => handleNotificationChange('sessionReminders', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>المستندات الجديدة</Label>
                        <p className="text-sm text-muted-foreground">إشعار عند رفع مستندات جديدة</p>
                      </div>
                      <Switch
                        checked={notifications.documentNotifications}
                        onCheckedChange={(checked) => handleNotificationChange('documentNotifications', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <Label>الفواتير</Label>
                        <p className="text-sm text-muted-foreground">إشعار عند إنشاء أو تحديث الفواتير</p>
                      </div>
                      <Switch
                        checked={notifications.invoiceNotifications}
                        onCheckedChange={(checked) => handleNotificationChange('invoiceNotifications', checked)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    إعدادات الأمان
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">الجلسة النشطة</h3>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <div>
                          <p className="font-medium text-green-800">جلسة نشطة</p>
                          <p className="text-sm text-green-600">
                            تم تسجيل الدخول في: {new Date().toLocaleString('ar-SA')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">إعدادات كلمة المرور</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span>آخر تغيير لكلمة المرور</span>
                        <span className="text-sm text-muted-foreground">منذ 30 يوماً</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>قوة كلمة المرور</span>
                        <Badge variant="outline" className="bg-green-100 text-green-800">قوية</Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">إعدادات الجلسة</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>مهلة انتهاء الجلسة</Label>
                          <p className="text-sm text-muted-foreground">المدة قبل تسجيل الخروج التلقائي</p>
                        </div>
                        <Select 
                          value={systemSettings.sessionTimeout.toString()} 
                          onValueChange={(value) => handleSystemChange('sessionTimeout', parseInt(value))}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="15">15 دقيقة</SelectItem>
                            <SelectItem value="30">30 دقيقة</SelectItem>
                            <SelectItem value="60">ساعة واحدة</SelectItem>
                            <SelectItem value="120">ساعتان</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    المنطقة الخطرة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold">إنهاء جميع الجلسات</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        سيؤدي هذا إلى تسجيل الخروج من جميع الأجهزة
                      </p>
                      <Button variant="destructive" size="sm">
                        <Lock className="w-4 h-4 ml-2" />
                        إنهاء جميع الجلسات
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* System Settings (Admin Only) */}
          {user.role === 'admin' && (
            <TabsContent value="system">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      إعدادات النظام العامة
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label>اللغة</Label>
                        <Select 
                          value={systemSettings.language} 
                          onValueChange={(value) => handleSystemChange('language', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ar">العربية</SelectItem>
                            <SelectItem value="en">English</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>المنطقة الزمنية</Label>
                        <Select 
                          value={systemSettings.timezone} 
                          onValueChange={(value) => handleSystemChange('timezone', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Asia/Riyadh">الرياض (GMT+3)</SelectItem>
                            <SelectItem value="Asia/Kuwait">الكويت (GMT+3)</SelectItem>
                            <SelectItem value="Asia/Dubai">دبي (GMT+4)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>تنسيق التاريخ</Label>
                        <Select 
                          value={systemSettings.dateFormat} 
                          onValueChange={(value) => handleSystemChange('dateFormat', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DD/MM/YYYY">يوم/شهر/سنة</SelectItem>
                            <SelectItem value="MM/DD/YYYY">شهر/يوم/سنة</SelectItem>
                            <SelectItem value="YYYY-MM-DD">سنة-شهر-يوم</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>العملة</Label>
                        <Select 
                          value={systemSettings.currency} 
                          onValueChange={(value) => handleSystemChange('currency', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SAR">ريال سعودي (SAR)</SelectItem>
                            <SelectItem value="AED">درهم إماراتي (AED)</SelectItem>
                            <SelectItem value="KWD">دينار كويتي (KWD)</SelectItem>
                            <SelectItem value="USD">دولار أمريكي (USD)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">النسخ الاحتياطي</h3>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>النسخ الاحتياطي التلقائي</Label>
                          <p className="text-sm text-muted-foreground">إنشاء نسخة احتياطية يومياً تلقائياً</p>
                        </div>
                        <Switch
                          checked={systemSettings.autoBackup}
                          onCheckedChange={(checked) => handleSystemChange('autoBackup', checked)}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="w-5 h-5" />
                      إدارة البيانات
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <h3 className="font-semibold">تصدير البيانات</h3>
                        <p className="text-sm text-muted-foreground">
                          تصدير جميع بيانات النظام للأرشفة أو النقل
                        </p>
                        <Button variant="outline" className="w-full">
                          <Download className="w-4 h-4 ml-2" />
                          تصدير البيانات
                        </Button>
                      </div>

                      <div className="space-y-3">
                        <h3 className="font-semibold">استيراد البيانات</h3>
                        <p className="text-sm text-muted-foreground">
                          استيراد البيانات من ملف احتياطي
                        </p>
                        <Button variant="outline" className="w-full">
                          <Upload className="w-4 h-4 ml-2" />
                          استيراد البيانات
                        </Button>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                          <div>
                            <h3 className="font-semibold text-red-800">حذف جميع البيانات</h3>
                            <p className="text-sm text-red-600 mb-3">
                              تحذير: هذا الإجراء لا يمكن التراجع عنه. سيتم حذف جميع البيانات نهائياً.
                            </p>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="w-4 h-4 ml-2" />
                              حذف جميع البيانات
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
