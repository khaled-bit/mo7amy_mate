import { 
  users, clients, cases, caseUsers, sessions, documents, invoices, tasks, activityLog,
  type User, type InsertUser, type Client, type InsertClient, type Case, type InsertCase,
  type Session, type InsertSession, type Document, type InsertDocument, 
  type Invoice, type InsertInvoice, type Task, type InsertTask, type ActivityLog, type InsertActivityLog
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, or, like, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Clients
  getAllClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  createClient(client: InsertClient & { createdBy: number }): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: number): Promise<void>;
  searchClients(term: string): Promise<Client[]>;

  // Cases
  getAllCases(): Promise<Case[]>;
  getCasesForUser(userId: number, role: string): Promise<Case[]>;
  getCase(id: number): Promise<Case | undefined>;
  createCase(caseData: InsertCase & { createdBy: number }): Promise<Case>;
  updateCase(id: number, caseData: Partial<InsertCase>): Promise<Case>;
  deleteCase(id: number): Promise<void>;
  assignUserToCase(caseId: number, userId: number, role?: string): Promise<void>;
  searchCases(term: string): Promise<Case[]>;

  // Sessions
  getAllSessions(): Promise<Session[]>;
  getSessionsForDate(date: string): Promise<Session[]>;
  getSession(id: number): Promise<Session | undefined>;
  createSession(session: InsertSession & { createdBy: number }): Promise<Session>;
  updateSession(id: number, session: Partial<InsertSession>): Promise<Session>;
  deleteSession(id: number): Promise<void>;
  checkSessionConflict(date: string, time: string, userId: number): Promise<boolean>;

  // Documents
  getAllDocuments(): Promise<Document[]>;
  getDocumentsByCase(caseId: number): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(document: InsertDocument & { uploadedBy: number }): Promise<Document>;
  deleteDocument(id: number): Promise<void>;

  // Invoices
  getAllInvoices(): Promise<Invoice[]>;
  getInvoicesByCase(caseId: number): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  createInvoice(invoice: InsertInvoice & { createdBy: number }): Promise<Invoice>;
  updateInvoice(id: number, invoice: Partial<InsertInvoice>): Promise<Invoice>;
  deleteInvoice(id: number): Promise<void>;

  // Tasks
  getAllTasks(): Promise<Task[]>;
  getTasksForUser(userId: number): Promise<Task[]>;
  getTask(id: number): Promise<Task | undefined>;
  createTask(task: InsertTask & { createdBy: number }): Promise<Task>;
  updateTask(id: number, task: Partial<InsertTask>): Promise<Task>;
  deleteTask(id: number): Promise<void>;

  // Activity Log
  logActivity(activity: InsertActivityLog): Promise<ActivityLog>;
  getActivityLog(limit?: number): Promise<ActivityLog[]>;

  // Dashboard Stats
  getDashboardStats(userId: number, role: string): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User> {
    const [user] = await db.update(users).set(userData).where(eq(users.id, id)).returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // Clients
  async getAllClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(client: InsertClient & { createdBy: number }): Promise<Client> {
    const [newClient] = await db.insert(clients).values(client).returning();
    return newClient;
  }

  async updateClient(id: number, clientData: Partial<InsertClient>): Promise<Client> {
    const [client] = await db.update(clients).set(clientData).where(eq(clients.id, id)).returning();
    return client;
  }

  async deleteClient(id: number): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async searchClients(term: string): Promise<Client[]> {
    return await db.select().from(clients)
      .where(or(
        like(clients.name, `%${term}%`),
        like(clients.phone, `%${term}%`),
        like(clients.email, `%${term}%`)
      ));
  }

  // Cases
  async getAllCases(): Promise<Case[]> {
    return await db.select().from(cases).orderBy(desc(cases.createdAt));
  }

  async getCasesForUser(userId: number, role: string): Promise<Case[]> {
    if (role === 'admin') {
      return await this.getAllCases();
    }
    
    const userCases = await db.select({ case: cases })
      .from(caseUsers)
      .innerJoin(cases, eq(caseUsers.caseId, cases.id))
      .where(eq(caseUsers.userId, userId));
    
    return userCases.map(uc => uc.case);
  }

  async getCase(id: number): Promise<Case | undefined> {
    const [caseData] = await db.select().from(cases).where(eq(cases.id, id));
    return caseData || undefined;
  }

  async createCase(caseData: InsertCase & { createdBy: number }): Promise<Case> {
    const [newCase] = await db.insert(cases).values(caseData).returning();
    return newCase;
  }

  async updateCase(id: number, caseData: Partial<InsertCase>): Promise<Case> {
    const [updatedCase] = await db.update(cases).set(caseData).where(eq(cases.id, id)).returning();
    return updatedCase;
  }

  async deleteCase(id: number): Promise<void> {
    await db.delete(cases).where(eq(cases.id, id));
  }

  async assignUserToCase(caseId: number, userId: number, role?: string): Promise<void> {
    await db.insert(caseUsers).values({ caseId, userId, role });
  }

  async searchCases(term: string): Promise<Case[]> {
    return await db.select().from(cases)
      .where(or(
        like(cases.title, `%${term}%`),
        like(cases.type, `%${term}%`),
        like(cases.court, `%${term}%`)
      ));
  }

  // Sessions
  async getAllSessions(): Promise<Session[]> {
    return await db.select().from(sessions).orderBy(desc(sessions.date), desc(sessions.time));
  }

  async getSessionsForDate(date: string): Promise<Session[]> {
    return await db.select().from(sessions).where(eq(sessions.date, date));
  }

  async getSession(id: number): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, id));
    return session || undefined;
  }

  async createSession(session: InsertSession & { createdBy: number }): Promise<Session> {
    const [newSession] = await db.insert(sessions).values(session).returning();
    return newSession;
  }

  async updateSession(id: number, sessionData: Partial<InsertSession>): Promise<Session> {
    const [session] = await db.update(sessions).set(sessionData).where(eq(sessions.id, id)).returning();
    return session;
  }

  async deleteSession(id: number): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, id));
  }

  async checkSessionConflict(date: string, time: string, userId: number): Promise<boolean> {
    const conflicts = await db.select()
      .from(sessions)
      .innerJoin(caseUsers, eq(sessions.caseId, caseUsers.caseId))
      .where(and(
        eq(sessions.date, date),
        eq(sessions.time, time),
        eq(caseUsers.userId, userId),
        eq(sessions.status, 'scheduled')
      ));
    
    return conflicts.length > 0;
  }

  // Documents
  async getAllDocuments(): Promise<Document[]> {
    return await db.select().from(documents).orderBy(desc(documents.uploadedAt));
  }

  async getDocumentsByCase(caseId: number): Promise<Document[]> {
    return await db.select().from(documents).where(eq(documents.caseId, caseId));
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [document] = await db.select().from(documents).where(eq(documents.id, id));
    return document || undefined;
  }

  async createDocument(document: InsertDocument & { uploadedBy: number }): Promise<Document> {
    const [newDocument] = await db.insert(documents).values(document).returning();
    return newDocument;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }

  // Invoices
  async getAllInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.createdAt));
  }

  async getInvoicesByCase(caseId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.caseId, caseId));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice || undefined;
  }

  async createInvoice(invoice: InsertInvoice & { createdBy: number }): Promise<Invoice> {
    const [newInvoice] = await db.insert(invoices).values(invoice).returning();
    return newInvoice;
  }

  async updateInvoice(id: number, invoiceData: Partial<InsertInvoice>): Promise<Invoice> {
    const [invoice] = await db.update(invoices).set(invoiceData).where(eq(invoices.id, id)).returning();
    return invoice;
  }

  async deleteInvoice(id: number): Promise<void> {
    await db.delete(invoices).where(eq(invoices.id, id));
  }

  // Tasks
  async getAllTasks(): Promise<Task[]> {
    return await db.select().from(tasks).orderBy(desc(tasks.createdAt));
  }

  async getTasksForUser(userId: number): Promise<Task[]> {
    return await db.select().from(tasks)
      .where(or(
        eq(tasks.assignedTo, userId),
        eq(tasks.createdBy, userId)
      ))
      .orderBy(desc(tasks.createdAt));
  }

  async getTask(id: number): Promise<Task | undefined> {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    return task || undefined;
  }

  async createTask(task: InsertTask & { createdBy: number }): Promise<Task> {
    const [newTask] = await db.insert(tasks).values(task).returning();
    return newTask;
  }

  async updateTask(id: number, taskData: Partial<InsertTask>): Promise<Task> {
    const [task] = await db.update(tasks).set(taskData).where(eq(tasks.id, id)).returning();
    return task;
  }

  async deleteTask(id: number): Promise<void> {
    await db.delete(tasks).where(eq(tasks.id, id));
  }

  // Activity Log
  async logActivity(activity: InsertActivityLog): Promise<ActivityLog> {
    const [newActivity] = await db.insert(activityLog).values(activity).returning();
    return newActivity;
  }

  async getActivityLog(limit = 100): Promise<ActivityLog[]> {
    return await db.select().from(activityLog)
      .orderBy(desc(activityLog.createdAt))
      .limit(limit);
  }

  // Dashboard Stats
  async getDashboardStats(userId: number, role: string) {
    const totalClients = await db.select({ count: sql<number>`count(*)` }).from(clients);
    const activeCases = await db.select({ count: sql<number>`count(*)` }).from(cases).where(eq(cases.status, 'active'));
    const pendingInvoices = await db.select({ 
      total: sql<number>`coalesce(sum(amount), 0)` 
    }).from(invoices).where(eq(invoices.paid, false));

    const thisWeekSessions = await db.select({ count: sql<number>`count(*)` })
      .from(sessions)
      .where(sql`date >= date_trunc('week', current_date) AND date < date_trunc('week', current_date) + interval '1 week'`);

    return {
      totalClients: totalClients[0].count,
      activeCases: activeCases[0].count,
      pendingInvoices: pendingInvoices[0].total,
      thisWeekSessions: thisWeekSessions[0].count,
    };
  }
}

export const storage = new DatabaseStorage();
