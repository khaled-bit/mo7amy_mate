import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { insertClientSchema, insertCaseSchema, insertSessionSchema, insertInvoiceSchema, insertTaskSchema, insertUserSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";

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

  const httpServer = createServer(app);
  return httpServer;
}
