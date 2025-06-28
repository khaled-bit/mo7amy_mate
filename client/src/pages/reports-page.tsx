import Layout from "@/components/layout";
import Header from "@/components/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, FileText, TrendingUp, Users, Briefcase, Receipt, CheckSquare } from "lucide-react";
import { useState } from "react";

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedReport, setSelectedReport] = useState("summary");

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

  const summaryStats = [
    {
      title: "إجمالي العملاء",
      value: "87",
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "blue"
    },
    {
      title: "القضايا النشطة",
      value: "34",
      change: "+5%",
      trend: "up",
      icon: Briefcase,
      color: "green"
    },
    {
      title: "الإيرادات",
      value: "245,000 جنيه",
      change: "+18%",
      trend: "up",
      icon: Receipt,
      color: "purple"
    },
    {
      title: "المهام المكتملة",
      value: "128",
      change: "+22%",
      trend: "up",
      icon: CheckSquare,
      color: "orange"
    }
  ];

  const casesByStatus = [
    { status: "نشطة", count: 34, percentage: 45, color: "bg-blue-500" },
    { status: "معلقة", count: 18, percentage: 24, color: "bg-yellow-500" },
    { status: "مكتملة", count: 20, percentage: 26, color: "bg-green-500" },
    { status: "ملغية", count: 4, percentage: 5, color: "bg-red-500" },
  ];

  const monthlyRevenue = [
    { month: "يناير", amount: 45000 },
    { month: "فبراير", amount: 52000 },
    { month: "مارس", amount: 48000 },
    { month: "أبريل", amount: 61000 },
    { month: "مايو", amount: 58000 },
    { month: "يونيو", amount: 65000 },
  ];

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
