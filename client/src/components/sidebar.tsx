import { useAuth } from "@/hooks/use-auth";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
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
  Gauge,
  Menu,
  X,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface SidebarStats {
  totalClients: number;
  activeCases: number;
  pendingTasks: number;
  pendingInvoices: number;
}

interface SidebarProps {
  isOpen?: boolean;
  onToggle?: () => void;
}

export default function Sidebar({ isOpen = true, onToggle }: SidebarProps) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch sidebar counts
  const { data: stats } = useQuery<SidebarStats>({
    queryKey: ["/api/sidebar/stats"],
    enabled: !!user,
  });

  if (!user) return null;

  const menuItems = [
    { path: "/", icon: Gauge, label: "لوحة التحكم", shortLabel: "الرئيسية" },
    { 
      path: "/clients", 
      icon: Users, 
      label: "العملاء", 
      shortLabel: "العملاء",
      badge: stats?.totalClients ? stats.totalClients.toString() : undefined 
    },
    { 
      path: "/cases", 
      icon: Briefcase, 
      label: "القضايا", 
      shortLabel: "القضايا",
      badge: stats?.activeCases ? stats.activeCases.toString() : undefined 
    },
    { path: "/sessions", icon: Calendar, label: "الجلسات", shortLabel: "الجلسات" },
    { path: "/documents", icon: FileText, label: "المستندات", shortLabel: "المستندات" },
    { 
      path: "/invoices", 
      icon: Receipt, 
      label: "الفواتير",
      shortLabel: "الفواتير",
      badge: stats?.pendingInvoices ? stats.pendingInvoices.toString() : undefined 
    },
    { 
      path: "/tasks", 
      icon: CheckSquare, 
      label: "المهام",
      shortLabel: "المهام",
      badge: stats?.pendingTasks ? stats.pendingTasks.toString() : undefined 
    },
    { path: "/reports", icon: BarChart3, label: "التقارير", shortLabel: "التقارير" },
  ];

  const adminItems = [
    { path: "/users", icon: UserCog, label: "إدارة المستخدمين", shortLabel: "المستخدمين" },
    { path: "/activity", icon: History, label: "سجل الأنشطة", shortLabel: "السجل" },
    { path: "/settings", icon: Settings, label: "الإعدادات", shortLabel: "الإعدادات" },
  ];

  const handleItemClick = () => {
    if (isMobile && onToggle) {
      onToggle();
    }
  };

  const sidebarWidth = isCollapsed ? 'w-14' : 'w-52';
  const sidebarClass = cn(
    "bg-white shadow-xl border-l border-gray-200 flex flex-col transition-all duration-300 ease-in-out relative z-30",
    sidebarWidth,
    isMobile && !isOpen && "-translate-x-full"
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div className={sidebarClass}>
        {/* Header */}
        <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white relative">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-md">
                <Scale className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h1 className="text-sm font-bold">محامي ميت</h1>
                <p className="text-xs opacity-90">نظام إدارة قانونية</p>
              </div>
            </div>
          )}
          
          {isCollapsed && (
            <div className="flex justify-center">
              <div className="p-1.5 bg-white/20 rounded-md">
                <Scale className="w-4 h-4" />
              </div>
            </div>
          )}

          {/* Toggle Button */}
          {!isMobile && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute -left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 p-0 bg-white text-gray-600 hover:bg-gray-50 rounded-full shadow-md border"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <ChevronRight className={cn("w-2.5 h-2.5 transition-transform", isCollapsed && "rotate-180")} />
            </Button>
          )}
        </div>

        {/* User Profile */}
        {!isCollapsed && (
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Avatar className="w-7 h-7 ring-2 ring-blue-100">
                <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold text-xs">
                  {user.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 truncate text-sm">{user.name}</p>
                <p className="text-xs text-gray-500">
                  {user.role === 'admin' ? 'مدير' : user.role === 'lawyer' ? 'محامي' : 'مساعد'}
                </p>
              </div>
            </div>
          </div>
        )}

        {isCollapsed && (
          <div className="p-1.5 border-b border-gray-100 flex justify-center">
            <Avatar className="w-6 h-6 ring-2 ring-blue-100">
              <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold text-xs">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
          </div>
        )}

        {/* Navigation Menu */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <ul className="space-y-0.5 px-1.5">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              
              return (
                <li key={item.path}>
                  <Link href={item.path}>
                    <div 
                      className={cn(
                        "group flex items-center gap-2 px-2 py-2 text-gray-700 rounded-lg cursor-pointer transition-all duration-200 relative overflow-hidden text-sm",
                        "hover:bg-blue-50 hover:text-blue-700 hover:shadow-sm hover:scale-[1.02]",
                        isActive && "bg-blue-100 text-blue-700 shadow-sm border border-blue-200",
                        isCollapsed && "justify-center px-1.5"
                      )}
                      onClick={handleItemClick}
                      title={isCollapsed ? item.label : undefined}
                    >
                      {/* Active indicator */}
                      {isActive && (
                        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-blue-600 rounded-l-lg" />
                      )}
                      
                      <Icon className={cn("w-4 h-4 transition-colors flex-shrink-0", isActive && "text-blue-600")} />
                      
                      {!isCollapsed && (
                        <>
                          <span className="flex-1 font-medium">{item.label}</span>
                          {item.badge && (
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-xs px-1.5 py-0 bg-gray-100 text-gray-600 group-hover:bg-blue-200 group-hover:text-blue-700 h-4",
                                isActive && "bg-blue-200 text-blue-700"
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </>
                      )}

                      {/* Tooltip for collapsed state */}
                      {isCollapsed && (
                        <div className="absolute right-full mr-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                          {item.label}
                          <div className="absolute left-full top-1/2 -translate-y-1/2 border-2 border-transparent border-r-gray-900" />
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          {/* Admin Only Section */}
          {user.role === 'admin' && (
            <div className="px-1.5 mt-4">
              {!isCollapsed && (
                <div className="flex items-center gap-1.5 px-2 mb-2">
                  <div className="h-px bg-gray-200 flex-1" />
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    إدارة النظام
                  </p>
                  <div className="h-px bg-gray-200 flex-1" />
                </div>
              )}

              {isCollapsed && <div className="h-px bg-gray-200 mx-1.5 mb-2" />}
              
              <ul className="space-y-0.5">
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.path;
                  
                  return (
                    <li key={item.path}>
                      <Link href={item.path}>
                        <div 
                          className={cn(
                            "group flex items-center gap-2 px-2 py-2 text-gray-700 rounded-lg cursor-pointer transition-all duration-200 relative overflow-hidden text-sm",
                            "hover:bg-purple-50 hover:text-purple-700 hover:shadow-sm hover:scale-[1.02]",
                            isActive && "bg-purple-100 text-purple-700 shadow-sm border border-purple-200",
                            isCollapsed && "justify-center px-1.5"
                          )}
                          onClick={handleItemClick}
                          title={isCollapsed ? item.label : undefined}
                        >
                          {/* Active indicator */}
                          {isActive && (
                            <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-purple-600 rounded-l-lg" />
                          )}
                          
                          <Icon className={cn("w-4 h-4 transition-colors flex-shrink-0", isActive && "text-purple-600")} />
                          
                          {!isCollapsed && (
                            <span className="flex-1 font-medium">{item.label}</span>
                          )}

                          {/* Tooltip for collapsed state */}
                          {isCollapsed && (
                            <div className="absolute right-full mr-1.5 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50">
                              {item.label}
                              <div className="absolute left-full top-1/2 -translate-y-1/2 border-2 border-transparent border-r-gray-900" />
                            </div>
                          )}
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
        <div className="p-3 border-t border-gray-100">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 hover:scale-[1.02] text-sm h-8",
              isCollapsed && "justify-center px-1.5"
            )}
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            title={isCollapsed ? "تسجيل الخروج" : undefined}
          >
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            {!isCollapsed && <span>تسجيل الخروج</span>}
          </Button>
        </div>
      </div>
    </>
  );
}
