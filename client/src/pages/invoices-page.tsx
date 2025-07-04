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
import { Plus, Search, Edit, Trash2, DollarSign } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatDualDate } from "@/lib/utils";
import { type Invoice, type InsertInvoice, insertInvoiceSchema } from "@shared/schema";

export default function InvoicesPage() {
  const [open, setOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmPaidOpen, setConfirmPaidOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<Invoice | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: cases } = useQuery<any[]>({
    queryKey: ["/api/cases"],
  });

  const form = useForm<InsertInvoice>({
    resolver: zodResolver(insertInvoiceSchema),
    defaultValues: {
      caseId: undefined,
      amount: "",
      description: "",
      dueDate: "",
      paid: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertInvoice) => {
      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في إنشاء الفاتورة");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "تم إنشاء الفاتورة بنجاح" });
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({ title: "خطأ في إنشاء الفاتورة", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertInvoice> }) => {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في تحديث الفاتورة");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "تم تحديث الفاتورة بنجاح" });
      setOpen(false);
      form.reset();
      setEditingInvoice(null);
    },
    onError: (error) => {
      toast({ title: "خطأ في تحديث الفاتورة", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في حذف الفاتورة");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "تم حذف الفاتورة بنجاح" });
    },
    onError: (error) => {
      toast({ title: "خطأ في حذف الفاتورة", description: error.message, variant: "destructive" });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paid: true }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في تحديث حالة الفاتورة");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "تم تحديث حالة الفاتورة بنجاح" });
      setConfirmPaidOpen(false);
      setSelectedInvoice(null);
    },
    onError: (error) => {
      toast({ title: "خطأ في تحديث حالة الفاتورة", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertInvoice) => {
    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    form.reset({
      caseId: invoice.caseId || undefined,
      amount: invoice.amount.toString(),
      description: invoice.description || "",
      dueDate: invoice.dueDate ? new Date(invoice.dueDate).toISOString().split('T')[0] : "",
      paid: invoice.paid || false,
    });
    setOpen(true);
  };

  const handleDelete = (invoice: Invoice) => {
    setInvoiceToDelete(invoice);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (invoiceToDelete) {
      deleteMutation.mutate(invoiceToDelete.id);
      setDeleteModalOpen(false);
      setInvoiceToDelete(null);
    }
  };

  const handleMarkAsPaid = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setConfirmPaidOpen(true);
  };

  const confirmMarkAsPaid = () => {
    if (selectedInvoice) {
      markAsPaidMutation.mutate(selectedInvoice.id);
    }
  };

  const filteredInvoices = invoices?.filter(invoice =>
    invoice.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    invoice.amount.toString().includes(searchTerm) ||
    invoice.id.toString().includes(searchTerm)
  ) || [];

  const getCaseTitle = (caseId: number | null) => {
    if (!caseId) return "غير محدد";
    const caseItem = cases?.find(c => c.id === caseId);
    return caseItem?.title || "غير محدد";
  };

  const getStatusBadge = (paid: boolean | null) => {
    if (paid) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
          مدفوع
        </span>
      );
    } else {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          في الانتظار
        </span>
      );
    }
  };

  // Define columns for DataTable
  const columns: DataTableColumn<Invoice>[] = [
    {
      key: "id",
      label: "رقم الفاتورة",
      sortable: true,
      align: "center",
      render: (row) => <span className="font-medium">#{row.id}</span>,
    },
    {
      key: "caseId",
      label: "القضية",
      sortable: true,
      render: (row) => getCaseTitle(row.caseId),
    },
    {
      key: "amount",
      label: "المبلغ",
      sortable: true,
      align: "center",
      render: (row) => (
        <div className="flex items-center gap-1">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="font-medium">{row.amount} جنيه</span>
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
      key: "dueDate",
      label: "تاريخ الاستحقاق",
      sortable: true,
      align: "center",
      render: (row) => row.dueDate ? formatDualDate(row.dueDate.toString()) : "-",
    },
    {
      key: "paid",
      label: "الحالة",
      sortable: true,
      align: "center",
      render: (row) => getStatusBadge(row.paid),
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
          {!row.paid && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMarkAsPaid(row)}
            >
              تم الدفع
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
              placeholder="البحث في الفواتير..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingInvoice(null); form.reset(); }}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة فاتورة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingInvoice ? "تعديل الفاتورة" : "إضافة فاتورة جديدة"}
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
                        <Select onValueChange={(value) => field.onChange(value === "none" ? undefined : parseInt(value))} value={field.value?.toString() || "none"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر القضية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">غير محدد</SelectItem>
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>المبلغ</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" {...field} value={field.value || ''} />
                          </FormControl>
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
                        <FormLabel>الوصف</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="paid"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الحالة</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "true")} value={field.value?.toString() || "false"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر الحالة" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="false">في الانتظار</SelectItem>
                            <SelectItem value="true">مدفوع</SelectItem>
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
                      {editingInvoice ? "تحديث" : "إضافة"}
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

        {/* Invoices Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الفواتير ({filteredInvoices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredInvoices}
                initialSort={{ key: "id", direction: "desc" }}
                initialPageSize={10}
              />
            )}
          </CardContent>
        </Card>

        {/* Confirm Paid Modal */}
        <Dialog open={confirmPaidOpen} onOpenChange={setConfirmPaidOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>تأكيد الدفع</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p>هل أنت متأكد من أن الفاتورة رقم {selectedInvoice?.id} قد تم دفعها؟</p>
              <div className="flex gap-2">
                <Button
                  onClick={confirmMarkAsPaid}
                  disabled={markAsPaidMutation.isPending}
                  className="flex-1"
                >
                  {markAsPaidMutation.isPending ? "جاري التحديث..." : "تأكيد"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirmPaidOpen(false)}
                  className="flex-1"
                >
                  إلغاء
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          onConfirm={confirmDelete}
          title="حذف الفاتورة"
          description="هل أنت متأكد من حذف هذه الفاتورة؟ لا يمكن التراجع عن هذا الإجراء."
          itemName={`الفاتورة رقم ${invoiceToDelete?.id}`}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </Layout>
  );
}
