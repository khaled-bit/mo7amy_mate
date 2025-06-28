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
import { Plus, Search, Edit, Trash2, Briefcase } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { insertCaseSchema, type Case, type InsertCase, type Client } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();

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
      const res = await apiRequest("POST", "/api/cases", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setOpen(false);
      form.reset();
      toast({ title: "تم إضافة القضية بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في إضافة القضية", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertCase> }) => {
      const res = await apiRequest("PUT", `/api/cases/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cases"] });
      setOpen(false);
      setEditingCase(null);
      form.reset();
      toast({ title: "تم تحديث القضية بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في تحديث القضية", variant: "destructive" });
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

  const filteredCases = cases?.filter(caseItem =>
    caseItem.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caseItem.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    caseItem.court?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getClientName = (clientId: number) => {
    return clients?.find(c => c.id === clientId)?.name || "غير محدد";
  };

  return (
    <Layout>
      <Header title="إدارة القضايا" subtitle="إدارة القضايا القانونية ومتابعتها" />
      
      <div className="space-y-6">
        {/* Search and Add */}
        <div className="flex justify-between items-center">
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
                          <Input {...field} />
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
                            <Input type="date" {...field} />
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
                            <Input type="date" {...field} />
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
                          <Textarea {...field} />
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
                          <Textarea {...field} />
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>عنوان القضية</TableHead>
                    <TableHead>النوع</TableHead>
                    <TableHead>العميل</TableHead>
                    <TableHead>المحكمة</TableHead>
                    <TableHead>الحالة</TableHead>
                    <TableHead>تاريخ البداية</TableHead>
                    <TableHead>الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>لا توجد قضايا</p>
                        <p className="text-sm">ابدأ بإضافة قضية جديدة</p>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCases.map((caseItem) => (
                      <TableRow key={caseItem.id}>
                        <TableCell className="font-medium">{caseItem.title}</TableCell>
                        <TableCell>{caseItem.type}</TableCell>
                        <TableCell>{getClientName(caseItem.clientId)}</TableCell>
                        <TableCell>{caseItem.court || "-"}</TableCell>
                        <TableCell>
                          <Badge className={statusMap[caseItem.status].color}>
                            {statusMap[caseItem.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {caseItem.startDate ? new Date(caseItem.startDate).toLocaleDateString('ar-SA') : "-"}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleEdit(caseItem)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
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
