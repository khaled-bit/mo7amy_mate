import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useDashboard } from "@/hooks/use-dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  UserPlus, 
  Plus, 
  CalendarPlus, 
  FileUp,
  Briefcase,
  Calendar,
  Clock,
  User as UserIcon,
  FileText,
  Users,
  Receipt,
  CheckSquare
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { formatDualDate } from "@/lib/utils";
import { type ActivityLog, type User } from "@shared/schema";

export default function HomePage() {
  const { user } = useAuth();
  const { statCards, isLoading } = useDashboard();

  // Fetch data for dashboard sections
  const { data: cases = [] } = useQuery<any[]>({
    queryKey: ["/api/cases"],
  });

  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: activities = [] } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity", { limit: 5 }],
    queryFn: async () => {
      const res = await fetch("/api/activity?limit=5", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  // Create user mapping for activity display
  const userMap = users?.reduce((acc, user) => {
    acc[user.id] = user.name;
    return acc;
  }, {} as Record<number, string>) || {};

  // Get recent cases (last 5)
  const recentCases = cases.slice(0, 5);

  // Get upcoming sessions (future dates, sorted by date)
  const upcomingSessions = sessions
    .filter(session => new Date(session.date) > new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 5);

  // Get recent activities (already limited to 5 by API)
  const recentActivities = activities;

  const actionIcons = {
    login: UserIcon,
    logout: UserIcon,
    register: UserIcon,
    create_client: Users,
    update_client: Users,
    delete_client: Users,
    create_case: Briefcase,
    update_case: Briefcase,
    create_session: Calendar,
    upload_document: FileText,
    create_invoice: Receipt,
    create_task: CheckSquare,
    create_user: UserIcon,
  };

  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action as keyof typeof actionIcons] || Clock;
    return Icon;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "الآن";
    if (diffInMinutes < 60) return `منذ ${diffInMinutes} دقيقة`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `منذ ${diffInHours} ساعة`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `منذ ${diffInDays} يوم`;
    
    return formatDualDate(dateString);
  };

  const quickActions = [
    { icon: UserPlus, label: "عميل جديد", href: "/clients" },
    { icon: Plus, label: "قضية جديدة", href: "/cases" },
    { icon: CalendarPlus, label: "جدولة جلسة", href: "/sessions" },
    { icon: FileUp, label: "رفع مستند", href: "/documents" },
  ];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="card-hover">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.change}</p>
                    </div>
                    <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                      <Icon className={`text-${stat.color}-600 w-6 h-6`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>إجراءات سريعة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <Link key={index} href={action.href}>
                    <Button 
                      variant="outline" 
                      className="h-auto p-4 flex flex-col items-center gap-2 hover:border-primary hover:bg-primary/5"
                    >
                      <Icon className="w-6 h-6 text-primary" />
                      <span className="text-sm font-medium">{action.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Cases */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>القضايا الحديثة</CardTitle>
                <Link href="/cases">
                  <Button variant="ghost" size="sm">عرض الكل</Button>
                </Link>
              </CardHeader>
              <CardContent>
                {recentCases.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد قضايا حديثة</p>
                    <p className="text-sm">ابدأ بإضافة قضية جديدة</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recentCases.map((caseItem) => (
                      <div key={caseItem.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <Briefcase className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{caseItem.title}</p>
                            <p className="text-sm text-muted-foreground">{caseItem.type}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={caseItem.status === 'active' ? 'default' : 'secondary'}>
                            {caseItem.status === 'active' ? 'نشطة' : 'مغلقة'}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            {caseItem.createdAt ? formatDualDate(caseItem.createdAt.toString()) : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Sessions & Activity */}
          <div className="space-y-6">
            {/* Upcoming Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>الجلسات القادمة</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingSessions.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">لا توجد جلسات مجدولة</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingSessions.map((session) => (
                      <div key={session.id} className="flex items-center gap-3 p-2 border border-gray-100 rounded-lg">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                          <Calendar className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{session.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {session.date ? formatDualDate(session.date) : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>النشاط الأخير</CardTitle>
              </CardHeader>
              <CardContent>
                {recentActivities.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">لا يوجد نشاط حديث</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivities.map((activity) => {
                      const Icon = getActionIcon(activity.action);
                      return (
                        <div key={activity.id} className="flex items-center gap-3 p-2 border border-gray-100 rounded-lg">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Icon className="w-4 h-4 text-gray-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {activity.details || activity.action}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activity.userId ? userMap[activity.userId] || `المستخدم ${activity.userId}` : "النظام"} • {activity.createdAt ? formatTimeAgo(activity.createdAt.toString()) : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
