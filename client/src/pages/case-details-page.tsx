import Layout from "@/components/layout";
import { useRoute } from "wouter";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDualDate } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';

// TODO: Replace with real API type
interface CaseDetails {
  id: number;
  title: string;
  type: string;
  status: string;
  court?: string;
  clientId: number;
  startDate?: string;
  endDate?: string;
  description?: string;
  notes?: string;
}

const statusMap = {
  active: { label: "نشطة", color: "bg-green-100 text-green-800" },
  pending: { label: "معلقة", color: "bg-yellow-100 text-yellow-800" },
  completed: { label: "مكتملة", color: "bg-blue-100 text-blue-800" },
  cancelled: { label: "ملغية", color: "bg-red-100 text-red-800" },
};

export default function CaseDetailsPage() {
  const [match, params] = useRoute("/cases/:id");
  const id = match ? params.id : undefined;
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Try to get the case from the cases list in the cache
  let caseDetails: CaseDetails | undefined = undefined;
  if (id) {
    const cases: CaseDetails[] | undefined = queryClient.getQueryData(["/api/cases"]);
    if (cases) {
      caseDetails = cases.find((c) => String(c.id) === String(id));
    }
  }

  // If not found in cache, fetch from API
  const { data: fetchedCase, isLoading } = useQuery<CaseDetails>({
    queryKey: ["/api/cases", id],
    queryFn: async () => {
      const res = await fetch(`/api/cases/${id}`);
      if (!res.ok) throw new Error("تعذر تحميل بيانات القضية");
      return res.json();
    },
    enabled: !!id && !caseDetails,
  });

  if (!caseDetails && fetchedCase) caseDetails = fetchedCase;

  const handleAIAnalysis = async () => {
    if (!id) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const res = await fetch(`/api/cases/${id}/ai-analysis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json();
        toast({ title: data.message || "حدث خطأ أثناء التحليل الذكي", variant: "destructive" });
        setAiLoading(false);
        return;
      }
      const data = await res.json();
      setAiResult(data.analysis);
    } catch (err) {
      toast({ title: "حدث خطأ أثناء الاتصال بالخادم", variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  };

  if (!id) return <div>رقم القضية غير محدد</div>;

  return (
    <Layout>
      <div className="mt-6 space-y-6 max-w-3xl mx-auto">
        <Button variant="outline" onClick={() => setLocation('/cases')}>
          العودة للقائمة
        </Button>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-end">
              <span>{caseDetails?.title}</span>
              <Badge className={statusMap[(caseDetails?.status as keyof typeof statusMap) || "active"].color}>
                {statusMap[(caseDetails?.status as keyof typeof statusMap) || "active"].label}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-right">
            <div>نوع القضية: {caseDetails?.type}</div>
            <div>المحكمة: {caseDetails?.court || "-"}</div>
            <div>تاريخ البداية: {caseDetails?.startDate ? formatDualDate(caseDetails.startDate) : "-"}</div>
            <div>تاريخ الانتهاء: {caseDetails?.endDate ? formatDualDate(caseDetails.endDate) : "-"}</div>
            <div>الوصف: {caseDetails?.description || "-"}</div>
            <div>ملاحظات: {caseDetails?.notes || "-"}</div>
          </CardContent>
        </Card>

        {/* AI Analysis Section (admin/lawyer only) */}
        {(user?.role === "admin" || user?.role === "lawyer") && (
          <Card>
            <CardHeader>
              <CardTitle>تحليل ذكي للقضية</CardTitle>
            </CardHeader>
            <CardContent>
              <Button disabled={aiLoading} onClick={handleAIAnalysis}>
                {aiLoading ? "جاري التحليل..." : "تشغيل التحليل الذكي"}
              </Button>
              {/* Results will be shown here */}
              {aiResult && (
                <div
                  dir="rtl"
                  style={{
                    background: "#fff",
                    border: "1px solid #eee",
                    borderRadius: "12px",
                    padding: "1.5rem",
                    margin: "1.5rem 0",
                    maxHeight: "500px",
                    overflowY: "auto",
                    fontFamily: "Cairo, Tajawal, Arial, sans-serif",
                    fontSize: "1.1rem",
                    lineHeight: "2"
                  }}
                  className="mt-4 text-right"
                >
                  <ReactMarkdown>{typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult, null, 2)}</ReactMarkdown>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
} 