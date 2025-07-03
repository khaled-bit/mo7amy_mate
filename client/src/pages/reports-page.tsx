import Layout from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Download, FileText, TrendingUp, Users, Briefcase, Receipt, CheckSquare } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from "@/hooks/use-toast";

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}

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
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const { toast } = useToast();

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

  // Helper to convert array of objects to CSV
  function toCSV(headers: string[], rows: any[]): string {
    const csvRows = [headers.join(",")];
    for (const row of rows) {
      csvRows.push(headers.map(h => '"' + (row[h] ?? '').toString().replace(/"/g, '""') + '"').join(","));
    }
    return '\uFEFF' + csvRows.join("\n"); // BOM for Excel
  }

  const exportCSV = async () => {
    setIsGeneratingPDF(true);
    try {
      let reportData;
      let fileName;
      let headers: string[] = [];
      let rows: any[] = [];

      switch (selectedReport) {
        case 'clients':
          const clientsResponse = await fetch('/api/export/clients');
          reportData = await clientsResponse.json();
          fileName = `تقرير_العملاء_${new Date().toISOString().split('T')[0]}.csv`;
          headers = ['الاسم', 'الهاتف', 'البريد الإلكتروني', 'العنوان', 'تاريخ الإنشاء'];
          rows = reportData.data.map((client: any) => ({
            'الاسم': client.name,
            'الهاتف': client.phone,
            'البريد الإلكتروني': client.email,
            'العنوان': client.address,
            'تاريخ الإنشاء': client.createdAt
          }));
          break;
        case 'cases':
          const casesResponse = await fetch('/api/export/cases');
          reportData = await casesResponse.json();
          fileName = `تقرير_القضايا_${new Date().toISOString().split('T')[0]}.csv`;
          headers = ['العنوان', 'النوع', 'الحالة', 'المحكمة', 'الوصف', 'تاريخ الإنشاء'];
          rows = reportData.data.map((caseItem: any) => ({
            'العنوان': caseItem.title,
            'النوع': caseItem.type,
            'الحالة': caseItem.status,
            'المحكمة': caseItem.court,
            'الوصف': caseItem.description,
            'تاريخ الإنشاء': caseItem.createdAt
          }));
          break;
        case 'invoices':
          const invoicesResponse = await fetch('/api/export/invoices');
          reportData = await invoicesResponse.json();
          fileName = `تقرير_الفواتير_${new Date().toISOString().split('T')[0]}.csv`;
          headers = ['الرقم', 'المبلغ', 'الحالة', 'تاريخ الاستحقاق', 'الوصف', 'تاريخ الإنشاء'];
          rows = reportData.data.map((invoice: any) => ({
            'الرقم': invoice.id,
            'المبلغ': invoice.amount,
            'الحالة': invoice.paid,
            'تاريخ الاستحقاق': invoice.dueDate,
            'الوصف': invoice.description,
            'تاريخ الإنشاء': invoice.createdAt
          }));
          break;
        case 'sessions':
          const sessionsResponse = await fetch('/api/export/sessions');
          reportData = await sessionsResponse.json();
          fileName = `تقرير_الجلسات_${new Date().toISOString().split('T')[0]}.csv`;
          headers = ['العنوان', 'التاريخ', 'الوقت', 'الحالة', 'الموقع', 'الملاحظات', 'تاريخ الإنشاء'];
          rows = reportData.data.map((session: any) => ({
            'العنوان': session.title,
            'التاريخ': session.date,
            'الوقت': session.time,
            'الحالة': session.status,
            'الموقع': session.location,
            'الملاحظات': session.notes,
            'تاريخ الإنشاء': session.createdAt
          }));
          break;
        case 'tasks':
          const tasksResponse = await fetch('/api/export/tasks');
          reportData = await tasksResponse.json();
          fileName = `تقرير_المهام_${new Date().toISOString().split('T')[0]}.csv`;
          headers = ['العنوان', 'الوصف', 'الحالة', 'الأولوية', 'تاريخ الاستحقاق', 'تاريخ الإنشاء'];
          rows = reportData.data.map((task: any) => ({
            'العنوان': task.title,
            'الوصف': task.description,
            'الحالة': task.status,
            'الأولوية': task.priority,
            'تاريخ الاستحقاق': task.dueDate,
            'تاريخ الإنشاء': task.createdAt
          }));
          break;
        case 'summary':
          const comprehensiveResponse = await fetch('/api/export/comprehensive');
          reportData = await comprehensiveResponse.json();
          fileName = `التقرير_الشامل_${new Date().toISOString().split('T')[0]}.csv`;
          headers = ['إجمالي العملاء', 'إجمالي القضايا', 'القضايا النشطة', 'إجمالي الفواتير', 'الفواتير المعلقة', 'إجمالي الإيرادات', 'إجمالي الجلسات', 'إجمالي المهام'];
          rows = [{
            'إجمالي العملاء': reportData.summary.totalClients,
            'إجمالي القضايا': reportData.summary.totalCases,
            'القضايا النشطة': reportData.summary.activeCases,
            'إجمالي الفواتير': reportData.summary.totalInvoices,
            'الفواتير المعلقة': reportData.summary.pendingInvoices,
            'إجمالي الإيرادات': reportData.summary.totalRevenue,
            'إجمالي الجلسات': reportData.summary.totalSessions,
            'إجمالي المهام': reportData.summary.totalTasks
          }];
          break;
        case 'financial':
          const financialResponse = await fetch('/api/export/financial');
          reportData = await financialResponse.json();
          fileName = `التقرير_المالي_${new Date().toISOString().split('T')[0]}.csv`;
          headers = ['إجمالي الإيرادات', 'المبالغ المعلقة', 'الفواتير المدفوعة', 'الفواتير المعلقة', 'إجمالي الفواتير'];
          rows = [{
            'إجمالي الإيرادات': reportData.summary.totalRevenue,
            'المبالغ المعلقة': reportData.summary.pendingAmount,
            'الفواتير المدفوعة': reportData.summary.paidInvoices,
            'الفواتير المعلقة': reportData.summary.pendingInvoices,
            'إجمالي الفواتير': reportData.summary.totalInvoices
          }];
          break;
        default:
          throw new Error('نوع تقرير غير معروف');
      }

      const csv = toCSV(headers, rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "تم التصدير بنجاح", description: `تم حفظ التقرير كـ ${fileName}` });
    } catch (error) {
      console.error('CSV export error:', error);
      toast({ title: "خطأ في التصدير", description: "حدث خطأ أثناء إنشاء ملف CSV", variant: "destructive" });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      let reportData;
      let fileName;

      // Fetch data based on selected report type
      switch (selectedReport) {
        case 'clients':
          const clientsResponse = await fetch('/api/export/clients');
          reportData = await clientsResponse.json();
          fileName = `تقرير_العملاء_${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'cases':
          const casesResponse = await fetch('/api/export/cases');
          reportData = await casesResponse.json();
          fileName = `تقرير_القضايا_${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'invoices':
          const invoicesResponse = await fetch('/api/export/invoices');
          reportData = await invoicesResponse.json();
          fileName = `تقرير_الفواتير_${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'sessions':
          const sessionsResponse = await fetch('/api/export/sessions');
          reportData = await sessionsResponse.json();
          fileName = `تقرير_الجلسات_${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        case 'comprehensive':
          const comprehensiveResponse = await fetch('/api/export/comprehensive');
          reportData = await comprehensiveResponse.json();
          fileName = `التقرير_الشامل_${new Date().toISOString().split('T')[0]}.pdf`;
          break;
        default:
          throw new Error('نوع تقرير غير معروف');
      }

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      // Add header
      pdf.setFontSize(20);
      pdf.text(reportData.title, 105, 20, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`تاريخ التقرير: ${reportData.date}`, 20, 35);
      pdf.text(`الفترة: ${periods.find(p => p.value === selectedPeriod)?.label || ''}`, 20, 45);

      // Add data tables based on report type
      if (selectedReport === 'clients') {
        pdf.setFontSize(16);
        pdf.text('بيانات العملاء', 20, 60);
        
        const tableData = reportData.data.map((client: any) => [
          client.name,
          client.phone,
          client.email,
          client.address,
          client.createdAt
        ]);

        autoTable(pdf, {
          startY: 70,
          head: [['الاسم', 'الهاتف', 'البريد الإلكتروني', 'العنوان', 'تاريخ الإنشاء']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 8,
            cellPadding: 3
          },
          margin: { left: 20, right: 20 }
        });
      } else if (selectedReport === 'cases') {
        pdf.setFontSize(16);
        pdf.text('بيانات القضايا', 20, 60);
        
        const tableData = reportData.data.map((caseItem: any) => [
          caseItem.title,
          caseItem.type,
          caseItem.status,
          caseItem.court,
          caseItem.createdAt
        ]);

        autoTable(pdf, {
          startY: 70,
          head: [['العنوان', 'النوع', 'الحالة', 'المحكمة', 'تاريخ الإنشاء']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 8,
            cellPadding: 3
          },
          margin: { left: 20, right: 20 }
        });
      } else if (selectedReport === 'invoices') {
        pdf.setFontSize(16);
        pdf.text('بيانات الفواتير', 20, 60);
        
        const tableData = reportData.data.map((invoice: any) => [
          invoice.id,
          invoice.amount,
          invoice.paid,
          invoice.dueDate,
          invoice.createdAt
        ]);

        autoTable(pdf, {
          startY: 70,
          head: [['الرقم', 'المبلغ', 'الحالة', 'تاريخ الاستحقاق', 'تاريخ الإنشاء']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 8,
            cellPadding: 3
          },
          margin: { left: 20, right: 20 }
        });
      } else if (selectedReport === 'sessions') {
        pdf.setFontSize(16);
        pdf.text('بيانات الجلسات', 20, 60);
        
        const tableData = reportData.data.map((session: any) => [
          session.title,
          session.date,
          session.time,
          session.status,
          session.location
        ]);

        autoTable(pdf, {
          startY: 70,
          head: [['العنوان', 'التاريخ', 'الوقت', 'الحالة', 'الموقع']],
          body: tableData,
          theme: 'grid',
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 8,
            cellPadding: 3
          },
          margin: { left: 20, right: 20 }
        });
      } else if (selectedReport === 'comprehensive') {
        // Summary statistics
        pdf.setFontSize(16);
        pdf.text('الإحصائيات العامة', 20, 60);
        
        const summaryData = [
          ['إجمالي العملاء', reportData.summary.totalClients.toString()],
          ['إجمالي القضايا', reportData.summary.totalCases.toString()],
          ['القضايا النشطة', reportData.summary.activeCases.toString()],
          ['إجمالي الفواتير', reportData.summary.totalInvoices.toString()],
          ['الفواتير المعلقة', reportData.summary.pendingInvoices.toString()],
          ['إجمالي الإيرادات', `${reportData.summary.totalRevenue.toLocaleString()} جنيه`],
          ['إجمالي الجلسات', reportData.summary.totalSessions.toString()],
          ['إجمالي المهام', reportData.summary.totalTasks.toString()]
        ];

        autoTable(pdf, {
          startY: 70,
          head: [['البند', 'القيمة']],
          body: summaryData,
          theme: 'grid',
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 10,
            cellPadding: 5
          },
          margin: { left: 20, right: 20 }
        });
      }

      // Add footer
      const finalY = (pdf as any).lastAutoTable?.finalY || 100;
      pdf.setFontSize(10);
      pdf.text('تم إنشاء هذا التقرير بواسطة نظام إدارة القضايا', 105, finalY + 20, { align: 'center' });

      // Save PDF
      pdf.save(fileName);
      toast({ title: "تم التصدير بنجاح", description: `تم حفظ التقرير كـ ${fileName}` });
    } catch (error) {
      console.error('PDF generation error:', error);
      toast({ title: "خطأ في التصدير", description: "حدث خطأ أثناء إنشاء ملف PDF", variant: "destructive" });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

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
      <div className="space-y-6 mt-6" id="report-content">
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
              

              <Button onClick={exportCSV} disabled={isGeneratingPDF} variant="outline">
                <Download className="w-4 h-4 ml-2" />
                تصدير CSV
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
            {selectedReport && selectedPeriod ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {reportTypes.find(t => t.value === selectedReport)?.label}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      الفترة: {periods.find(p => p.value === selectedPeriod)?.label}
                    </p>
                  </div>
                  <Button onClick={exportCSV} disabled={isGeneratingPDF} variant="outline">
                    {isGeneratingPDF ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary ml-2"></div>
                        جاري التصدير...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 ml-2" />
                        تصدير التقرير
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">محتوى التقرير:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {selectedReport === 'clients' && (
                      <>
                        <li>• بيانات العملاء الكاملة</li>
                        <li>• معلومات الاتصال والعناوين</li>
                        <li>• تاريخ إنشاء كل عميل</li>
                      </>
                    )}
                    {selectedReport === 'cases' && (
                      <>
                        <li>• تفاصيل جميع القضايا</li>
                        <li>• حالة ونوع كل قضية</li>
                        <li>• المحكمة المختصة</li>
                      </>
                    )}
                    {selectedReport === 'invoices' && (
                      <>
                        <li>• جميع الفواتير</li>
                        <li>• المبالغ وحالة الدفع</li>
                        <li>• تواريخ الاستحقاق</li>
                      </>
                    )}
                    {selectedReport === 'sessions' && (
                      <>
                        <li>• جدول الجلسات</li>
                        <li>• التواريخ والأوقات</li>
                        <li>• المواقع والملاحظات</li>
                      </>
                    )}
                    {selectedReport === 'tasks' && (
                      <>
                        <li>• جميع المهام</li>
                        <li>• الأولويات والحالات</li>
                        <li>• تواريخ الاستحقاق</li>
                      </>
                    )}
                    {selectedReport === 'summary' && (
                      <>
                        <li>• إحصائيات شاملة</li>
                        <li>• أعداد العملاء والقضايا</li>
                        <li>• الإيرادات والمهام</li>
                      </>
                    )}
                    {selectedReport === 'financial' && (
                      <>
                        <li>• التقرير المالي</li>
                        <li>• الإيرادات والمبالغ المعلقة</li>
                        <li>• إحصائيات الفواتير</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">التقرير التفصيلي</p>
                <p>اختر نوع التقرير والفترة الزمنية لعرض التحليل التفصيلي</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
