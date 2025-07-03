import { pgTable, foreignKey, serial, text, integer, date, timestamp, numeric, boolean, time, unique, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const caseStatus = pgEnum("case_status", ['active', 'pending', 'completed', 'cancelled'])
export const sessionStatus = pgEnum("session_status", ['scheduled', 'completed', 'cancelled', 'postponed'])
export const taskStatus = pgEnum("task_status", ['pending', 'in_progress', 'completed', 'cancelled'])
export const userRole = pgEnum("user_role", ['admin', 'lawyer', 'assistant'])


export const cases = pgTable("cases", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	type: text().notNull(),
	status: caseStatus().default('active').notNull(),
	court: text(),
	clientId: integer("client_id").notNull(),
	startDate: date("start_date"),
	endDate: date("end_date"),
	description: text(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	createdBy: integer("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "cases_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "cases_created_by_users_id_fk"
		}),
]);

export const clients = pgTable("clients", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	phone: text(),
	email: text(),
	address: text(),
	nationalId: text("national_id"),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	createdBy: integer("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "clients_created_by_users_id_fk"
		}),
]);

export const documents = pgTable("documents", {
	id: serial().primaryKey().notNull(),
	caseId: integer("case_id").notNull(),
	title: text().notNull(),
	filePath: text("file_path").notNull(),
	fileSize: integer("file_size"),
	fileType: text("file_type"),
	description: text(),
	uploadedAt: timestamp("uploaded_at", { mode: 'string' }).defaultNow(),
	uploadedBy: integer("uploaded_by"),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "documents_case_id_cases_id_fk"
		}),
	foreignKey({
			columns: [table.uploadedBy],
			foreignColumns: [users.id],
			name: "documents_uploaded_by_users_id_fk"
		}),
]);

export const invoices = pgTable("invoices", {
	id: serial().primaryKey().notNull(),
	caseId: integer("case_id").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	description: text(),
	paid: boolean().default(false),
	dueDate: date("due_date"),
	paidDate: date("paid_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	createdBy: integer("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "invoices_case_id_cases_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "invoices_created_by_users_id_fk"
		}),
]);

export const sessions = pgTable("sessions", {
	id: serial().primaryKey().notNull(),
	caseId: integer("case_id").notNull(),
	title: text().notNull(),
	date: date().notNull(),
	time: time().notNull(),
	location: text(),
	status: sessionStatus().default('scheduled').notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	createdBy: integer("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "sessions_case_id_cases_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "sessions_created_by_users_id_fk"
		}),
]);

export const tasks = pgTable("tasks", {
	id: serial().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	status: taskStatus().default('pending').notNull(),
	priority: text().default('medium'),
	assignedTo: integer("assigned_to"),
	caseId: integer("case_id"),
	dueDate: date("due_date"),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	createdBy: integer("created_by"),
}, (table) => [
	foreignKey({
			columns: [table.assignedTo],
			foreignColumns: [users.id],
			name: "tasks_assigned_to_users_id_fk"
		}),
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "tasks_case_id_cases_id_fk"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "tasks_created_by_users_id_fk"
		}),
]);

export const activityLog = pgTable("activity_log", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	action: text().notNull(),
	targetType: text("target_type").notNull(),
	targetId: integer("target_id").notNull(),
	details: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "activity_log_user_id_users_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	username: text().notNull(),
	password: text().notNull(),
	name: text().notNull(),
	email: text(),
	phone: text(),
	role: userRole().default('assistant').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	unique("users_username_unique").on(table.username),
]);

export const caseUsers = pgTable("case_users", {
	id: serial().primaryKey().notNull(),
	caseId: integer("case_id").notNull(),
	userId: integer("user_id").notNull(),
	role: text(),
	assignedAt: timestamp("assigned_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.caseId],
			foreignColumns: [cases.id],
			name: "case_users_case_id_cases_id_fk"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "case_users_user_id_users_id_fk"
		}),
]);
