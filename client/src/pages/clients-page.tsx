import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { Plus, Search, Edit, Trash2, Phone, Mail, MapPin, FileText, Download, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type Client, type InsertClient } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDualDate } from "@/lib/utils";
import { Link, useLocation } from "wouter";

export default function ClientsPage() {
  const [open, setOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [deletionConstraints, setDeletionConstraints] = useState<any>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: clients, isLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: clientDocuments, isLoading: documentsLoading } = useQuery<any[]>({
    queryKey: ["/api/clients", selectedClient?.id, "documents"],
    queryFn: async () => {
      if (!selectedClient) return [];
      const response = await fetch(`/api/clients/${selectedClient.id}/documents`);
      if (!response.ok) throw new Error('Failed to fetch documents');
      return response.json();
    },
    enabled: !!selectedClient && documentsOpen,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache
  });

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      nationalId: "",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertClient) => {
      const res = await apiRequest("POST", "/api/clients", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setOpen(false);
      form.reset();
      toast({ title: "تم إضافة العميل بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في إضافة العميل", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertClient> }) => {
      const res = await apiRequest("PUT", `/api/clients/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      setOpen(false);
      setEditingClient(null);
      form.reset();
      toast({ title: "تم تحديث العميل بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في تحديث العميل", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/clients/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في حذف العميل");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: "تم حذف العميل بنجاح" });
    },
    onError: (error: any) => {
      toast({ 
        title: "خطأ في حذف العميل", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onSubmit = (data: InsertClient) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    form.reset({
      name: client.name,
      phone: client.phone || "",
      email: client.email || "",
      address: client.address || "",
      nationalId: client.nationalId || "",
      notes: client.notes || "",
    });
    setOpen(true);
  };

  const handleDelete = async (client: Client) => {
    try {
      // Check deletion constraints first
      const response = await fetch(`/api/clients/${client.id}/deletion-constraints`);
      const constraints = await response.json();
      
      if (!constraints.canDelete) {
        toast({ 
          title: "لا يمكن حذف العميل", 
          description: constraints.message,
          variant: "destructive" 
        });
        return;
      }
      
      setClientToDelete(client);
      setDeletionConstraints(constraints);
      setDeleteModalOpen(true);
    } catch (error) {
      toast({ 
        title: "خطأ في فحص قيود الحذف", 
        variant: "destructive" 
      });
    }
  };

  const confirmDelete = () => {
    if (clientToDelete) {
      deleteMutation.mutate(clientToDelete.id);
      setDeleteModalOpen(false);
      setClientToDelete(null);
      setDeletionConstraints(null);
    }
  };

  const handleViewDocuments = (client: Client) => {
    setSelectedClient(client);
    setDocumentsOpen(true);
  };

  const filteredClients = clients?.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone?.includes(searchTerm) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Define columns for DataTable
  const columns: DataTableColumn<Client>[] = [
    {
      key: "name",
      label: "اسم العميل",
      sortable: true,
      render: (row) => <span className="font-medium">{row.name}</span>,
    },
    {
      key: "phone",
      label: "رقم الهاتف",
      sortable: true,
      render: (row) => row.phone || "-",
    },
    {
      key: "email",
      label: "البريد الإلكتروني",
      sortable: true,
      render: (row) => row.email || "-",
    },
    {
      key: "nationalId",
      label: "الرقم القومي",
      sortable: true,
      render: (row) => row.nationalId || "-",
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
            variant="secondary"
            size="sm"
            onClick={() => handleViewDocuments(row)}
          >
            <FileText className="w-4 h-4" />
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
              placeholder="البحث في العملاء..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingClient(null); form.reset(); }}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة عميل جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingClient ? "تعديل العميل" : "إضافة عميل جديد"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>اسم العميل</FormLabel>
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
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>رقم الهاتف</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>البريد الإلكتروني</FormLabel>
                          <FormControl>
                            <Input type="email" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="nationalId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الرقم القومي</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>العنوان</FormLabel>
                          <FormControl>
                            <Textarea {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                      {editingClient ? "تحديث" : "إضافة"}
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

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة العملاء ({filteredClients.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredClients}
                initialSort={{ key: "name", direction: "asc" }}
                initialPageSize={10}
              />
            )}
          </CardContent>
        </Card>

        {/* Documents Modal */}
        <Dialog open={documentsOpen} onOpenChange={setDocumentsOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>
                مستندات العميل: {selectedClient?.name}
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {documentsLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : clientDocuments && clientDocuments.length > 0 ? (
                <div className="space-y-4">
                  {clientDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{doc.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          القضية: {doc.caseTitle || "غير محدد"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {doc.description || "لا يوجد وصف"}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(`/api/documents/${doc.id}/view`, '_blank')}
                        >
                          عرض
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => window.open(`/api/documents/${doc.id}/download`, '_blank')}
                        >
                          تحميل
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>لا توجد مستندات لهذا العميل</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          open={deleteModalOpen}
          onOpenChange={setDeleteModalOpen}
          onConfirm={confirmDelete}
          title="حذف العميل"
          description={
            deletionConstraints ? 
            `هل أنت متأكد من حذف هذا العميل؟ سيتم حذف:
            ${deletionConstraints.relatedCases > 0 ? `\n• ${deletionConstraints.relatedCases} قضية` : ''}
            ${deletionConstraints.relatedSessions > 0 ? `\n• ${deletionConstraints.relatedSessions} جلسة` : ''}
            ${deletionConstraints.relatedDocuments > 0 ? `\n• ${deletionConstraints.relatedDocuments} مستند` : ''}
            ${deletionConstraints.relatedInvoices > 0 ? `\n• ${deletionConstraints.relatedInvoices} فاتورة` : ''}
            ${deletionConstraints.relatedTasks > 0 ? `\n• ${deletionConstraints.relatedTasks} مهمة` : ''}
            \n\nلا يمكن التراجع عن هذا الإجراء.` :
            "هل أنت متأكد من حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء."
          }
          itemName={clientToDelete?.name}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </Layout>
  );
}
