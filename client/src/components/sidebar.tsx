import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { 
  Users, 
  Briefcase, 
  Calendar, 
  FileText, 
  Receipt, 
  CheckSquare, 
  BarChart3, 
  UserCog, 
  History, 
  Settings, 
  LogOut,
  Scale,
  Gauge
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export default function Sidebar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();

  if (!user) return null;

  const menuItems = [
    { path: "/", icon: Gauge, label: "لوحة التحكم", active: location === "/" },
    { path: "/clients", icon: Users, label: "العملاء", badge: "24" },
    { path: "/cases", icon: Briefcase, label: "القضايا", badge: "12" },
    { path: "/sessions", icon: Calendar, label: "الجلسات" },
    { path: "/documents", icon: FileText, label: "المستندات" },
    { path: "/invoices", icon: Receipt, label: "الفواتير" },
    { path: "/tasks", icon: CheckSquare, label: "المهام" },
    { path: "/reports", icon: BarChart3, label: "التقارير" },
  ];

  const adminItems = [
    { path: "/users", icon: UserCog, label: "إدارة المستخدمين" },
    { path: "/activity", icon: History, label: "سجل الأنشطة" },
    { path: "/settings", icon: Settings, label: "الإعدادات" },
  ];

  return (
    <div className="w-64 bg-white shadow-lg border-l border-gray-200 flex flex-col">
      {/* Logo and Title */}
      <div className="p-6 bg-primary text-white">
        <div className="flex items-center gap-3">
          <Scale className="text-2xl" />
          <div>
            <h1 className="text-xl font-bold">محامي ميت</h1>
            <p className="text-sm opacity-90">نظام إدارة قانونية</p>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-primary-100 text-primary-600">
              {user.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-gray-800">{user.name}</p>
            <p className="text-sm text-gray-500">
              {user.role === 'admin' ? 'مدير' : user.role === 'lawyer' ? 'محامي' : 'مساعد'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            
            return (
              <li key={item.path}>
                <Link href={item.path}>
                  <div className={`sidebar-item flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg cursor-pointer ${isActive ? 'active' : ''}`}>
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                    {item.badge && (
                      <Badge variant="secondary" className="mr-auto text-xs">
                        {item.badge}
                      </Badge>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Admin Only Section */}
        {user.role === 'admin' && (
          <div className="px-2 mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 mb-2">
              إدارة النظام
            </p>
            <ul className="space-y-1">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path;
                
                return (
                  <li key={item.path}>
                    <Link href={item.path}>
                      <div className={`sidebar-item flex items-center gap-3 px-4 py-3 text-gray-700 rounded-lg cursor-pointer ${isActive ? 'active' : ''}`}>
                        <Icon className="w-5 h-5" />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </nav>

      {/* Logout Button */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-gray-600 hover:text-red-600 hover:bg-red-50"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </Button>
      </div>
    </div>
  );
}
