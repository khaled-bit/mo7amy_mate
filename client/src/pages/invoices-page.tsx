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
import { Plus, Search, Edit, Receipt, DollarSign, Calendar, CheckCircle, Clock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertInvoiceSchema, type Invoice, type InsertInvoice, type Case } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDualDate } from "@/lib/utils";

export default function InvoicesPage() {
  const [open, setOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: invoices, isLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const { data: cases } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const form = useForm<InsertInvoice>({
    resolver: zodResolver(insertInvoiceSchema),
    defaultValues: {
      caseId: undefined,
      amount: "",
      description: "",
      paid: false,
      dueDate: "",
      paidDate: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertInvoice) => {
      const res = await apiRequest("POST", "/api/invoices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setOpen(false);
      form.reset({
        caseId: undefined,
        amount: "",
        description: "",
        paid: false,
        dueDate: "",
        paidDate: "",
      });
      toast({ title: "تم إضافة الفاتورة بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في إضافة الفاتورة", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertInvoice> }) => {
      const res = await apiRequest("PUT", `/api/invoices/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setOpen(false);
      setEditingInvoice(null);
      form.reset({
        caseId: undefined,
        amount: "",
        description: "",
        paid: false,
        dueDate: "",
        paidDate: "",
      });
      toast({ title: "تم تحديث الفاتورة بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في تحديث الفاتورة", variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PUT", `/api/invoices/${id}`, {
        paid: true,
        paidDate: new Date().toISOString().split('T')[0]
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "تم تحديث حالة الدفع" });
    },
    onError: () => {
      toast({ title: "خطأ في تحديث الفاتورة", variant: "destructive" });
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
      caseId: invoice.caseId,
      amount: invoice.amount,
      description: invoice.description || "",
      paid: invoice.paid,
      dueDate: invoice.dueDate || "",
      paidDate: invoice.paidDate || "",
    });
    setOpen(true);
  };

  const handleMarkPaid = (id: number) => {
    if (confirm("هل تريد وضع علامة على هذه الفاتورة كمدفوعة؟")) {
      markPaidMutation.mutate(id);
    }
  };

  const filteredInvoices = invoices?.filter(invoice =>
    invoice.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getCaseTitle = (caseId: number) => {
    return cases?.find(c => c.id === caseId)?.title || "غير محدد";
  };

  const totalPending = filteredInvoices
    .filter(inv => !inv.paid)
    .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

  const totalPaid = filteredInvoices
    .filter(inv => inv.paid)
    .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

  return (
    <Layout>
      <Header title="إدارة الفواتير" subtitle="إنشاء ومتابعة الفواتير والمدفوعات" />
      
      <div className="space-y-6 mt-6">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">إجمالي الفواتير</p>
                  <p className="text-2xl font-bold">{filteredInvoices.length}</p>
                </div>
                <Receipt className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">المبالغ المعلقة</p>
                  <p className="text-2xl font-bold text-red-600">{totalPending.toLocaleString()} جنيه</p>
                </div>
                <Clock className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">المبالغ المدفوعة</p>
                  <p className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()} جنيه</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

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
              <Button onClick={() => { 
                setEditingInvoice(null); 
                form.reset({
                  caseId: undefined,
                  amount: "",
                  description: "",
                  paid: false,
                  dueDate: "",
                  paidDate: "",
                }); 
              }}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة فاتورة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
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
                        <Select onValueChange={(value) => field.onChange(value === "no-case" ? undefined : parseInt(value))} value={field.value?.toString() || "no-case"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر القضية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="no-case">غير مرتبطة بقضية</SelectItem>
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
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>المبلغ (جنيه)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" {...field} />
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
                        <FormLabel>الوصف</FormLabel>
                        <FormControl>
                          <Textarea {...field} value={field.value || ""} placeholder="وصف الخدمة أو الأتعاب..." />
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
                          <Input type="date" {...field} value={field.value || ""} />
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الفاتورة</TableHead>
                    <TableHead>القضية</TableHead>
                    <TableHead>المبلغ</TableHead>
                    <TableHead>الوصف</TableHead>
                    <TableHead>تاريخ الاستحقاق</TableHead>
                    <TableHead>حالة الدفع</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>لا توجد فواتير</p>
                        <p className="text-sm">ابدأ بإضافة فاتورة جديدة</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">#{invoice.id}</TableCell>
                        <TableCell>{getCaseTitle(invoice.caseId)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-muted-foreground" />
                            {parseFloat(invoice.amount).toLocaleString()} جنيه
                          </div>
                        </TableCell>
                        <TableCell>{invoice.description || "-"}</TableCell>
                        <TableCell>
                          {invoice.dueDate ? (
                            formatDualDate(invoice.dueDate)
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={invoice.paid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {invoice.paid ? "مدفوعة" : "معلقة"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(invoice)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            {!invoice.paid && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleMarkPaid(invoice.id)}
                                className="text-green-600 hover:text-green-700"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
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
