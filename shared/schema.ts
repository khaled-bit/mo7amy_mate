import { pgTable, text, serial, integer, boolean, timestamp, date, time, decimal, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const userRoleEnum = pgEnum('user_role', ['admin', 'lawyer', 'assistant']);
export const caseStatusEnum = pgEnum('case_status', ['active', 'pending', 'completed', 'cancelled']);
export const sessionStatusEnum = pgEnum('session_status', ['scheduled', 'completed', 'cancelled', 'postponed']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'in_progress', 'completed', 'cancelled']);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: userRoleEnum("role").notNull().default('assistant'),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  nationalId: text("national_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const cases = pgTable("cases", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  type: text("type").notNull(),
  status: caseStatusEnum("status").notNull().default('active'),
  court: text("court"),
  clientId: integer("client_id").notNull().references(() => clients.id),
  startDate: date("start_date"),
  endDate: date("end_date"),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const caseUsers = pgTable("case_users", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => cases.id),
  userId: integer("user_id").notNull().references(() => users.id),
  role: text("role"),
  assignedAt: timestamp("assigned_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => cases.id),
  title: text("title").notNull(),
  date: date("date").notNull(),
  time: time("time").notNull(),
  location: text("location"),
  status: sessionStatusEnum("status").notNull().default('scheduled'),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").notNull().references(() => cases.id),
  title: text("title").notNull(),
  filePath: text("file_path").notNull(),
  fileSize: integer("file_size"),
  fileType: text("file_type"),
  description: text("description"),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  uploadedBy: integer("uploaded_by").references(() => users.id),
});

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  caseId: integer("case_id").references(() => cases.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  paid: boolean("paid").default(false),
  dueDate: date("due_date"),
  paidDate: date("paid_date"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: taskStatusEnum("status").notNull().default('pending'),
  priority: text("priority").default('medium'),
  assignedTo: integer("assigned_to").references(() => users.id),
  caseId: integer("case_id").references(() => cases.id),
  dueDate: date("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: integer("created_by").references(() => users.id),
});

export const activityLog = pgTable("activity_log", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(),
  targetType: text("target_type").notNull(),
  targetId: integer("target_id").notNull(),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  cases: many(caseUsers),
  sessions: many(sessions),
  documents: many(documents),
  invoices: many(invoices),
  tasks: many(tasks),
  activityLog: many(activityLog),
}));

export const clientsRelations = relations(clients, ({ many, one }) => ({
  cases: many(cases),
  createdBy: one(users, {
    fields: [clients.createdBy],
    references: [users.id],
  }),
}));

export const casesRelations = relations(cases, ({ many, one }) => ({
  client: one(clients, {
    fields: [cases.clientId],
    references: [clients.id],
  }),
  users: many(caseUsers),
  sessions: many(sessions),
  documents: many(documents),
  invoices: many(invoices),
  tasks: many(tasks),
  createdBy: one(users, {
    fields: [cases.createdBy],
    references: [users.id],
  }),
}));

export const caseUsersRelations = relations(caseUsers, ({ one }) => ({
  case: one(cases, {
    fields: [caseUsers.caseId],
    references: [cases.id],
  }),
  user: one(users, {
    fields: [caseUsers.userId],
    references: [users.id],
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  case: one(cases, {
    fields: [sessions.caseId],
    references: [cases.id],
  }),
  createdBy: one(users, {
    fields: [sessions.createdBy],
    references: [users.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  case: one(cases, {
    fields: [documents.caseId],
    references: [cases.id],
  }),
  uploadedBy: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  case: one(cases, {
    fields: [invoices.caseId],
    references: [cases.id],
    relationName: "invoiceCase",
  }),
  createdBy: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  assignedTo: one(users, {
    fields: [tasks.assignedTo],
    references: [users.id],
  }),
  case: one(cases, {
    fields: [tasks.caseId],
    references: [cases.id],
  }),
  createdBy: one(users, {
    fields: [tasks.createdBy],
    references: [users.id],
  }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  user: one(users, {
    fields: [activityLog.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  createdBy: true,
});

export const insertCaseSchema = createInsertSchema(cases).omit({
  id: true,
  createdAt: true,
  createdBy: true,
});

export const insertSessionSchema = createInsertSchema(sessions).omit({
  id: true,
  createdAt: true,
  createdBy: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  uploadedAt: true,
  uploadedBy: true,
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  createdBy: true,
}).extend({
  caseId: z.number().optional(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  createdBy: true,
  completedAt: true,
});

export const insertActivityLogSchema = createInsertSchema(activityLog).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Client = typeof clients.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Case = typeof cases.$inferSelect;
export type InsertCase = z.infer<typeof insertCaseSchema>;
export type Session = typeof sessions.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Task = typeof tasks.$inferSelect;
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type ActivityLog = typeof activityLog.$inferSelect;
export type InsertActivityLog = z.infer<typeof insertActivityLogSchema>;
