import Layout from "@/components/layout";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DeleteConfirmationModal } from "@/components/ui/delete-confirmation-modal";
import { Plus, Search, Edit, Trash2, Calendar, Clock, MapPin, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertSessionSchema, type Session, type InsertSession, type Case } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDualDate } from "@/lib/utils";

const statusMap = {
  scheduled: { label: "مجدولة", color: "bg-blue-100 text-blue-800" },
  completed: { label: "مكتملة", color: "bg-green-100 text-green-800" },
  cancelled: { label: "ملغية", color: "bg-red-100 text-red-800" },
  postponed: { label: "مؤجلة", color: "bg-yellow-100 text-yellow-800" },
};

export default function SessionsPage() {
  const [open, setOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [conflictWarning, setConflictWarning] = useState("");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading } = useQuery<Session[]>({
    queryKey: ["/api/sessions"],
  });

  const { data: cases } = useQuery<Case[]>({
    queryKey: ["/api/cases"],
  });

  const form = useForm<InsertSession>({
    resolver: zodResolver(insertSessionSchema),
    defaultValues: {
      caseId: 0,
      title: "",
      date: "",
      time: "",
      location: "",
      status: "scheduled",
      notes: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertSession) => {
      const res = await apiRequest("POST", "/api/sessions", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setOpen(false);
      form.reset();
      setConflictWarning("");
      toast({ title: "تم إضافة الجلسة بنجاح" });
    },
    onError: (error: any) => {
      if (error.message.includes("409")) {
        setConflictWarning("يوجد تعارض في المواعيد. يرجى اختيار وقت آخر.");
      } else {
        toast({ title: "خطأ في إضافة الجلسة", variant: "destructive" });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertSession> }) => {
      const res = await apiRequest("PUT", `/api/sessions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      setOpen(false);
      setEditingSession(null);
      form.reset();
      setConflictWarning("");
      toast({ title: "تم تحديث الجلسة بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في تحديث الجلسة", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/sessions/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sessions"] });
      toast({ title: "تم حذف الجلسة بنجاح" });
    },
    onError: () => {
      toast({ title: "خطأ في حذف الجلسة", variant: "destructive" });
    },
  });

  const onSubmit = (data: InsertSession) => {
    if (editingSession) {
      updateMutation.mutate({ id: editingSession.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    form.reset({
      caseId: session.caseId,
      title: session.title,
      date: session.date,
      time: session.time,
      location: session.location || "",
      status: session.status,
      notes: session.notes || "",
    });
    setOpen(true);
  };

  const handleDelete = (session: Session) => {
    setSessionToDelete(session);
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (sessionToDelete) {
      deleteMutation.mutate(sessionToDelete.id);
      setDeleteModalOpen(false);
      setSessionToDelete(null);
    }
  };

  const filteredSessions = sessions?.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.location?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const getCaseTitle = (caseId: number) => {
    return cases?.find(c => c.id === caseId)?.title || "غير محدد";
  };

  // Define columns for DataTable
  const columns: DataTableColumn<Session>[] = [
    {
      key: "title",
      label: "عنوان الجلسة",
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
      key: "date",
      label: "التاريخ",
      sortable: true,
      align: "center",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span>{row.date ? formatDualDate(row.date.toString()) : "-"}</span>
        </div>
      ),
    },
    {
      key: "time",
      label: "الوقت",
      sortable: true,
      align: "center",
      render: (row) => (
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-green-600" />
          <span>{row.time || "-"}</span>
        </div>
      ),
    },
    {
      key: "location",
      label: "الموقع",
      sortable: true,
      render: (row) => (
        row.location ? (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            {row.location}
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )
      ),
    },
    {
      key: "status",
      label: "الحالة",
      sortable: true,
      render: (row) => (
        <Badge className={statusMap[row.status].color}>
          {statusMap[row.status].label}
        </Badge>
      ),
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
              placeholder="البحث في الجلسات..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>
          
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { 
                setEditingSession(null); 
                form.reset(); 
                setConflictWarning(""); 
              }}>
                <Plus className="w-4 h-4 ml-2" />
                جدولة جلسة جديدة
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingSession ? "تعديل الجلسة" : "جدولة جلسة جديدة"}
                </DialogTitle>
              </DialogHeader>
              
              {conflictWarning && (
                <Alert className="border-yellow-200 bg-yellow-50">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    {conflictWarning}
                  </AlertDescription>
                </Alert>
              )}

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>عنوان الجلسة</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="جلسة محكمة، اجتماع عميل..." />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="caseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>القضية المرتبطة</FormLabel>
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

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>التاريخ</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الوقت</FormLabel>
                          <FormControl>
                            <Input type="time" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>الموقع</FormLabel>
                          <FormControl>
                            <Input {...field} value={field.value || ''} placeholder="محكمة الرياض، المكتب..." />
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
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="اختر الحالة" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="scheduled">مجدولة</SelectItem>
                              <SelectItem value="completed">مكتملة</SelectItem>
                              <SelectItem value="cancelled">ملغية</SelectItem>
                              <SelectItem value="postponed">مؤجلة</SelectItem>
                            </SelectContent>
                          </Select>
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
                          <Textarea {...field} value={field.value || ''} placeholder="ملاحظات إضافية حول الجلسة..." />
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
                      {editingSession ? "تحديث" : "جدولة"}
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

        {/* Sessions Table */}
        <Card>
          <CardHeader>
            <CardTitle>قائمة الجلسات ({filteredSessions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={filteredSessions}
                initialSort={{ key: "date", direction: "desc" }}
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
          title="حذف الجلسة"
          description="هل أنت متأكد من حذف هذه الجلسة؟ لا يمكن التراجع عن هذا الإجراء."
          itemName={sessionToDelete?.title}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </Layout>
  );
}
