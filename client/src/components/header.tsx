import { useAuth } from "@/hooks/use-auth";
import { Search, Bell, CheckCircle, AlertTriangle, Info, X, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useLocation } from "wouter";

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

export default function Header({ 
  title = "لوحة التحكم", 
  subtitle = "مرحباً بك، إليك نظرة عامة على مكتبك",
  onToggleSidebar,
  isMobile = false 
}: HeaderProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [, setLocation] = useLocation();

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

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
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
          
          <div>
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            <p className="text-sm text-gray-600">{subtitle}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Input
              type="search"
              placeholder="البحث في القضايا والعملاء..."
              className="w-64 pr-8 h-8 text-sm max-w-xs md:max-w-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-3.5 h-3.5" />
          </div>
          
          {/* Notifications */}
          <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="relative text-gray-600 hover:text-primary-600 hover:bg-primary-50 h-8 w-8 p-0">
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -left-1 h-4 w-4 flex items-center justify-center text-xs p-0"
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="start" side="left">
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
        </div>
      </div>
    </header>
  );
}
