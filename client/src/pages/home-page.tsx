import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Briefcase, 
  Calendar, 
  Receipt, 
  UserPlus, 
  Plus, 
  CalendarPlus, 
  FileUp,
  TrendingUp,
  CheckCircle,
  Clock
} from "lucide-react";
import { Link } from "wouter";

interface DashboardStats {
  totalClients: number;
  activeCases: number;
  pendingInvoices: number;
  thisWeekSessions: number;
}

export default function HomePage() {
  const { user } = useAuth();
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const quickActions = [
    { icon: UserPlus, label: "عميل جديد", href: "/clients" },
    { icon: Plus, label: "قضية جديدة", href: "/cases" },
    { icon: CalendarPlus, label: "جدولة جلسة", href: "/sessions" },
    { icon: FileUp, label: "رفع مستند", href: "/documents" },
  ];

  const statCards = [
    {
      title: "إجمالي العملاء",
      value: stats?.totalClients || 0,
      icon: Users,
      change: "+12% من الشهر الماضي",
      color: "blue"
    },
    {
      title: "القضايا النشطة",
      value: stats?.activeCases || 0,
      icon: Briefcase,
      change: "5 تحتاج متابعة",
      color: "amber"
    },
    {
      title: "الجلسات هذا الأسبوع",
      value: stats?.thisWeekSessions || 0,
      icon: Calendar,
      change: "3 غداً",
      color: "green"
    },
    {
      title: "الفواتير المعلقة",
      value: `${stats?.pendingInvoices || 0}`,
      icon: Receipt,
      change: "جنيه مصري",
      color: "red"
    }
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
                <div className="space-y-4">
                  {/* This would be populated from actual case data */}
                  <div className="text-center py-8 text-muted-foreground">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>لا توجد قضايا حديثة</p>
                    <p className="text-sm">ابدأ بإضافة قضية جديدة</p>
                  </div>
                </div>
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
                <div className="text-center py-4 text-muted-foreground">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">لا توجد جلسات مجدولة</p>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle>النشاط الأخير</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">لا يوجد نشاط حديث</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
