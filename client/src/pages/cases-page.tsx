import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatDualDate } from "@/lib/utils";
import { type Case, type InsertCase, type Client, insertCaseSchema } from "@shared/schema";
import { Link, useLocation } from "wouter";

const statusMap = {
  active: { label: "نشطة", color: "bg-green-100 text-green-800" },
  pending: { label: "معلقة", color: "bg-yellow-100 text-yellow-800" },
  completed: { label: "مكتملة", color: "bg-blue-100 text-blue-800" },
  cancelled: { label: "ملغية", color: "bg-red-100 text-red-800" },
};

export default function CasesPage() {
  const [open, setOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [caseToDelete, setCaseToDelete] = useState<Case | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: cases, isLoading } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const { data: clients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const form = useForm<InsertCase>({
    resolver: zodResolver(insertCaseSchema),
    defaultValues: {
      title: "",
      type: "",
      status: "active",
      court: "",
      clientId: 0,
      startDate: "",
      endDate: "",
      description: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertCase) => {
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في إنشاء القضية");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({ title: "تم إنشاء القضية بنجاح" });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: "خطأ في إنشاء القضية", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCase> }) => {
      const response = await fetch(`/api/cases/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في تحديث القضية");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({ title: "تم تحديث القضية بنجاح" });
      setOpen(false);
      form.reset();
      setEditingCase(null);
    },
    onError: (error) => {
      toast({ title: "خطأ في تحديث القضية", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/cases/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في حذف القضية");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      toast({ title: "تم حذف القضية بنجاح" });
    },
    onError: (error) => {
      toast({ title: "خطأ في حذف القضية", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertCase) => {
    if (editingCase) {
      updateMutation.mutate({ id: editingCase.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (caseItem: Case) => {
    setEditingCase(caseItem);
    form.reset({
      title: caseItem.title,
      type: caseItem.type,
      status: caseItem.status,
      court: caseItem.court || "",
      clientId: caseItem.clientId,
      startDate: caseItem.startDate || "",
      endDate: caseItem.endDate || "",
      description: caseItem.description || "",
      notes: caseItem.notes || "",
    });
    setOpen(true);
  };

  const handleDelete = (caseItem: Case) => {
    setCaseToDelete(caseItem);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (caseToDelete) {
      deleteMutation.mutate(caseToDelete.id);
      setDeleteModalOpen(false);
      setCaseToDelete(null);
    }
  };

  const filteredCases = cases?.filter(caseItem =>
    caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caseItem.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caseItem.court?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getClientName = (clientId: number) => {
    return clients?.find(c => c.id === clientId)?.name || "غير محدد";
  };

  // Define columns for DataTable
  const columns: DataTableColumn<Case>[] = [
    {
      key: "title",
      label: "عنوان القضية",
      sortable: true,
      render: (row) => <span className="font-medium">{row.title}</span>,
    },
    {
      key: "type",
      label: "النوع",
      sortable: true,
    },
    {
      key: "clientId",
      label: "العميل",
      sortable: true,
      render: (row) => getClientName(row.clientId),
    },
    {
      key: "court",
      label: "المحكمة",
      sortable: true,
      render: (row) => row.court || "-",
    },
    {
      key: "status",
      label: "الحالة",
      sortable: true,
      align: "center",
      render: (row) => (
        <Badge className={statusMap[row.status].color}>
          {statusMap[row.status].label}
        </Badge>
      ),
    },
    {
      key: "startDate",
      label: "تاريخ البداية",
      sortable: true,
      align: "center",
      render: (row) => row.startDate ? formatDualDate(row.startDate) : "-",
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
          {user && (user.role === 'admin' || user.role === 'lawyer') && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setLocation(`/cases/${row.id}`)}
            >
              تشغيل التحليل الذكي
            </Button>
          )}
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
              placeholder="البحث في القضايا..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingCase(null); form.reset(); }}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة قضية جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingCase ? "تعديل القضية" : "إضافة قضية جديدة"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>عنوان القضية</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>نوع القضية</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="عقارية، تجارية، عمالية..." />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="clientId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>العميل</FormLabel>
                          <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر العميل" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {clients?.map((client) => (
                                <SelectItem key={client.id} value={client.id.toString()}>
                                  {client.name}
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
                              <SelectItem value="active">نشطة</SelectItem>
                              <SelectItem value="pending">معلقة</SelectItem>
                              <SelectItem value="completed">مكتملة</SelectItem>
                              <SelectItem value="cancelled">ملغية</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="court"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المحكمة</FormLabel>
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
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ البداية</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>تاريخ الانتهاء</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} value={field.value || ''} />
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
                        <FormLabel>وصف القضية</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ملاحظات</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ''} />
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
                      {editingCase ? "تحديث" : "إضافة"}
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

        {/* Cases Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة القضايا ({filteredCases.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredCases}
                initialSort={{ key: "title", direction: "asc" }}
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
          title="حذف القضية"
          description="هل أنت متأكد من حذف هذه القضية؟ لا يمكن التراجع عن هذا الإجراء."
          itemName={caseToDelete?.title}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </Layout>
  );
}
