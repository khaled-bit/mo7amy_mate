import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Search, Menu, CheckCircle, AlertTriangle, X, Info, User } from "lucide-react";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onToggleSidebar?: () => void;
  isMobile?: boolean;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  createdAt: string;
  read: boolean;
}

// Page titles and subtitles mapping
const pageInfo = {
  '/': { title: 'لوحة التحكم', subtitle: 'مرحباً بك، إليك نظرة عامة على مكتبك' },
  '/clients': { title: 'إدارة العملاء', subtitle: 'إدارة معلومات العملاء وبياناتهم' },
  '/cases': { title: 'إدارة القضايا', subtitle: 'إدارة القضايا القانونية ومتابعتها' },
  '/sessions': { title: 'إدارة الجلسات', subtitle: 'جدولة ومتابعة الجلسات القانونية' },
  '/documents': { title: 'إدارة المستندات', subtitle: 'رفع وإدارة مستندات القضايا' },
  '/invoices': { title: 'إدارة الفواتير', subtitle: 'إنشاء ومتابعة الفواتير والمدفوعات' },
  '/tasks': { title: 'إدارة المهام', subtitle: 'إنشاء وتتبع المهام والأعمال' },
  '/reports': { title: 'التقارير والإحصائيات', subtitle: 'تحليل شامل لأداء المكتب والإحصائيات' },
  '/users': { title: 'إدارة المستخدمين', subtitle: 'إضافة وإدارة مستخدمي النظام' },
  '/activity': { title: 'سجل الأنشطة', subtitle: 'تتبع جميع العمليات والأنشطة في النظام' },
  '/settings': { title: 'الإعدادات', subtitle: 'إدارة إعدادات النظام والملف الشخصي' },
};

