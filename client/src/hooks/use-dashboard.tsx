import { useQuery } from "@tanstack/react-query";
import { Users, Briefcase, Calendar, Receipt } from "lucide-react";
import { dashboardCalculations } from "@/lib/dashboard-utils";

interface DashboardStats {
  totalClients: number;
  activeCases: number;
  pendingInvoices: number;
  thisWeekSessions: number;
}

interface ProcessedDashboardData {
  stats: DashboardStats | undefined;
  statCards: Array<{
    title: string;
    value: number | string;
    icon: any;
    change: string;
    color: string;
  }>;
  isLoading: boolean;
}

export function useDashboard(): ProcessedDashboardData {
  // Fetch all required data
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
  });

  const { data: sessionsData = [] } = useQuery<any[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: casesData = [] } = useQuery<any[]>({
    queryKey: ["/api/cases"],
  });

  const { data: clientsData = [] } = useQuery<any[]>({
    queryKey: ["/api/clients"],
  });

  const { data: invoicesData = [] } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
  });

  const isLoading = statsLoading;

  // Calculate derived values using utility functions
  const tomorrowSessionsCount = dashboardCalculations.getTomorrowSessionsCount(sessionsData);
  const casesNeedingFollowUp = dashboardCalculations.getCasesNeedingFollowUp(casesData);
  const recentClientsCount = dashboardCalculations.getRecentClientsCount(clientsData);
  const totalPendingAmount = dashboardCalculations.getTotalPendingAmount(invoicesData);

  const statCards = [
    {
      title: "إجمالي العملاء",
      value: stats?.totalClients || 0,
      icon: Users,
      change: recentClientsCount > 0 ? `+${recentClientsCount} عميل جديد هذا الشهر` : "لا توجد عملاء جدد",
      color: "blue"
    },
    {
      title: "القضايا النشطة",
      value: stats?.activeCases || 0,
      icon: Briefcase,
      change: casesNeedingFollowUp > 0 ? `${casesNeedingFollowUp} تحتاج متابعة` : "جميع القضايا محدثة",
      color: "amber"
    },
    {
      title: "الجلسات هذا الأسبوع",
      value: stats?.thisWeekSessions || 0,
      icon: Calendar,
      change: tomorrowSessionsCount > 0 ? `${tomorrowSessionsCount} غداً` : "لا توجد جلسات غداً",
      color: "green"
    },
    {
      title: "الفواتير المعلقة",
      value: stats?.pendingInvoices || 0,
      icon: Receipt,
      change: totalPendingAmount > 0 ? `${totalPendingAmount.toLocaleString()} جنيه` : "جميع الفواتير مدفوعة",
      color: "red"
    }
  ];

  return {
    stats,
    statCards,
    isLoading
  };
} 