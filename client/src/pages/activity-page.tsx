import Layout from "@/components/layout";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, History, User, FileText, Users, Briefcase, Calendar, Receipt, CheckSquare } from "lucide-react";
import { type ActivityLog } from "@shared/schema";
import { formatDualDate } from "@/lib/utils";

const actionIcons = {
  login: User,
  logout: User,
  register: User,
  create_client: Users,
  update_client: Users,
  delete_client: Users,
  create_case: Briefcase,
  update_case: Briefcase,
  create_session: Calendar,
  upload_document: FileText,
  create_invoice: Receipt,
  create_task: CheckSquare,
  create_user: User,
};

const actionColors = {
  login: "bg-green-100 text-green-800",
  logout: "bg-gray-100 text-gray-800",
  register: "bg-blue-100 text-blue-800",
  create_client: "bg-purple-100 text-purple-800",
  update_client: "bg-purple-100 text-purple-800",
  delete_client: "bg-red-100 text-red-800",
  create_case: "bg-blue-100 text-blue-800",
  update_case: "bg-blue-100 text-blue-800",
  create_session: "bg-yellow-100 text-yellow-800",
  upload_document: "bg-indigo-100 text-indigo-800",
  create_invoice: "bg-green-100 text-green-800",
  create_task: "bg-orange-100 text-orange-800",
  create_user: "bg-red-100 text-red-800",
};

export default function ActivityPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAction, setSelectedAction] = useState("all");
  const [limit, setLimit] = useState("50");

  const { data: activities, isLoading } = useQuery<ActivityLog[]>({
    queryKey: ["/api/activity", { limit: parseInt(limit) }],
    queryFn: async () => {
      const res = await fetch(`/api/activity?limit=${limit}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch activities");
      return res.json();
    },
  });

  const filteredActivities = activities?.filter(activity => {
    const matchesSearch = activity.details?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = selectedAction === "all" || activity.action === selectedAction;
    return matchesSearch && matchesAction;
  }) || [];

  const getActionIcon = (action: string) => {
    const Icon = actionIcons[action as keyof typeof actionIcons] || History;
    return Icon;
  };

  const getActionColor = (action: string) => {
    return actionColors[action as keyof typeof actionColors] || "bg-gray-100 text-gray-800";
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

  const activityStats = {
    total: filteredActivities.length,
    today: filteredActivities.filter(a => {
      const activityDate = new Date(a.createdAt!).toDateString();
      const today = new Date().toDateString();
      return activityDate === today;
    }).length,
    thisWeek: filteredActivities.filter(a => {
      const activityDate = new Date(a.createdAt!);
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return activityDate >= oneWeekAgo;
    }).length,
  };

  const uniqueActions = [...new Set(activities?.map(a => a.action) || [])];

  return (
    <Layout>
      <div className="space-y-6 mt-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">إجمالي الأنشطة</p>
                  <p className="text-2xl font-bold">{activityStats.total}</p>
                </div>
                <History className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">أنشطة اليوم</p>
                  <p className="text-2xl font-bold text-green-600">{activityStats.today}</p>
                </div>
                <Calendar className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">هذا الأسبوع</p>
                  <p className="text-2xl font-bold text-purple-600">{activityStats.thisWeek}</p>
                </div>
                <CheckSquare className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>فلترة الأنشطة</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-end">
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">البحث</label>
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="البحث في الأنشطة..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-10"
                  />
                </div>
              </div>
              
              <div className="flex-1">
                <label className="text-sm font-medium mb-2 block">نوع النشاط</label>
                <Select value={selectedAction} onValueChange={setSelectedAction}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر نوع النشاط" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">جميع الأنشطة</SelectItem>
                    {uniqueActions.map((action) => (
                      <SelectItem key={action} value={action}>
                        {action}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-32">
                <label className="text-sm font-medium mb-2 block">عدد النتائج</label>
                <Select value={limit} onValueChange={setLimit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Activity Log */}
        <Card>
          <CardHeader>
            <CardTitle>سجل الأنشطة ({filteredActivities.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>لا توجد أنشطة</p>
                <p className="text-sm">لم يتم تسجيل أي نشاط بعد</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredActivities.map((activity) => {
                  const Icon = getActionIcon(activity.action);
                  return (
                    <div key={activity.id} className="flex items-start gap-4 p-4 border border-gray-100 rounded-lg hover:border-gray-200 transition-colors">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-5 h-5 text-gray-600" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getActionColor(activity.action)}>
                            {activity.action}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTimeAgo(activity.createdAt!)}
                          </span>
                        </div>
                        
                        <p className="text-sm font-medium text-gray-900 mb-1">
                          {activity.details || "نشاط غير محدد"}
                        </p>
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>المستخدم: {activity.userId || "النظام"}</span>
                          <span>النوع: {activity.targetType}</span>
                          <span>المعرف: #{activity.targetId}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground text-left">
                        {new Date(activity.createdAt!).toLocaleString('ar-SA')}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
