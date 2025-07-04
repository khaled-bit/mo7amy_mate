import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { FileText, Upload, Download, Trash2, Search, Plus, Edit, Eye } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { formatDualDate } from "@/lib/utils";
import { type Document, type Case, type InsertDocument, insertDocumentSchema } from "@shared/schema";

const uploadSchema = z.object({
  caseId: z.number().min(1, "يجب اختيار القضية"),
  title: z.string().min(1, "عنوان المستند مطلوب"),
  description: z.string().optional(),
  file: z.any().refine((file) => file?.length == 1, "يجب اختيار ملف"),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export default function DocumentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<Document | null>(null);

  const form = useForm<InsertDocument>({
    resolver: zodResolver(insertDocumentSchema),
    defaultValues: {
      caseId: null,
      title: "",
      description: "",
      fileType: "",
      fileSize: 0,
    },
  });

  // Fetch documents
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    enabled: !!user,
  });

  // Fetch cases for dropdown
  const { data: cases = [] } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
    enabled: !!user,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (data: InsertDocument) => {
      const formData = new FormData();
      formData.append("caseId", data.caseId?.toString() || "");
      formData.append("title", data.title);
      formData.append("description", data.description || "");
      formData.append("fileType", data.fileType);
      formData.append("fileSize", data.fileSize.toString());
      
      if (selectedFile) {
        formData.append("file", selectedFile);
      }

      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في إنشاء المستند");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "تم إنشاء المستند بنجاح" });
      setOpen(false);
      form.reset();
      setSelectedFile(null);
    },
    onError: (error) => {
      toast({ title: "خطأ في إنشاء المستند", description: error.message, variant: "destructive" });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/documents/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "فشل في حذف المستند");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "تم حذف المستند بنجاح" });
    },
    onError: (error) => {
      toast({ title: "خطأ في حذف المستند", description: error.message, variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertDocument) => {
    if (editingDocument) {
      uploadMutation.mutate({ ...data, id: editingDocument.id });
    } else {
      uploadMutation.mutate(data);
    }
  };

  const handleEdit = (document: Document) => {
    setEditingDocument(document);
    form.reset({
      caseId: document.caseId,
      title: document.title,
      description: document.description || "",
      fileType: document.fileType || "",
      fileSize: document.fileSize || 0,
    });
    setOpen(true);
  };

  const handleDelete = (document: Document) => {
    setDocumentToDelete(document);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (documentToDelete) {
      deleteMutation.mutate(documentToDelete.id);
      setDeleteModalOpen(false);
      setDocumentToDelete(null);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      form.setValue("fileType", file.type);
      form.setValue("fileSize", file.size);
    }
  };

  const getCaseTitle = (caseId: number | null) => {
    if (!caseId) return "غير محدد";
    const caseItem = cases.find(c => c.id === caseId);
    return caseItem?.title || "غير محدد";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <FileText className="w-4 h-4" />;
    
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4 text-red-600" />;
    if (fileType.includes('doc')) return <FileText className="w-4 h-4 text-blue-600" />;
    if (fileType.includes('image')) return <FileText className="w-4 h-4 text-green-600" />;
    return <FileText className="w-4 h-4 text-gray-600" />;
  };

  // Filter documents based on search term
  const filteredDocuments = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    getCaseTitle(doc.caseId).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Define columns for DataTable
  const columns: DataTableColumn<Document>[] = [
    {
      key: "title",
      label: "عنوان المستند",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2">
          {getFileIcon(row.fileType)}
          <span className="font-medium">{row.title}</span>
        </div>
      ),
    },
    {
      key: "caseId",
      label: "القضية",
      sortable: true,
      render: (row) => getCaseTitle(row.caseId),
    },
    {
      key: "fileType",
      label: "نوع الملف",
      sortable: true,
      align: "center",
      render: (row) => row.fileType || "-",
    },
    {
      key: "fileSize",
      label: "حجم الملف",
      sortable: true,
      align: "center",
      render: (row) => formatFileSize(row.fileSize || 0),
    },
    {
      key: "description",
      label: "الوصف",
      sortable: true,
      render: (row) => row.description || "-",
    },
    {
      key: "uploadedAt",
      label: "تاريخ الرفع",
      sortable: true,
      align: "center",
      render: (row) => row.uploadedAt ? formatDualDate(row.uploadedAt.toString()) : "-",
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
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/documents/${row.id}/view`, '_blank')}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.open(`/api/documents/${row.id}/download`, '_blank')}
          >
            <Download className="w-4 h-4" />
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
              placeholder="البحث في المستندات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingDocument(null); form.reset(); setSelectedFile(null); }}>
                <Plus className="w-4 h-4 ml-2" />
                إضافة مستند جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingDocument ? "تعديل المستند" : "إضافة مستند جديد"}
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
                        <FormLabel>عنوان المستند</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ''} />
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
                          <Textarea {...field} value={field.value ?? ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {!editingDocument && (
                    <FormField
                      control={form.control}
                      name="fileType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الملف</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Input
                                type="file"
                                onChange={handleFileChange}
                                className="flex-1"
                              />
                              <Upload className="w-4 h-4 text-muted-foreground" />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={uploadMutation.isPending}
                      className="flex-1"
                    >
                      {editingDocument ? "تحديث" : "إضافة"}
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

        {/* Documents Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة المستندات ({filteredDocuments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredDocuments}
                initialSort={{ key: "uploadedAt", direction: "desc" }}
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
          title="حذف المستند"
          description="هل أنت متأكد من حذف هذا المستند؟ لا يمكن التراجع عن هذا الإجراء."
          itemName={documentToDelete?.title}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </Layout>
  );
}
