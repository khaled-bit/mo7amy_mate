import Layout from "@/components/layout";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Search, Clock, User, Activity } from "lucide-react";
import { formatDualDate } from "@/lib/utils";
import { type ActivityLog as ActivityType } from "@shared/schema";

export default function ActivityPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const { data: activities, isLoading } = useQuery<ActivityType[]>({
    queryKey: ["/api/activity"],
  });

  // Fetch all users for mapping userId to name
  const { data: users } = useQuery<any[]>({
    queryKey: ["/api/users"],
    // Only fetch if admin (API requires admin), fallback to empty array if not allowed
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Helper to get user name by id
  const getUserName = (userId: number | null | undefined) => {
    if (!userId || !users) return "غير محدد";
    const user = users.find((u: any) => u.id === userId);
    return user ? user.name : "غير محدد";
  };

  const filteredActivities = activities?.filter(activity =>
    activity.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    activity.details?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, { label: string; className: string }> = {
      create_case: { label: "إنشاء قضية", className: "bg-green-100 text-green-800" },
      update_case: { label: "تحديث قضية", className: "bg-blue-100 text-blue-800" },
      delete_case: { label: "حذف قضية", className: "bg-red-100 text-red-800" },
      create_client: { label: "إنشاء عميل", className: "bg-green-100 text-green-800" },
      update_client: { label: "تحديث عميل", className: "bg-blue-100 text-blue-800" },
      delete_client: { label: "حذف عميل", className: "bg-red-100 text-red-800" },
      create_invoice: { label: "إنشاء فاتورة", className: "bg-green-100 text-green-800" },
      update_invoice: { label: "تحديث فاتورة", className: "bg-blue-100 text-blue-800" },
      delete_invoice: { label: "حذف فاتورة", className: "bg-red-100 text-red-800" },
      create_session: { label: "إنشاء جلسة", className: "bg-green-100 text-green-800" },
      update_session: { label: "تحديث جلسة", className: "bg-blue-100 text-blue-800" },
      delete_session: { label: "حذف جلسة", className: "bg-red-100 text-red-800" },
      create_task: { label: "إنشاء مهمة", className: "bg-green-100 text-green-800" },
      update_task: { label: "تحديث مهمة", className: "bg-blue-100 text-blue-800" },
      delete_task: { label: "حذف مهمة", className: "bg-red-100 text-red-800" },
      create_document: { label: "رفع مستند", className: "bg-green-100 text-green-800" },
      update_document: { label: "تحديث مستند", className: "bg-blue-100 text-blue-800" },
      delete_document: { label: "حذف مستند", className: "bg-red-100 text-red-800" },
      login: { label: "تسجيل دخول", className: "bg-purple-100 text-purple-800" },
      logout: { label: "تسجيل خروج", className: "bg-gray-100 text-gray-800" },
    };
    
    const config = actionMap[action] || { label: action, className: "bg-gray-100 text-gray-800" };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Define columns for DataTable
  const columns: DataTableColumn<ActivityType>[] = [
    {
      key: "action",
      label: "الإجراء",
      sortable: true,
      align: "center",
      render: (row) => getActionLabel(row.action),
    },
    {
      key: "userId",
      label: "المستخدم",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-blue-600" />
          <span>{getUserName(row.userId)}</span>
        </div>
      ),
    },
    {
      key: "details",
      label: "التفاصيل",
      sortable: true,
      render: (row) => row.details || "-",
    },
    {
      key: "createdAt",
      label: "التاريخ والوقت",
      sortable: true,
      align: "center",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-green-600" />
          <span>{row.createdAt ? formatDualDate(row.createdAt.toString()) : "-"}</span>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6 mt-6">
        {/* Search */}
        <div className="flex justify-between items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="البحث في النشاطات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>

        {/* Activity Table */}
        <Card>
          <CardHeader>
            <CardTitle>سجل النشاطات ({filteredActivities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredActivities}
                initialSort={{ key: "createdAt", direction: "desc" }}
                initialPageSize={20}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
