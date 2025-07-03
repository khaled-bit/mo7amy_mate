import { relations } from "drizzle-orm/relations";
import { clients, cases, users, documents, invoices, sessions, tasks, activityLog, caseUsers } from "./schema";

export const casesRelations = relations(cases, ({one, many}) => ({
	client: one(clients, {
		fields: [cases.clientId],
		references: [clients.id]
	}),
	user: one(users, {
		fields: [cases.createdBy],
		references: [users.id]
	}),
	documents: many(documents),
	invoices: many(invoices),
	sessions: many(sessions),
	tasks: many(tasks),
	caseUsers: many(caseUsers),
}));

export const clientsRelations = relations(clients, ({one, many}) => ({
	cases: many(cases),
	user: one(users, {
		fields: [clients.createdBy],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	cases: many(cases),
	clients: many(clients),
	documents: many(documents),
	invoices: many(invoices),
	sessions: many(sessions),
	tasks_assignedTo: many(tasks, {
		relationName: "tasks_assignedTo_users_id"
	}),
	tasks_createdBy: many(tasks, {
		relationName: "tasks_createdBy_users_id"
	}),
	activityLogs: many(activityLog),
	caseUsers: many(caseUsers),
}));

export const documentsRelations = relations(documents, ({one}) => ({
	case: one(cases, {
		fields: [documents.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [documents.uploadedBy],
		references: [users.id]
	}),
}));

export const invoicesRelations = relations(invoices, ({one}) => ({
	case: one(cases, {
		fields: [invoices.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [invoices.createdBy],
		references: [users.id]
	}),
}));

export const sessionsRelations = relations(sessions, ({one}) => ({
	case: one(cases, {
		fields: [sessions.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [sessions.createdBy],
		references: [users.id]
	}),
}));

export const tasksRelations = relations(tasks, ({one}) => ({
	user_assignedTo: one(users, {
		fields: [tasks.assignedTo],
		references: [users.id],
		relationName: "tasks_assignedTo_users_id"
	}),
	case: one(cases, {
		fields: [tasks.caseId],
		references: [cases.id]
	}),
	user_createdBy: one(users, {
		fields: [tasks.createdBy],
		references: [users.id],
		relationName: "tasks_createdBy_users_id"
	}),
}));

export const activityLogRelations = relations(activityLog, ({one}) => ({
	user: one(users, {
		fields: [activityLog.userId],
		references: [users.id]
	}),
}));

export const caseUsersRelations = relations(caseUsers, ({one}) => ({
	case: one(cases, {
		fields: [caseUsers.caseId],
		references: [cases.id]
	}),
	user: one(users, {
		fields: [caseUsers.userId],
		references: [users.id]
	}),
}));