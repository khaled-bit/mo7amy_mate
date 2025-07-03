import Layout from "@/components/layout";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, FileText, TrendingUp, Users, Briefcase, Receipt, CheckSquare } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

interface DashboardStats {
  totalClients: number;
  activeCases: number;
  pendingInvoices: number;
  thisWeekSessions: number;
}

interface ReportsStats {
  totalUsers: number;
  completedTasks: number;
  totalRevenue: number;
  casesByStatus: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
}

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedReport, setSelectedReport] = useState("summary");

  // Fetch dashboard stats for reports
  const { data: dashboardStats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  // Fetch additional data
  const { data: clientsData = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const { data: casesData = [] } = useQuery<any[]>({
    queryKey: ["/api/cases"],
  });

  const { data: tasksData = [] } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: invoicesData = [] } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
  });

  const reportTypes = [
    { value: "summary", label: "التقرير الشامل", icon: BarChart3 },
    { value: "clients", label: "تقرير العملاء", icon: Users },
    { value: "cases", label: "تقرير القضايا", icon: Briefcase },
    { value: "financial", label: "التقرير المالي", icon: Receipt },
    { value: "tasks", label: "تقرير المهام", icon: CheckSquare },
  ];

  const periods = [
    { value: "week", label: "هذا الأسبوع" },
    { value: "month", label: "هذا الشهر" },
    { value: "quarter", label: "هذا الربع" },
    { value: "year", label: "هذا العام" },
    { value: "custom", label: "فترة مخصصة" },
  ];

  // Calculate completed tasks count
  const completedTasksCount = tasksData?.filter((task: any) => task.status === 'completed').length || 0;
  
  // Calculate total revenue from paid invoices
  const totalRevenue = invoicesData?.filter((invoice: any) => invoice.paid)
    .reduce((total: number, invoice: any) => total + invoice.amount, 0) || 0;

  const summaryStats = [
    {
      title: "إجمالي العملاء",
      value: dashboardStats?.totalClients?.toString() || "0",
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "blue"
    },
    {
      title: "القضايا النشطة",
      value: dashboardStats?.activeCases?.toString() || "0",
      change: "+5%",
      trend: "up",
      icon: Briefcase,
      color: "green"
    },
    {
      title: "الإيرادات",
      value: `${totalRevenue.toLocaleString()} جنيه`,
      change: "+18%",
      trend: "up",
      icon: Receipt,
      color: "purple"
    },
    {
      title: "المهام المكتملة",
      value: completedTasksCount.toString(),
      change: "+22%",
      trend: "up",
      icon: CheckSquare,
      color: "orange"
    }
  ];

  // Calculate cases by status dynamically
  const getCasesByStatus = () => {
    if (!casesData) return [];
    
    const statusCounts = casesData.reduce((acc: any, caseItem: any) => {
      acc[caseItem.status] = (acc[caseItem.status] || 0) + 1;
      return acc;
    }, {});

    const total = casesData.length;
    const statusMapping: any = {
      'active': { label: 'نشطة', color: 'bg-blue-500' },
      'pending': { label: 'معلقة', color: 'bg-yellow-500' },
      'completed': { label: 'مكتملة', color: 'bg-green-500' },
      'cancelled': { label: 'ملغية', color: 'bg-red-500' },
    };

    return Object.entries(statusCounts).map(([status, count]: [string, any]) => ({
      status: statusMapping[status]?.label || status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: statusMapping[status]?.color || 'bg-gray-500'
    }));
  };

  const casesByStatus = getCasesByStatus();

  // Mock monthly revenue - in a real app, this would come from an API
  const monthlyRevenue = [
    { month: "يناير", amount: Math.floor(totalRevenue * 0.15) },
    { month: "فبراير", amount: Math.floor(totalRevenue * 0.18) },
    { month: "مارس", amount: Math.floor(totalRevenue * 0.16) },
    { month: "أبريل", amount: Math.floor(totalRevenue * 0.20) },
    { month: "مايو", amount: Math.floor(totalRevenue * 0.17) },
    { month: "يونيو", amount: Math.floor(totalRevenue * 0.14) },
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
      <Header title="التقارير والإحصائيات" subtitle="تحليل شامل لأداء المكتب والإحصائيات" />
      
      <div className="space-y-6 mt-6">
        {/* Report Controls */}
        <Card>
          <CardHeader>
            <CardTitle>إعدادات التقرير</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">نوع التقرير</label>
                <Select value={selectedReport} onValueChange={setSelectedReport}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع التقرير" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">الفترة الزمنية</label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفترة" />
                  </SelectTrigger>
                  <SelectContent>
                    {periods.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button>
                <Download className="w-4 h-4 ml-2" />
                تصدير PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {summaryStats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <TrendingUp className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600 font-medium">{stat.change}</span>
                      </div>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cases by Status */}
          <Card>
            <CardHeader>
              <CardTitle>توزيع القضايا حسب الحالة</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {casesByStatus.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                      <span className="font-medium">{item.status}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{item.count} قضية</span>
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${item.color} h-2 rounded-full`}
                          style={{ width: `${item.percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-8">{item.percentage}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Revenue */}
          <Card>
            <CardHeader>
              <CardTitle>الإيرادات الشهرية</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyRevenue.map((item, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="font-medium">{item.month}</span>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${(item.amount / 70000) * 100}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium w-20 text-left">
                        {item.amount.toLocaleString()} جنيه
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Report Section */}
        <Card>
          <CardHeader>
            <CardTitle>التقرير التفصيلي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">التقرير التفصيلي</p>
              <p>اختر نوع التقرير والفترة الزمنية لعرض التحليل التفصيلي</p>
              <Button className="mt-4" variant="outline">
                <FileText className="w-4 h-4 ml-2" />
                إنشاء التقرير
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
