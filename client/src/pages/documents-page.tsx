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
import { Plus, Search, Download, Trash2, FileText, Upload, File } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { type Document, type Case } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const uploadSchema = z.object({
  caseId: z.number().min(1, "يجب اختيار القضية"),
  title: z.string().min(1, "عنوان المستند مطلوب"),
  description: z.string().optional(),
  file: z.any().refine((file) => file?.length == 1, "يجب اختيار ملف"),
});

type UploadFormData = z.infer<typeof uploadSchema>;

export default function DocumentsPage() {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: cases } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const form = useForm<UploadFormData>({
    resolver: zodResolver(uploadSchema),
    defaultValues: {
      caseId: 0,
      title: "",
      description: "",
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: data,
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setOpen(false);
      form.reset();
      toast({ title: "تم رفع المستند بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في رفع المستند", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "تم حذف المستند بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في حذف المستند", variant: "destructive" });
    },
  });

  const onSubmit = (data: UploadFormData) => {
    const formData = new FormData();
    formData.append("caseId", data.caseId.toString());
    formData.append("title", data.title);
    if (data.description) {
      formData.append("description", data.description);
    }
    formData.append("file", data.file[0]);
    
    uploadMutation.mutate(formData);
  };

  const handleDelete = (id: number) => {
    if (confirm("هل أنت متأكد من حذف هذا المستند؟")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredDocuments = documents?.filter(doc =>
    doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getCaseTitle = (caseId: number) => {
    return cases?.find(c => c.id === caseId)?.title || "غير محدد";
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "-";
    const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string | null) => {
    if (!fileType) return <File className="w-4 h-4" />;
    
    if (fileType.includes('pdf')) return <FileText className="w-4 h-4 text-red-600" />;
    if (fileType.includes('word') || fileType.includes('document')) return <FileText className="w-4 h-4 text-blue-600" />;
    if (fileType.includes('image')) return <File className="w-4 h-4 text-green-600" />;
    
    return <File className="w-4 h-4" />;
  };

  return (
    <Layout>
      <Header title="إدارة المستندات" subtitle="رفع وإدارة مستندات القضايا" />
      
      <div className="space-y-6">
        {/* Search and Add */}
        <div className="flex justify-between items-center">
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
              <Button onClick={() => form.reset()}>
                <Upload className="w-4 h-4 ml-2" />
                رفع مستند جديد
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>رفع مستند جديد</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="caseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>القضية</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="اختر القضية" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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
                        <FormLabel>الوصف (اختياري)</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="file"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>الملف</FormLabel>
                        <FormControl>
                          <Input
                            type="file"
                            onChange={(e) => field.onChange(e.target.files)}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex gap-2">
                    <Button 
                      type="submit" 
                      disabled={uploadMutation.isPending}
                      className="flex-1"
                    >
                      رفع المستند
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>اسم المستند</TableHead>
                    <TableHead>القضية</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>الحجم</TableHead>
                    <TableHead>تاريخ الرفع</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>لا توجد مستندات</p>
                        <p className="text-sm">ابدأ برفع مستند جديد</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredDocuments.map((document) => (
                      <TableRow key={document.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getFileIcon(document.fileType)}
                            <div>
                              <p className="font-medium">{document.title}</p>
                              {document.description && (
                                <p className="text-sm text-muted-foreground">{document.description}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{getCaseTitle(document.caseId)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {document.fileType?.split('/').pop()?.toUpperCase() || 'غير محدد'}
                          </Badge>
                        </TableCell>
                        <TableCell>{formatFileSize(document.fileSize)}</TableCell>
                        <TableCell>
                          {document.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString('ar-SA') : "-"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => window.open(document.filePath)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(document.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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