export default function Header({ 
  title, 
  subtitle, 
  onToggleSidebar,
  isMobile = false 
}: HeaderProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [location, setLocation] = useLocation();

  // Get current page info
  const currentPageInfo = pageInfo[location as keyof typeof pageInfo] || pageInfo['/'];
  const displayTitle = title || currentPageInfo.title;
  const displaySubtitle = subtitle || currentPageInfo.subtitle;

  // Fetch search results
  const { data: searchResults } = useQuery({
    queryKey: ["/api/search", searchTerm],
    queryFn: async () => {
      if (!searchTerm.trim()) return { cases: [], clients: [] };
      
      const [casesRes, clientsRes] = await Promise.all([
        fetch(`/api/cases/search?q=${encodeURIComponent(searchTerm)}`),
        fetch(`/api/clients/search?q=${encodeURIComponent(searchTerm)}`)
      ]);
      
      const cases = casesRes.ok ? await casesRes.json() : [];
      const clients = clientsRes.ok ? await clientsRes.json() : [];
      
      return { cases, clients };
    },
    enabled: searchTerm.trim().length > 0,
  });

  // Fetch notifications from activity log
  const { data: activityData = [] } = useQuery<any[]>({
    queryKey: ["/api/activity"],
    enabled: !!user,
  });

  // Convert activity log to notifications
  const notifications: Notification[] = activityData.slice(0, 10).map((activity, index) => ({
    id: activity.id || index,
    title: getNotificationTitle(activity.action),
    message: activity.details || 'نشاط جديد في النظام',
    type: getNotificationType(activity.action),
    createdAt: activity.createdAt || new Date().toISOString(),
    read: false
  }));

  function getNotificationTitle(action: string): string {
    const actionMap: Record<string, string> = {
      'create_client': 'عميل جديد',
      'create_case': 'قضية جديدة',
      'create_task': 'مهمة جديدة',
      'create_invoice': 'فاتورة جديدة',
      'update_case': 'تحديث قضية',
      'login': 'تسجيل دخول',
      'logout': 'تسجيل خروج',
    };
    return actionMap[action] || 'إشعار';
  }

  function getNotificationType(action: string): 'info' | 'success' | 'warning' | 'error' {
    if (action.includes('create')) return 'success';
    if (action.includes('update')) return 'info';
    if (action.includes('delete')) return 'warning';
    if (action.includes('error')) return 'error';
    return 'info';
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-3.5 h-3.5 text-green-600" />;
      case 'warning': return <AlertTriangle className="w-3.5 h-3.5 text-yellow-600" />;
      case 'error': return <X className="w-3.5 h-3.5 text-red-600" />;
      default: return <Info className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'الآن';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} دقيقة`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ساعة`;
    return `${Math.floor(diffInSeconds / 86400)} يوم`;
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && searchResults) {
      // Navigate to search results or first result
      if (searchResults.cases?.length > 0) {
        setLocation(`/cases/${searchResults.cases[0].id}`);
      } else if (searchResults.clients?.length > 0) {
        setLocation('/clients');
      }
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Section - Mobile Menu & Title */}
          <div className="flex items-center gap-4">
            {/* Mobile Hamburger Menu */}
            {isMobile && onToggleSidebar && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleSidebar}
                className="text-gray-600 hover:text-primary-600 hover:bg-primary-50 md:hidden h-8 w-8 p-0"
              >
                <Menu className="w-4 h-4" />
              </Button>
            )}
            
            {/* Page Title */}
            <div className="hidden md:block">
              <h2 className="text-lg font-bold text-gray-800">{displayTitle}</h2>
              <p className="text-sm text-gray-600">{displaySubtitle}</p>
            </div>
          </div>
          
          {/* Center Section - Search Bar */}
          <div className="flex-1 max-w-md mx-4">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Input
                type="search"
                placeholder="البحث في القضايا والعملاء..."
                className="w-full pr-10 h-9 text-sm bg-gray-50 border-gray-200 focus:bg-white focus:border-primary"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              
              {/* Search Results Dropdown */}
              {searchTerm.trim() && searchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searchResults.cases?.length > 0 && (
                    <div className="p-2">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">القضايا</h4>
                      {searchResults.cases.slice(0, 3).map((caseItem: any) => (
                        <div
                          key={caseItem.id}
                          className="p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                          onClick={() => {
                            setLocation(`/cases/${caseItem.id}`);
                            setSearchTerm("");
                          }}
                        >
                          <div className="font-medium">{caseItem.title}</div>
                          <div className="text-gray-500 text-xs">{caseItem.type}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {searchResults.clients?.length > 0 && (
                    <div className="p-2 border-t">
                      <h4 className="text-xs font-semibold text-gray-500 mb-2">العملاء</h4>
                      {searchResults.clients.slice(0, 3).map((client: any) => (
                        <div
                          key={client.id}
                          className="p-2 hover:bg-gray-50 rounded cursor-pointer text-sm"
                          onClick={() => {
                            setLocation('/clients');
                            setSearchTerm("");
                          }}
                        >
                          <div className="font-medium">{client.name}</div>
                          <div className="text-gray-500 text-xs">{client.phone}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {(!searchResults.cases?.length && !searchResults.clients?.length) && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      لا توجد نتائج
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>
          
          {/* Right Section - Notifications & User */}
          <div className="flex items-center gap-3">
            {/* Notifications */}
            <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="relative text-gray-600 hover:text-primary-600 hover:bg-primary-50 h-9 w-9 p-0">
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-4 w-4 flex items-center justify-center text-xs p-0"
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end" side="bottom">
                <div className="p-3 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">الإشعارات</h3>
                    {unreadCount > 0 && (
                      <Badge variant="secondary" className="text-xs">{unreadCount} جديد</Badge>
                    )}
                  </div>
                </div>
                
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      <Bell className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">لا توجد إشعارات جديدة</p>
                      {user?.role === 'admin' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2 h-7 text-xs"
                          onClick={() => {
                            setNotificationsOpen(false);
                            setLocation('/activity');
                          }}
                        >
                          عرض سجل الأنشطة
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {notifications.map((notification, idx) => (
                        <div
                          key={notification.id}
                          className={`p-3 hover:bg-muted/50 cursor-pointer transition-colors flex items-center gap-2 ${!notification.read ? 'bg-blue-50' : ''}`}
                          onClick={e => {
                            e.stopPropagation();
                            notifications[idx].read = !notifications[idx].read;
                            setNotificationsOpen(true); // keep popover open
                          }}
                        >
                          {/* Dot for unread */}
                          {!notification.read && <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2"></span>}
                          <div className="flex-1 min-w-0 text-right">
                            <div className="flex items-center justify-between gap-2">
                              <p className="font-medium text-sm truncate">
                                {notification.title}
                              </p>
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {formatRelativeTime(notification.createdAt)}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                {notifications.length > 0 && (
                  <div className="p-3 border-t bg-muted/20">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full h-7 text-xs"
                      onClick={() => {
                        setNotificationsOpen(false);
                        if (user?.role === 'admin') setLocation('/activity');
                      }}
                    >
                      عرض جميع الإشعارات
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>

            {/* User Profile */}
            <div className="flex items-center gap-2">
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-gray-800">{user?.name}</p>
                <p className="text-xs text-gray-500">
                  {user?.role === 'admin' ? 'مدير' : user?.role === 'lawyer' ? 'محامي' : 'مساعد'}
                </p>
              </div>
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-primary-600" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
