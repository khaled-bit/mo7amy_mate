import Layout from "@/components/layout";
import Header from "@/components/header";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Edit, CheckSquare, Clock, AlertCircle, User, Calendar } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertTaskSchema, type Task, type InsertTask, type Case, type User as UserType } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { formatDualDate } from "@/lib/utils";

const statusMap = {
  pending: { label: "معلقة", color: "bg-gray-100 text-gray-800", icon: Clock },
  in_progress: { label: "قيد التنفيذ", color: "bg-blue-100 text-blue-800", icon: AlertCircle },
  completed: { label: "مكتملة", color: "bg-green-100 text-green-800", icon: CheckSquare },
  cancelled: { label: "ملغية", color: "bg-red-100 text-red-800", icon: AlertCircle },
};

const priorityMap = {
  low: { label: "منخفضة", color: "bg-gray-100 text-gray-800" },
  medium: { label: "متوسطة", color: "bg-yellow-100 text-yellow-800" },
  high: { label: "عالية", color: "bg-red-100 text-red-800" },
};

export default function TasksPage() {
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: cases } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const { data: users } = useQuery<UserType[]>({
    queryKey: ["/api/users"],
    enabled: user?.role === 'admin',
  });

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "pending",
      priority: "medium",
      assignedTo: undefined,
      caseId: undefined,
      dueDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setOpen(false);
      form.reset();
      toast({ title: "تم إضافة المهمة بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في إضافة المهمة", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertTask> }) => {
      const res = await apiRequest("PUT", `/api/tasks/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setOpen(false);
      setEditingTask(null);
      form.reset();
      toast({ title: "تم تحديث المهمة بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في تحديث المهمة", variant: "destructive" });
    },
  });

  const markCompletedMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/tasks/${id}`, {
        status: "completed",
        completedAt: new Date().toISOString()
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "تم إنجاز المهمة" });
    },
    onError: () => {
      toast({ title: "خطأ في تحديث المهمة", variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertTask) => {
    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    form.reset({
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: task.priority || "medium",
      assignedTo: task.assignedTo || undefined,
      caseId: task.caseId || undefined,
      dueDate: task.dueDate || "",
    });
    setOpen(true);
  };

  const handleMarkCompleted = (id: number) => {
    markCompletedMutation.mutate(id);
  };

  const filteredTasks = tasks?.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getCaseTitle = (caseId: number | null) => {
    if (!caseId) return "-";
    return cases?.find(c => c.id === caseId)?.title || "غير محدد";
  };

  const getUserName = (userId: number | null) => {
    if (!userId) return "غير محدد";
    return users?.find(u => u.id === userId)?.name || "غير محدد";
  };

  const pendingTasks = filteredTasks.filter(t => t.status === 'pending').length;
  const inProgressTasks = filteredTasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = filteredTasks.filter(t => t.status === 'completed').length;

  return (
    <Layout>
      <Header title="إدارة المهام" subtitle="إنشاء وتتبع المهام والأعمال" />
      
      <div className="space-y-6 mt-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">إجمالي المهام</p>
                  <p className="text-2xl font-bold">{filteredTasks.length}</p>
                </div>
                <CheckSquare className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">معلقة</p>
                  <p className="text-2xl font-bold text-gray-600">{pendingTasks}</p>
                </div>
                <Clock className="w-8 h-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">قيد التنفيذ</p>
                  <p className="text-2xl font-bold text-blue-600">{inProgressTasks}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">مكتملة</p>
                  <p className="text-2xl font-bold text-green-600">{completedTasks}</p>
                </div>
                <CheckSquare className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Add */}
        <div className="flex justify-between items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="البحث في المهام..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingTask(null); form.reset(); }}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة مهمة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTask ? "تعديل المهمة" : "إضافة مهمة جديدة"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان المهمة</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>وصف المهمة</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الحالة</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الحالة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pending">معلقة</SelectItem>
                              <SelectItem value="in_progress">قيد التنفيذ</SelectItem>
                              <SelectItem value="completed">مكتملة</SelectItem>
                              <SelectItem value="cancelled">ملغية</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الأولوية</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الأولوية" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">منخفضة</SelectItem>
                              <SelectItem value="medium">متوسطة</SelectItem>
                              <SelectItem value="high">عالية</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {user?.role === 'admin' && (
                      <FormField
                        control={form.control}
                        name="assignedTo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>مسند إلى</FormLabel>
                            <Select onValueChange={(value) => field.onChange(value === "unassigned" ? undefined : parseInt(value))} value={field.value?.toString() || "unassigned"}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="اختر المستخدم" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="unassigned">غير محدد</SelectItem>
                                {users?.map((userItem) => (
                                  <SelectItem key={userItem.id} value={userItem.id.toString()}>
                                    {userItem.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="caseId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>القضية المرتبطة (اختياري)</FormLabel>
                          <Select onValueChange={(value) => field.onChange(value === "no-case" ? undefined : parseInt(value))} value={field.value?.toString() || "no-case"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر القضية" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="no-case">غير مرتبطة</SelectItem>
                              {cases?.map((caseItem) => (
                                <SelectItem key={caseItem.id} value={caseItem.id.toString()}>
                                  {caseItem.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>تاريخ الاستحقاق</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending || updateMutation.isPending}
                      className="flex-1"
                    >
                      {editingTask ? "تحديث" : "إضافة"}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setOpen(false)}
                      className="flex-1"
                    >
                      إلغاء
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tasks Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة المهام ({filteredTasks.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>عنوان المهمة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>الأولوية</TableHead>
                    <TableHead>مسند إلى</TableHead>
                    <TableHead>القضية</TableHead>
                    <TableHead>تاريخ الاستحقاق</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <CheckSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>لا توجد مهام</p>
                        <p className="text-sm">ابدأ بإضافة مهمة جديدة</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTasks.map((task) => {
                      const StatusIcon = statusMap[task.status].icon;
                      return (
                        <TableRow key={task.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{task.title}</p>
                              {task.description && (
                                <p className="text-sm text-muted-foreground truncate max-w-xs">
                                  {task.description}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={statusMap[task.status].color}>
                              <StatusIcon className="w-3 h-3 ml-1" />
                              {statusMap[task.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={priorityMap[task.priority || 'medium'].color}>
                              {priorityMap[task.priority || 'medium'].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              {getUserName(task.assignedTo)}
                            </div>
                          </TableCell>
                          <TableCell>{getCaseTitle(task.caseId)}</TableCell>
                          <TableCell>
                            {task.dueDate ? (
                              formatDualDate(task.dueDate)
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEdit(task)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              {task.status !== 'completed' && (
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleMarkCompleted(task.id)}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <CheckSquare className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
