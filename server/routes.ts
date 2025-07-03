import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertClientSchema, insertCaseSchema, insertSessionSchema, insertInvoiceSchema, insertTaskSchema, insertUserSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import { createReadStream } from "fs";
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
      console.log('All documents:', documents.map(d => ({ id: d.id, title: d.title, caseId: d.caseId })));
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
      console.log('📝 Invoice creation request body:', req.body);
      
      const invoiceData = insertInvoiceSchema.parse(req.body);
      console.log('✅ Parsed invoice data:', invoiceData);
      
      const invoice = await storage.createInvoice({
        ...invoiceData,
        createdBy: req.user!.id
      });
      
      await storage.logActivity({
        userId: req.user!.id,
        action: "create_invoice",
        targetType: "invoice",
        targetId: invoice.id,
        details: `تم إنشاء فاتورة بمبلغ ${invoice.amount} جنيه`,
      });
      
      res.status(201).json(invoice);
    } catch (error) {
      console.error('❌ Invoice creation error:', error);
      if (error instanceof Error) {
        res.status(400).json({ 
          message: "بيانات غير صحيحة", 
          details: error.message 
        });
      } else {
        res.status(400).json({ message: "بيانات غير صحيحة" });
      }
    }
  });

  app.put("/api/invoices/:id", requireAuth, async (req, res) => {
    try {
      const invoiceId = parseInt(req.params.id);
      console.log('📝 Invoice update request for ID:', invoiceId, 'body:', req.body);
      
      const invoiceData = insertInvoiceSchema.partial().parse(req.body);
      console.log('✅ Parsed update data:', invoiceData);
      
      const updatedInvoice = await storage.updateInvoice(invoiceId, invoiceData);
      
      if (!updatedInvoice) {
        return res.status(404).json({ message: "الفاتورة غير موجودة" });
      }
      
      await storage.logActivity({
        userId: req.user!.id,
        action: "update_invoice",
        targetType: "invoice",
        targetId: invoiceId,
        details: `تم تحديث فاتورة رقم ${invoiceId}`,
      });
      
      res.json(updatedInvoice);
    } catch (error) {
      console.error('❌ Invoice update error:', error);
      if (error instanceof Error) {
        res.status(400).json({ 
          message: "خطأ في تحديث الفاتورة", 
          details: error.message 
        });
      } else {
        res.status(400).json({ message: "خطأ في تحديث الفاتورة" });
      }
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
      console.log('🔍 Fetching documents for client ID:', clientId);
      
      // Get all cases for this client
      const allCases = await storage.getAllCases();
      console.log('📋 All cases:', allCases.map(c => ({ id: c.id, title: c.title, clientId: c.clientId })));
      
      const clientCases = allCases.filter(c => c.clientId === clientId);
      console.log('👤 Client cases:', clientCases.map(c => ({ id: c.id, title: c.title })));
      
      const caseIds = clientCases.map(c => c.id);
      
      if (caseIds.length === 0) {
        console.log('❌ No cases found for client');
        return res.json([]);
      }
      
      // Get all documents and filter by client's cases
      const allDocuments = await storage.getAllDocuments();
      console.log('📄 All documents:', allDocuments.map(d => ({ id: d.id, title: d.title, caseId: d.caseId, description: d.description })));
      
      const clientDocuments = allDocuments.filter(doc => caseIds.includes(doc.caseId));
      console.log('📄 Client documents:', clientDocuments.map(d => ({ id: d.id, title: d.title, caseId: d.caseId })));
      
      // Add case titles to documents
      const documentsWithCaseInfo = clientDocuments.map(doc => {
        const relatedCase = clientCases.find(c => c.id === doc.caseId);
        return {
          ...doc,
          caseTitle: relatedCase?.title || 'غير محدد'
        };
      });
      
      // Sort by upload date (newest first)
      documentsWithCaseInfo.sort((a, b) => {
        const dateA = a.uploadedAt ? new Date(a.uploadedAt).getTime() : 0;
        const dateB = b.uploadedAt ? new Date(b.uploadedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      console.log('✅ Final documents with case info:', documentsWithCaseInfo.map(d => ({ 
        id: d.id, 
        title: d.title, 
        caseId: d.caseId, 
        caseTitle: d.caseTitle,
        description: d.description,
        fileSize: d.fileSize,
        fileType: d.fileType,
        uploadedAt: d.uploadedAt
      })));
      

      
      res.json(documentsWithCaseInfo);
    } catch (error) {
      console.error('❌ Error fetching client documents:', error);
      res.status(500).json({ message: "خطأ في استرجاع المستندات" });
    }
  });

  // Document download endpoint
  app.get("/api/documents/:id/download", requireAuth, async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      console.log('🔍 Downloading document ID:', documentId);
      
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        console.log('❌ Document not found for ID:', documentId);
        const allDocuments = await storage.getAllDocuments();
        console.log('Available documents:', allDocuments.map(d => ({ id: d.id, title: d.title })));
        return res.status(404).json({ message: "المستند غير موجود" });
      }
      
      console.log('📄 Document found:', { id: document.id, title: document.title, filePath: document.filePath });
      
      // Handle both absolute and relative file paths
      let filePath = document.filePath;
      console.log('🔍 Original filePath:', filePath);
      
      if (path.isAbsolute(filePath)) {
        console.log('📁 Trying absolute path:', filePath);
        try {
          await fs.access(filePath);
          console.log('✅ Absolute path works');
        } catch (error) {
          console.log('❌ Absolute path failed:', error instanceof Error ? error.message : 'Unknown error');
          // If absolute path doesn't work, try relative path in uploads
          const fileName = path.basename(filePath);
          filePath = path.join(process.cwd(), 'uploads', fileName);
          console.log('📁 Trying fallback path:', filePath);
          try {
            await fs.access(filePath);
            console.log('✅ Fallback path works');
          } catch (fallbackError) {
            console.log('❌ Fallback path failed:', fallbackError instanceof Error ? fallbackError.message : 'Unknown error');
            return res.status(404).json({ message: "الملف غير موجود" });
          }
        }
      } else {
        filePath = path.join(process.cwd(), filePath);
        console.log('📁 Trying relative path:', filePath);
        try {
          await fs.access(filePath);
          console.log('✅ Relative path works');
        } catch (error) {
          console.log('❌ Relative path failed:', error instanceof Error ? error.message : 'Unknown error');
          return res.status(404).json({ message: "الملف غير موجود" });
        }
      }
      
      console.log('🎯 Final filePath:', filePath);
      
      // Set headers for download
      const originalFileName = document.title;
      
      // Get file extension from MIME type
      let fileExtension = '';
      if (document.fileType) {
        const mimeToExt: { [key: string]: string } = {
          'application/pdf': '.pdf',
          'application/msword': '.doc',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'text/plain': '.txt',
          'application/vnd.ms-excel': '.xls',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
        };
        fileExtension = mimeToExt[document.fileType] || '';
      }
      
      // If no extension found from MIME type, try to get it from the file path
      if (!fileExtension && document.filePath) {
        fileExtension = path.extname(document.filePath);
      }
      
      const fileName = originalFileName + fileExtension;
      
      console.log('📝 Filename generation:', {
        originalFileName,
        fileExtension,
        finalFileName: fileName,
        fileType: document.fileType
      });
      
      // Encode filename for proper download with Arabic support
      const encodedFileName = encodeURIComponent(fileName);
      console.log('🔤 Encoded filename:', encodedFileName);
      
      res.setHeader('Content-Disposition', `attachment; filename="${encodedFileName}"; filename*=UTF-8''${encodedFileName}`);
      res.setHeader('Content-Type', document.fileType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-cache');
      
      // Stream the file
      const fileStream = createReadStream(filePath);
      fileStream.on('error', (error) => {
        console.error('❌ File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: "خطأ في قراءة الملف" });
        }
      });
      
      // Handle response errors
      res.on('error', (error) => {
        console.error('❌ Response error:', error);
      });
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('❌ Download error:', error);
      res.status(500).json({ message: "خطأ في تحميل المستند", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Document view endpoint
  app.get("/api/documents/:id/view", requireAuth, async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      console.log('🔍 Viewing document ID:', documentId);
      
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        console.log('❌ Document not found for ID:', documentId);
        const allDocuments = await storage.getAllDocuments();
        console.log('Available documents for view:', allDocuments.map(d => ({ id: d.id, title: d.title })));
        return res.status(404).json({ message: "المستند غير موجود" });
      }
      
      console.log('📄 Document found:', { id: document.id, title: document.title, filePath: document.filePath });
      
      // Handle both absolute and relative file paths
      let filePath = document.filePath;
      console.log('🔍 Original filePath:', filePath);
      
      if (path.isAbsolute(filePath)) {
        console.log('📁 Trying absolute path:', filePath);
        try {
          await fs.access(filePath);
          console.log('✅ Absolute path works');
        } catch (error) {
          console.log('❌ Absolute path failed:', error instanceof Error ? error.message : 'Unknown error');
          // If absolute path doesn't work, try relative path in uploads
          const fileName = path.basename(filePath);
          filePath = path.join(process.cwd(), 'uploads', fileName);
          console.log('📁 Trying fallback path:', filePath);
          try {
            await fs.access(filePath);
            console.log('✅ Fallback path works');
          } catch (fallbackError) {
            console.log('❌ Fallback path failed:', fallbackError instanceof Error ? fallbackError.message : 'Unknown error');
            return res.status(404).json({ message: "الملف غير موجود" });
          }
        }
      } else {
        filePath = path.join(process.cwd(), filePath);
        console.log('📁 Trying relative path:', filePath);
        try {
          await fs.access(filePath);
          console.log('✅ Relative path works');
        } catch (error) {
          console.log('❌ Relative path failed:', error instanceof Error ? error.message : 'Unknown error');
          return res.status(404).json({ message: "الملف غير موجود" });
        }
      }
      
      console.log('🎯 Final filePath:', filePath);
      
      // Set headers for viewing
      res.setHeader('Content-Type', document.fileType || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-cache');
      
      // Stream the file
      const fileStream = createReadStream(filePath);
      fileStream.on('error', (error) => {
        console.error('❌ File stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: "خطأ في قراءة الملف" });
        }
      });
      
      // Handle response errors
      res.on('error', (error) => {
        console.error('❌ Response error:', error);
      });
      
      fileStream.pipe(res);
    } catch (error) {
      console.error('❌ View error:', error);
      res.status(500).json({ message: "خطأ في عرض المستند", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Test endpoint to check file paths
  app.get("/api/test/file-path/:id", requireAuth, async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      console.log('🧪 Testing file path for document ID:', documentId);
      
      const document = await storage.getDocument(documentId);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }
      
      const originalPath = document.filePath;
      const isAbsolute = path.isAbsolute(originalPath);
      const fileName = path.basename(originalPath);
      const fallbackPath = path.join(process.cwd(), 'uploads', fileName);
      const relativePath = path.join(process.cwd(), originalPath);
      
      // Test file existence
      let absoluteExists = false;
      let fallbackExists = false;
      let relativeExists = false;
      
      try {
        await fs.access(originalPath);
        absoluteExists = true;
      } catch {}
      
      try {
        await fs.access(fallbackPath);
        fallbackExists = true;
      } catch {}
      
      try {
        await fs.access(relativePath);
        relativeExists = true;
      } catch {}
      
      res.json({
        document: {
          id: document.id,
          title: document.title,
          originalPath,
          isAbsolute
        },
        paths: {
          original: originalPath,
          fallback: fallbackPath,
          relative: relativePath
        },
        exists: {
          absolute: absoluteExists,
          fallback: fallbackExists,
          relative: relativeExists
        },
        currentDir: process.cwd(),
        uploadsDir: path.join(process.cwd(), 'uploads')
      });
    } catch (error) {
      res.status(500).json({ message: "Test failed", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Debug endpoint to check available documents
  app.get("/api/debug/documents", requireAuth, async (req, res) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json({
        count: documents.length,
        documents: documents.map(d => ({ 
          id: d.id, 
          title: d.title, 
          caseId: d.caseId, 
          filePath: d.filePath,
          description: d.description,
          fileSize: d.fileSize,
          fileType: d.fileType,
          uploadedAt: d.uploadedAt
        }))
      });
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع المستندات", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Debug endpoint to check clients and their cases
  app.get("/api/debug/clients-cases", requireAuth, async (req, res) => {
    try {
      const clients = await storage.getAllClients();
      const cases = await storage.getAllCases();
      const documents = await storage.getAllDocuments();
      
      const clientsWithCases = clients.map(client => {
        const clientCases = cases.filter(c => c.clientId === client.id);
        const caseIds = clientCases.map(c => c.id);
        const clientDocuments = documents.filter(d => caseIds.includes(d.caseId));
        
        return {
          id: client.id,
          name: client.name,
          cases: clientCases.map(c => ({
            id: c.id,
            title: c.title,
            documents: clientDocuments.filter(d => d.caseId === c.id).map(d => ({
              id: d.id,
              title: d.title,
              description: d.description,
              fileSize: d.fileSize,
              fileType: d.fileType,
              uploadedAt: d.uploadedAt
            }))
          }))
        };
      });
      
      res.json({
        totalClients: clients.length,
        totalCases: cases.length,
        totalDocuments: documents.length,
        clientsWithCases,
        rawDocuments: documents.map(d => ({
          id: d.id,
          title: d.title,
          caseId: d.caseId,
          description: d.description,
          fileSize: d.fileSize,
          fileType: d.fileType,
          uploadedAt: d.uploadedAt,
          filePath: d.filePath
        }))
      });
    } catch (error) {
      res.status(500).json({ message: "خطأ في استرجاع البيانات", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
