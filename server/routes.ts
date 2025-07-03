import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertClientSchema, insertCaseSchema, insertSessionSchema, insertInvoiceSchema, insertTaskSchema, insertUserSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { eq, inArray, desc } from "drizzle-orm";
import { cases, documents } from "@shared/schema";
import { db } from "./db";

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads');
const upload = multer({ 
  dest: uploadDir,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Ensure upload directory exists
fs.mkdir(uploadDir, { recursive: true }).catch(console.error);

// Middleware to check authentication
const requireAuth = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "غير مصرح" });
  }
  next();
};

// Middleware to check admin role
const requireAdmin = (req: any, res: any, next: any) => {
  if (!req.isAuthenticated() || req.user.role !== 'admin') {
    return res.status(403).json({ message: "غير مسموح - مطلوب صلاحية مدير" });
  }
  next();
};

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Dashboard stats
  app.get("/api/dashboard/stats", requireAuth, async (req, res) => {
    try {
      const stats = await storage.getDashboardStats(req.user!.id, req.user!.role);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع الإحصائيات" });
    }
  });

  // Clients routes
  app.get("/api/clients", requireAuth, async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع العملاء" });
    }
  });

  app.get("/api/clients/search", requireAuth, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.json([]);
      const clients = await storage.searchClients(q as string);
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "خطأ في البحث" });
    }
  });

  app.post("/api/clients", requireAuth, async (req, res) => {
    try {
      const clientData = insertClientSchema.parse(req.body);
      const client = await storage.createClient({
        ...clientData,
        createdBy: req.user!.id
      });
      
      await storage.logActivity({
        userId: req.user!.id,
        action: "create_client",
        targetType: "client",
        targetId: client.id,
        details: `تم إضافة عميل جديد: ${client.name}`,
      });
      
      res.status(201).json(client);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صحيحة" });
    }
  });

  app.put("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const clientData = insertClientSchema.partial().parse(req.body);
      const client = await storage.updateClient(id, clientData);
      
      await storage.logActivity({
        userId: req.user!.id,
        action: "update_client",
        targetType: "client",
        targetId: id,
        details: `تم تحديث معلومات العميل: ${client.name}`,
      });
      
      res.json(client);
    } catch (error) {
      res.status(400).json({ message: "خطأ في التحديث" });
    }
  });

  app.delete("/api/clients/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteClient(id);
      
      await storage.logActivity({
        userId: req.user!.id,
        action: "delete_client",
        targetType: "client",
        targetId: id,
        details: "تم حذف عميل",
      });
      
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الحذف" });
    }
  });

  // Cases routes
  app.get("/api/cases", requireAuth, async (req, res) => {
    try {
      const cases = await storage.getCasesForUser(req.user!.id, req.user!.role);
      res.json(cases);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع القضايا" });
    }
  });

  app.get("/api/cases/search", requireAuth, async (req, res) => {
    try {
      const { q } = req.query;
      if (!q) return res.json([]);
      const cases = await storage.searchCases(q as string);
      res.json(cases);
    } catch (error) {
      res.status(500).json({ message: "خطأ في البحث" });
    }
  });

  app.post("/api/cases", requireAuth, async (req, res) => {
    try {
      const caseData = insertCaseSchema.parse(req.body);
      const newCase = await storage.createCase({
        ...caseData,
        createdBy: req.user!.id
      });
      
      // Assign creator to case
      await storage.assignUserToCase(newCase.id, req.user!.id, 'primary');
      
      await storage.logActivity({
        userId: req.user!.id,
        action: "create_case",
        targetType: "case",
        targetId: newCase.id,
        details: `تم إضافة قضية جديدة: ${newCase.title}`,
      });
      
      res.status(201).json(newCase);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صحيحة" });
    }
  });

  app.put("/api/cases/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const caseData = insertCaseSchema.partial().parse(req.body);
      const updatedCase = await storage.updateCase(id, caseData);
      
      await storage.logActivity({
        userId: req.user!.id,
        action: "update_case",
        targetType: "case",
        targetId: id,
        details: `تم تحديث القضية: ${updatedCase.title}`,
      });
      
      res.json(updatedCase);
    } catch (error) {
      res.status(400).json({ message: "خطأ في التحديث" });
    }
  });

  // AI Analysis for Case (admin/lawyer only)
  app.post("/api/cases/:id/ai-analysis", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!['admin', 'lawyer'].includes(req.user!.role)) {
        return res.status(403).json({ message: "غير مسموح - فقط للمحامين أو المدراء" });
      }
      
      // Get case details
      const caseDetails = await storage.getCase(id);
      if (!caseDetails) return res.status(404).json({ message: "القضية غير موجودة" });

      // Initialize Anthropic client
      const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY || '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',
      });

      // Compose the AI prompt in Arabic
      const prompt = `حلل القضية التالية وفقاً للقانون المصري:
- أعطني نسبة احتمالية الفوز أو الخسارة.
- حدد أي ثغرات قانونية أو نقاط غامضة يمكن استغلالها.
- أعطني أمثلة من قضايا سابقة مشابهة من التاريخ القانوني المصري.
- استند إلى الدساتير المصرية (1971، 2012، 2014، تعديلات 2019) وقوانين العقوبات، الإجراءات الجنائية، القانون المدني، إلخ.
- أرفق المراجع وروابط النصوص القانونية إن أمكن.

تفاصيل القضية:
${JSON.stringify(caseDetails, null, 2)}

المراجع:
- الدساتير المصرية: https://www.refworld.org/
- قانون العقوبات: https://www.refworld.org/
- القانون المدني: https://www.scribd.com/, https://wipo.int/, https://natlex.ilo.org/
`;

      console.log('Sending to Claude with model: claude-sonnet-4-20250514');

      // Call Claude API using the SDK
      const msg = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 20000,
        temperature: 1,
        messages: [
          { role: 'user', content: prompt }
        ]
      });

      console.log('Claude API response received successfully');

      // Extract text content from the response
      const textContent = msg.content.find(block => block.type === 'text');
      if (!textContent || textContent.type !== 'text') {
        throw new Error('No text content received from Claude');
      }

      res.json({ analysis: textContent.text });
    } catch (error) {
      console.error('AI analysis endpoint error:', error);
      res.status(500).json({ message: "خطأ في التحليل الذكي", error: String(error) });
    }
  });

  // Sessions routes
  app.get("/api/sessions", requireAuth, async (req, res) => {
    try {
      const sessions = await storage.getAllSessions();
      res.json(sessions);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع الجلسات" });
    }
  });

  app.post("/api/sessions", requireAuth, async (req, res) => {
    try {
      const sessionData = insertSessionSchema.parse(req.body);
      
      // Check for conflicts
      const hasConflict = await storage.checkSessionConflict(
        sessionData.date,
        sessionData.time,
        req.user!.id
      );
      
      if (hasConflict) {
        return res.status(409).json({ message: "يوجد تعارض في المواعيد" });
      }
      
      const session = await storage.createSession({
        ...sessionData,
        createdBy: req.user!.id
      });
      
      await storage.logActivity({
        userId: req.user!.id,
        action: "create_session",
        targetType: "session",
        targetId: session.id,
        details: `تم جدولة جلسة جديدة: ${session.title}`,
      });
      
      res.status(201).json(session);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صحيحة" });
    }
  });

  // Documents routes
  app.get("/api/documents", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع المستندات" });
    }
  });

  app.post("/api/documents", requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم رفع ملف" });
      }
      
      const document = await storage.createDocument({
        caseId: parseInt(req.body.caseId),
        title: req.body.title || req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        fileType: req.file.mimetype,
        description: req.body.description,
        uploadedBy: req.user!.id
      });
      
      await storage.logActivity({
        userId: req.user!.id,
        action: "upload_document",
        targetType: "document",
        targetId: document.id,
        details: `تم رفع مستند: ${document.title}`,
      });
      
      res.status(201).json(document);
    } catch (error) {
      res.status(500).json({ message: "خطأ في رفع المستند" });
    }
  });

  // Invoices routes
  app.get("/api/invoices", requireAuth, async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      res.json(invoices);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع الفواتير" });
    }
  });

  app.post("/api/invoices", requireAuth, async (req, res) => {
    try {
      const invoiceData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice({
        ...invoiceData,
        createdBy: req.user!.id
      });
      
      await storage.logActivity({
        userId: req.user!.id,
        action: "create_invoice",
        targetType: "invoice",
        targetId: invoice.id,
        details: `تم إنشاء فاتورة بمبلغ ${invoice.amount} ريال`,
      });
      
      res.status(201).json(invoice);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صحيحة" });
    }
  });

  // Tasks routes
  app.get("/api/tasks", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getTasksForUser(req.user!.id);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع المهام" });
    }
  });

  app.post("/api/tasks", requireAuth, async (req, res) => {
    try {
      const taskData = insertTaskSchema.parse(req.body);
      const task = await storage.createTask({
        ...taskData,
        createdBy: req.user!.id
      });
      
      await storage.logActivity({
        userId: req.user!.id,
        action: "create_task",
        targetType: "task",
        targetId: task.id,
        details: `تم إنشاء مهمة جديدة: ${task.title}`,
      });
      
      res.status(201).json(task);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صحيحة" });
    }
  });

  // Admin routes
  app.get("/api/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع المستخدمين" });
    }
  });

  app.post("/api/users", requireAdmin, async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      
      await storage.logActivity({
        userId: req.user!.id,
        action: "create_user",
        targetType: "user",
        targetId: user.id,
        details: `تم إنشاء مستخدم جديد: ${user.name}`,
      });
      
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ message: "بيانات غير صحيحة" });
    }
  });

  app.get("/api/activity", requireAuth, async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const activities = await storage.getActivityLog(limit);
      res.json(activities);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع سجل الأنشطة" });
    }
  });

  // Get single case by id
  app.get("/api/cases/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const caseDetails = await storage.getCase(id);
      if (!caseDetails) return res.status(404).json({ message: "القضية غير موجودة" });
      res.json(caseDetails);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع بيانات القضية" });
    }
  });

  // Export routes for PDF reports
  app.get("/api/export/clients", requireAuth, async (req, res) => {
    try {
      const { format = 'pdf' } = req.query;
      const clients = await storage.getAllClients();
      
      if (format === 'json') {
        return res.json(clients);
      }
      
      // Generate PDF with client data
      const reportData = {
        title: "تقرير العملاء",
        date: new Date().toLocaleDateString('ar-EG'),
        data: clients.map(client => ({
          name: client.name,
          phone: client.phone || '',
          email: client.email || '',
          address: client.address || '',
          createdAt: client.createdAt ? new Date(client.createdAt).toLocaleDateString('ar-EG') : ''
        }))
      };
      
      res.json(reportData);
    } catch (error) {
      res.status(500).json({ message: "خطأ في تصدير بيانات العملاء" });
    }
  });

  app.get("/api/export/cases", requireAuth, async (req, res) => {
    try {
      const { format = 'pdf' } = req.query;
      const cases = await storage.getAllCases();
      
      if (format === 'json') {
        return res.json(cases);
      }
      
      // Generate PDF with case data
      const reportData = {
        title: "تقرير القضايا",
        date: new Date().toLocaleDateString('ar-EG'),
        data: cases.map(caseItem => ({
          title: caseItem.title,
          type: caseItem.type,
          status: caseItem.status,
          court: caseItem.court || '',
          description: caseItem.description || '',
          createdAt: caseItem.createdAt ? new Date(caseItem.createdAt).toLocaleDateString('ar-EG') : ''
        }))
      };
      
      res.json(reportData);
    } catch (error) {
      res.status(500).json({ message: "خطأ في تصدير بيانات القضايا" });
    }
  });

  app.get("/api/export/invoices", requireAuth, async (req, res) => {
    try {
      const { format = 'pdf' } = req.query;
      const invoices = await storage.getAllInvoices();
      
      if (format === 'json') {
        return res.json(invoices);
      }
      
      // Generate PDF with invoice data
      const reportData = {
        title: "تقرير الفواتير",
        date: new Date().toLocaleDateString('ar-EG'),
        data: invoices.map(invoice => ({
          id: invoice.id,
          amount: invoice.amount,
          paid: invoice.paid ? 'مدفوع' : 'غير مدفوع',
          dueDate: invoice.dueDate || '',
          description: invoice.description || '',
          createdAt: invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('ar-EG') : ''
        }))
      };
      
      res.json(reportData);
    } catch (error) {
      res.status(500).json({ message: "خطأ في تصدير بيانات الفواتير" });
    }
  });

  app.get("/api/export/sessions", requireAuth, async (req, res) => {
    try {
      const { format = 'pdf' } = req.query;
      const sessions = await storage.getAllSessions();
      
      if (format === 'json') {
        return res.json(sessions);
      }
      
      // Generate PDF with session data
      const reportData = {
        title: "تقرير الجلسات",
        date: new Date().toLocaleDateString('ar-EG'),
        data: sessions.map(session => ({
          title: session.title,
          date: session.date,
          time: session.time,
          status: session.status,
          location: session.location || '',
          notes: session.notes || '',
          createdAt: session.createdAt ? new Date(session.createdAt).toLocaleDateString('ar-EG') : ''
        }))
      };
      
      res.json(reportData);
    } catch (error) {
      res.status(500).json({ message: "خطأ في تصدير بيانات الجلسات" });
    }
  });

  app.get("/api/export/comprehensive", requireAuth, async (req, res) => {
    try {
      const { period = 'all' } = req.query;
      
      // Get all data
      const clients = await storage.getAllClients();
      const cases = await storage.getAllCases();
      const invoices = await storage.getAllInvoices();
      const sessions = await storage.getAllSessions();
      const tasks = await storage.getAllTasks();
      
      // Calculate statistics
      const totalRevenue = invoices
        .filter(inv => inv.paid)
        .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      
      const activeCases = cases.filter(c => c.status === 'active').length;
      const pendingInvoices = invoices.filter(inv => !inv.paid).length;
      
      const reportData = {
        title: "التقرير الشامل",
        date: new Date().toLocaleDateString('ar-EG'),
        period: period,
        summary: {
          totalClients: clients.length,
          totalCases: cases.length,
          activeCases: activeCases,
          totalInvoices: invoices.length,
          pendingInvoices: pendingInvoices,
          totalRevenue: totalRevenue,
          totalSessions: sessions.length,
          totalTasks: tasks.length
        },
        clients: clients.slice(0, 10), // Top 10 clients
        cases: cases.slice(0, 10), // Top 10 cases
        invoices: invoices.slice(0, 10), // Top 10 invoices
        sessions: sessions.slice(0, 10) // Top 10 sessions
      };
      
      res.json(reportData);
    } catch (error) {
      res.status(500).json({ message: "خطأ في تصدير التقرير الشامل" });
    }
  });

  app.get("/api/export/tasks", requireAuth, async (req, res) => {
    try {
      const { format = 'pdf' } = req.query;
      const tasks = await storage.getAllTasks();
      
      if (format === 'json') {
        return res.json(tasks);
      }
      
      // Generate PDF with task data
      const reportData = {
        title: "تقرير المهام",
        date: new Date().toLocaleDateString('ar-EG'),
        data: tasks.map(task => ({
          title: task.title,
          description: task.description || '',
          status: task.status,
          priority: task.priority || '',
          dueDate: task.dueDate || '',
          createdAt: task.createdAt ? new Date(task.createdAt).toLocaleDateString('ar-EG') : ''
        }))
      };
      
      res.json(reportData);
    } catch (error) {
      res.status(500).json({ message: "خطأ في تصدير بيانات المهام" });
    }
  });

  app.get("/api/export/financial", requireAuth, async (req, res) => {
    try {
      const { format = 'pdf' } = req.query;
      const invoices = await storage.getAllInvoices();
      
      if (format === 'json') {
        return res.json(invoices);
      }
      
      // Calculate financial statistics
      const totalRevenue = invoices
        .filter(inv => inv.paid)
        .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      
      const pendingAmount = invoices
        .filter(inv => !inv.paid)
        .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      
      const paidInvoices = invoices.filter(inv => inv.paid).length;
      const pendingInvoices = invoices.filter(inv => !inv.paid).length;
      
      // Generate PDF with financial data
      const reportData = {
        title: "التقرير المالي",
        date: new Date().toLocaleDateString('ar-EG'),
        summary: {
          totalRevenue: totalRevenue,
          pendingAmount: pendingAmount,
          paidInvoices: paidInvoices,
          pendingInvoices: pendingInvoices,
          totalInvoices: invoices.length
        },
        data: invoices.map(invoice => ({
          id: invoice.id,
          amount: invoice.amount,
          paid: invoice.paid ? 'مدفوع' : 'غير مدفوع',
          dueDate: invoice.dueDate || '',
          description: invoice.description || '',
          createdAt: invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString('ar-EG') : ''
        }))
      };
      
      res.json(reportData);
    } catch (error) {
      res.status(500).json({ message: "خطأ في تصدير التقرير المالي" });
    }
  });

  // Get documents by client
  app.get("/api/clients/:id/documents", requireAuth, async (req, res) => {
    try {
      const clientId = parseInt(req.params.id);
      
      // Get all cases for this client
      const clientCases = await db.select().from(cases).where(eq(cases.clientId, clientId));
      const caseIds = clientCases.map(c => c.id);
      
      if (caseIds.length === 0) {
        return res.json([]);
      }
      
      // Get all documents for these cases
      const clientDocuments = await db.select().from(documents)
        .where(inArray(documents.caseId, caseIds))
        .orderBy(desc(documents.uploadedAt));
      
      // Get case titles for each document
      const documentsWithCaseInfo = clientDocuments.map((doc: any) => {
        const relatedCase = clientCases.find(c => c.id === doc.caseId);
        return {
          ...doc,
          caseTitle: relatedCase?.title || 'غير محدد'
        };
      });
      
      res.json(documentsWithCaseInfo);
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع المستندات" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
