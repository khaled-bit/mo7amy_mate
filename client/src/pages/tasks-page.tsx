import Layout from "@/components/layout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { Plus, Search, Edit, Trash2, Calendar, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatDualDate } from "@/lib/utils";
import { type Task, type InsertTask, insertTaskSchema } from "@shared/schema";

export default function TasksPage() {
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const { data: cases } = useQuery<any[]>({
    queryKey: ["/api/cases"],
  });

  const form = useForm<InsertTask>({
    resolver: zodResolver(insertTaskSchema),
    defaultValues: {
      caseId: null,
      title: "",
      description: "",
      dueDate: "",
      priority: "medium",
      status: "pending",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertTask) => {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في إنشاء المهمة");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "تم إنشاء المهمة بنجاح" });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: "خطأ في إنشاء المهمة", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertTask> }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في تحديث المهمة");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "تم تحديث المهمة بنجاح" });
      setOpen(false);
      form.reset();
      setEditingTask(null);
    },
    onError: (error) => {
      toast({ title: "خطأ في تحديث المهمة", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في حذف المهمة");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "تم حذف المهمة بنجاح" });
    },
    onError: (error) => {
      toast({ title: "خطأ في حذف المهمة", description: error.message, variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في تحديث حالة المهمة");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "تم تحديث حالة المهمة بنجاح" });
    },
    onError: (error) => {
      toast({ title: "خطأ في تحديث حالة المهمة", description: error.message, variant: "destructive" });
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
      caseId: task.caseId,
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : "",
      priority: task.priority,
      status: task.status,
    });
    setOpen(true);
  };

  const handleDelete = (task: Task) => {
    setTaskToDelete(task);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      deleteMutation.mutate(taskToDelete.id);
      setDeleteModalOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleToggleStatus = (task: Task) => {
    const newStatus = task.status === "completed" ? "pending" : "completed";
    toggleStatusMutation.mutate({ id: task.id, status: newStatus });
  };

  const filteredTasks = tasks?.filter(task =>
    task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    task.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getCaseTitle = (caseId: number | null) => {
    if (!caseId) return "غير محدد";
    const caseItem = cases?.find(c => c.id === caseId);
    return caseItem?.title || "غير محدد";
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: Record<string, { label: string; className: string }> = {
      low: { label: "منخفض", className: "bg-green-100 text-green-800" },
      medium: { label: "متوسط", className: "bg-yellow-100 text-yellow-800" },
      high: { label: "عالي", className: "bg-red-100 text-red-800" },
    };
    const config = priorityConfig[priority] || priorityConfig.medium;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string }> = {
      pending: { label: "في الانتظار", className: "bg-yellow-100 text-yellow-800" },
      completed: { label: "مكتمل", className: "bg-green-100 text-green-800" },
      overdue: { label: "متأخر", className: "bg-red-100 text-red-800" },
    };
    const config = statusConfig[status] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  // Define columns for DataTable
  const columns: DataTableColumn<Task>[] = [
    {
      key: "title",
      label: "عنوان المهمة",
      sortable: true,
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "caseId",
      label: "القضية",
      sortable: true,
      render: (row) => getCaseTitle(row.caseId),
    },
    {
      key: "priority",
      label: "الأولوية",
      sortable: true,
      align: "center",
      render: (row) => getPriorityBadge(row.priority ?? "medium"),
    },
    {
      key: "status",
      label: "الحالة",
      sortable: true,
      align: "center",
      render: (row) => getStatusBadge(row.status),
    },
    {
      key: "dueDate",
      label: "تاريخ الاستحقاق",
      sortable: true,
      align: "center",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>{row.dueDate ? formatDualDate(row.dueDate.toString()) : "-"}</span>
        </div>
      ),
    },
    {
      key: "description",
      label: "الوصف",
      sortable: true,
      render: (row) => row.description || "-",
    },
    {
      key: "createdAt",
      label: "تاريخ الإنشاء",
      sortable: true,
      align: "center",
      render: (row) => row.createdAt ? formatDualDate(row.createdAt.toString()) : "-",
    },
    {
      key: "id",
      label: "الإجراءات",
      sortable: false,
      align: "center",
      render: (row) => (
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => handleEdit(row)}
          >
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant={row.status === "completed" ? "outline" : "secondary"}
            size="sm"
            onClick={() => handleToggleStatus(row)}
          >
            {row.status === "completed" ? (
              <Clock className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(row)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout>
      <div className="space-y-6 mt-6">
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
                    name="caseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>القضية</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر القضية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">غير محدد</SelectItem>
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


                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان المهمة</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
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
                          <Select onValueChange={(value: string) => field.onChange(value)} defaultValue={field.value ?? "pending"}>
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
                          <Select onValueChange={(value: string) => field.onChange(value)} defaultValue={field.value ?? "medium"}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الأولوية" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">منخفض</SelectItem>
                              <SelectItem value="medium">متوسط</SelectItem>
                              <SelectItem value="high">عالي</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                                          <FormField
                        control={form.control}
                        name="dueDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>تاريخ الاستحقاق</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} value={field.value ?? ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الوصف</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الحالة</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value ?? ''}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pending">في الانتظار</SelectItem>
                            <SelectItem value="completed">مكتمل</SelectItem>
                            <SelectItem value="overdue">متأخر</SelectItem>
                          </SelectContent>
                        </Select>
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
              <DataTable
                columns={columns}
                data={filteredTasks}
                initialSort={{ key: "dueDate", direction: "asc" }}
                initialPageSize={10}
              />
            )}
          </CardContent>
        </Card>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          onConfirm={confirmDelete}
          title="حذف المهمة"
          description="هل أنت متأكد من حذف هذه المهمة؟ لا يمكن التراجع عن هذا الإجراء."
          itemName={taskToDelete?.title}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </Layout>
  );
}
