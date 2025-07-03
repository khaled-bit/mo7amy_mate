import { db } from "./db";
import { 
  users, 
  clients, 
  cases, 
  caseUsers, 
  sessions, 
  documents, 
  invoices, 
  tasks, 
  activityLog 
} from "@shared/schema";
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

const seedUsers = [
  {
    username: "admin",
    password: "admin123",
    name: "System Administrator",
    email: "admin@lawyermate.com",
    phone: "+201234567890",
    role: "admin" as const,
  },
  {
    username: "lawyer1",
    password: "lawyer123",
    name: "Ahmed Al-Mahmoud",
    email: "ahmed@lawyermate.com",
    phone: "+201234567891",
    role: "lawyer" as const,
  },
  {
    username: "lawyer2",
    password: "lawyer123",
    name: "Sarah Al-Zahra",
    email: "sarah@lawyermate.com",
    phone: "+201234567892",
    role: "lawyer" as const,
  },
  {
    username: "lawyer3",
    password: "lawyer123",
    name: "Mohammad Al-Said",
    email: "mohammad.said@lawyermate.com",
    phone: "+201234567893",
    role: "lawyer" as const,
  },
  {
    username: "assistant1",
    password: "assistant123",
    name: "Fatima Al-Hassan",
    email: "fatima@lawyermate.com",
    phone: "+201234567894",
    role: "assistant" as const,
  },
  {
    username: "assistant2",
    password: "assistant123",
    name: "Omar Al-Ali",
    email: "omar@lawyermate.com",
    phone: "+201234567895",
    role: "assistant" as const,
  },
];

const seedClients = [
  {
    name: "Khaled Al-Rashid",
    phone: "+201111111111",
    email: "khaled.rashid@email.com",
    address: "123 Al-Tahrir Square, Cairo",
    nationalId: "29012345678901",
    notes: "Client since 2020, commercial law specialist needed",
  },
  {
    name: "Mona Al-Sharif",
    phone: "+201222222222",
    email: "mona.sharif@email.com",
    address: "456 Al-Maadi Street, Cairo",
    nationalId: "28512345678902",
    notes: "Family law case, divorce proceedings",
  },
  {
    name: "Hassan Al-Masri",
    phone: "+201333333333",
    email: "hassan.masri@email.com",
    address: "789 Al-Zamalek Avenue, Cairo",
    nationalId: "27212345678903",
    notes: "Real estate dispute, urgent case",
  },
  {
    name: "Layla Al-Ahmad",
    phone: "+201444444444",
    email: "layla.ahmad@email.com",
    address: "321 Al-Heliopolis Road, Cairo",
    nationalId: "30112345678904",
    notes: "Employment law case, wrongful termination",
  },
  {
    name: "Ahmed Al-Farouk",
    phone: "+201555555555",
    email: "ahmed.farouk@email.com",
    address: "654 Al-Nasr City, Cairo",
    nationalId: "26812345678905",
    notes: "Criminal defense case, theft charges",
  },
  {
    name: "Nadia Al-Sayed",
    phone: "+201666666666",
    email: "nadia.sayed@email.com",
    address: "987 Al-Giza Pyramids Road, Giza",
    nationalId: "29712345678906",
    notes: "Intellectual property case, patent dispute",
  },
];

async function comprehensiveSeed() {
  try {
    console.log("🚀 Starting comprehensive database seeding...");

    // Check if users already exist
    const existingUsers = await db.select().from(users);
    let usersList: any[] = [];

    if (existingUsers.length === 0) {
      console.log("👤 Seeding users...");
      for (const userData of seedUsers) {
        const hashedPassword = await hashPassword(userData.password);
        
        const [insertedUser] = await db.insert(users).values({
          username: userData.username,
          password: hashedPassword,
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          role: userData.role,
        }).returning();

        usersList.push(insertedUser);
        console.log(`✅ Created user: ${insertedUser.username} (${insertedUser.role})`);
      }
    } else {
      console.log("📋 Users already exist, using existing users");
      usersList = existingUsers;
    }

    // Seed clients
    const existingClients = await db.select().from(clients);
    let clientsList: any[] = [];

    if (existingClients.length === 0) {
      console.log("🏢 Seeding clients...");
      for (const clientData of seedClients) {
        const [insertedClient] = await db.insert(clients).values({
          ...clientData,
          createdBy: usersList[1]?.id || usersList[0].id,
        }).returning();

        clientsList.push(insertedClient);
        console.log(`✅ Created client: ${insertedClient.name}`);
      }
    } else {
      console.log("📋 Clients already exist, using existing clients");
      clientsList = existingClients;
    }

    // Seed cases
    const existingCases = await db.select().from(cases);
    let casesList: any[] = [];

    if (existingCases.length === 0) {
      console.log("⚖️ Seeding cases...");
      const casesData = [
        {
          title: "Commercial Contract Dispute - Al-Rashid vs Tech Corp",
          type: "Commercial Law",
          status: "active" as const,
          court: "Cairo Commercial Court",
          clientId: clientsList[0].id,
          startDate: "2024-01-15",
          description: "Contract breach dispute involving software licensing agreement",
          notes: "Client claims breach of exclusivity clause",
          createdBy: usersList[1]?.id || usersList[0].id,
        },
        {
          title: "Divorce Proceedings - Al-Sharif Family Case",
          type: "Family Law",
          status: "active" as const,
          court: "Cairo Family Court",
          clientId: clientsList[1].id,
          startDate: "2024-02-01",
          description: "Contested divorce with custody and property division issues",
          notes: "Mediation attempted, proceeding to trial",
          createdBy: usersList[2]?.id || usersList[0].id,
        },
        {
          title: "Real Estate Ownership Dispute - Al-Masri Property",
          type: "Real Estate Law",
          status: "pending" as const,
          court: "Cairo Real Estate Court",
          clientId: clientsList[2].id,
          startDate: "2024-01-20",
          description: "Property ownership dispute with neighboring landowner",
          notes: "Survey required, boundary dispute",
          createdBy: usersList[1]?.id || usersList[0].id,
        },
        {
          title: "Employment Termination Case - Al-Ahmad vs Company",
          type: "Employment Law",
          status: "active" as const,
          court: "Cairo Labor Court",
          clientId: clientsList[3].id,
          startDate: "2024-02-10",
          description: "Wrongful termination claim with discrimination allegations",
          notes: "Strong case, employer violated procedures",
          createdBy: usersList[3]?.id || usersList[0].id,
        },
        {
          title: "Criminal Defense - Al-Farouk Theft Case",
          type: "Criminal Law",
          status: "active" as const,
          court: "Cairo Criminal Court",
          clientId: clientsList[4].id,
          startDate: "2024-01-25",
          description: "Defense against theft charges, lack of evidence",
          notes: "Alibi evidence available, weak prosecution case",
          createdBy: usersList[2]?.id || usersList[0].id,
        },
        {
          title: "Patent Infringement - Al-Sayed IP Case",
          type: "Intellectual Property",
          status: "completed" as const,
          court: "Cairo IP Court",
          clientId: clientsList[5].id,
          startDate: "2023-11-01",
          endDate: "2024-01-15",
          description: "Patent infringement claim successfully resolved",
          notes: "Settlement reached, favorable terms for client",
          createdBy: usersList[3]?.id || usersList[0].id,
        },
      ];

      for (const caseData of casesData) {
        const [insertedCase] = await db.insert(cases).values(caseData).returning();
        casesList.push(insertedCase);
        console.log(`✅ Created case: ${insertedCase.title}`);
      }
    } else {
      console.log("📋 Cases already exist, using existing cases");
      casesList = existingCases;
    }

    // Seed case-user assignments
    const existingCaseUsers = await db.select().from(caseUsers);
    if (existingCaseUsers.length === 0) {
      console.log("👥 Assigning users to cases...");
      const caseUserAssignments = [
        { caseId: casesList[0].id, userId: usersList[1].id, role: "Lead Lawyer" },
        { caseId: casesList[0].id, userId: usersList[4].id, role: "Assistant" },
        { caseId: casesList[1].id, userId: usersList[2].id, role: "Lead Lawyer" },
        { caseId: casesList[2].id, userId: usersList[1].id, role: "Lead Lawyer" },
        { caseId: casesList[2].id, userId: usersList[5].id, role: "Assistant" },
        { caseId: casesList[3].id, userId: usersList[3].id, role: "Lead Lawyer" },
        { caseId: casesList[4].id, userId: usersList[2].id, role: "Lead Lawyer" },
        { caseId: casesList[4].id, userId: usersList[4].id, role: "Assistant" },
        { caseId: casesList[5].id, userId: usersList[3].id, role: "Lead Lawyer" },
      ];

      for (const assignment of caseUserAssignments) {
        await db.insert(caseUsers).values(assignment);
        console.log(`✅ Assigned user ${assignment.userId} to case ${assignment.caseId}`);
      }
    }

    // Seed sessions
    const existingSessions = await db.select().from(sessions);
    if (existingSessions.length === 0) {
      console.log("📅 Seeding court sessions...");
      const sessionsData = [
        {
          caseId: casesList[0].id,
          title: "Initial Hearing - Contract Dispute",
          date: "2024-01-25",
          time: "10:00:00",
          location: "Cairo Commercial Court - Room 3",
          status: "completed" as const,
          notes: "Both parties presented opening statements",
          createdBy: usersList[1].id,
        },
        {
          caseId: casesList[0].id,
          title: "Evidence Presentation Hearing",
          date: "2024-02-15",
          time: "11:00:00",
          location: "Cairo Commercial Court - Room 3",
          status: "scheduled" as const,
          notes: "Document evidence to be presented",
          createdBy: usersList[1].id,
        },
        {
          caseId: casesList[1].id,
          title: "Divorce Mediation Session",
          date: "2024-02-05",
          time: "14:00:00",
          location: "Cairo Family Court - Mediation Room 1",
          status: "completed" as const,
          notes: "Mediation failed, proceeding to trial",
          createdBy: usersList[2].id,
        },
        {
          caseId: casesList[1].id,
          title: "Custody Hearing",
          date: "2024-02-20",
          time: "09:30:00",
          location: "Cairo Family Court - Room 2",
          status: "scheduled" as const,
          notes: "Child welfare assessment required",
          createdBy: usersList[2].id,
        },
        {
          caseId: casesList[3].id,
          title: "Employment Case - First Hearing",
          date: "2024-02-18",
          time: "13:00:00",
          location: "Cairo Labor Court - Room 1",
          status: "scheduled" as const,
          notes: "HR records subpoenaed",
          createdBy: usersList[3].id,
        },
        {
          caseId: casesList[4].id,
          title: "Criminal Case - Arraignment",
          date: "2024-02-12",
          time: "10:30:00",
          location: "Cairo Criminal Court - Room 5",
          status: "completed" as const,
          notes: "Plea entered, bail set",
          createdBy: usersList[2].id,
        },
      ];

      for (const sessionData of sessionsData) {
        const [insertedSession] = await db.insert(sessions).values(sessionData).returning();
        console.log(`✅ Created session: ${insertedSession.title}`);
      }
    }

    // Seed documents
    const existingDocuments = await db.select().from(documents);
    if (existingDocuments.length === 0) {
      console.log("📄 Seeding documents...");
      const documentsData = [
        {
          caseId: casesList[0].id,
          title: "Software License Agreement",
          filePath: "/uploads/contracts/software_license_2024.pdf",
          fileSize: 1024000,
          fileType: "application/pdf",
          description: "Original software licensing contract",
          uploadedBy: usersList[4].id,
        },
        {
          caseId: casesList[0].id,
          title: "Email Correspondence",
          filePath: "/uploads/evidence/email_chain_dispute.pdf",
          fileSize: 256000,
          fileType: "application/pdf",
          description: "Email communications regarding contract breach",
          uploadedBy: usersList[1].id,
        },
        {
          caseId: casesList[1].id,
          title: "Marriage Certificate",
          filePath: "/uploads/family/marriage_cert_sharif.pdf",
          fileSize: 512000,
          fileType: "application/pdf",
          description: "Official marriage certificate",
          uploadedBy: usersList[2].id,
        },
        {
          caseId: casesList[1].id,
          title: "Financial Disclosure",
          filePath: "/uploads/family/financial_disclosure.xlsx",
          fileSize: 128000,
          fileType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          description: "Complete financial assets disclosure",
          uploadedBy: usersList[2].id,
        },
        {
          caseId: casesList[2].id,
          title: "Property Deed",
          filePath: "/uploads/realestate/property_deed_masri.pdf",
          fileSize: 2048000,
          fileType: "application/pdf",
          description: "Original property ownership deed",
          uploadedBy: usersList[5].id,
        },
        {
          caseId: casesList[3].id,
          title: "Employment Contract",
          filePath: "/uploads/employment/contract_ahmad.pdf",
          fileSize: 768000,
          fileType: "application/pdf",
          description: "Original employment agreement",
          uploadedBy: usersList[3].id,
        },
        {
          caseId: casesList[4].id,
          title: "Alibi Evidence",
          filePath: "/uploads/criminal/alibi_evidence.pdf",
          fileSize: 1536000,
          fileType: "application/pdf",
          description: "CCTV footage and witness statements",
          uploadedBy: usersList[2].id,
        },
      ];

      for (const docData of documentsData) {
        const [insertedDoc] = await db.insert(documents).values(docData).returning();
        console.log(`✅ Created document: ${insertedDoc.title}`);
      }
    }

    // Seed invoices
    const existingInvoices = await db.select().from(invoices);
    if (existingInvoices.length === 0) {
      console.log("💰 Seeding invoices...");
      const invoicesData = [
        {
          caseId: casesList[0].id,
          amount: "15000.00",
          description: "Initial consultation and case preparation",
          paid: true,
          dueDate: "2024-01-30",
          paidDate: "2024-01-28",
          createdBy: usersList[1].id,
        },
        {
          caseId: casesList[0].id,
          amount: "25000.00",
          description: "Court representation and evidence preparation",
          paid: false,
          dueDate: "2024-02-28",
          createdBy: usersList[1].id,
        },
        {
          caseId: casesList[1].id,
          amount: "20000.00",
          description: "Divorce proceedings and mediation",
          paid: true,
          dueDate: "2024-02-15",
          paidDate: "2024-02-10",
          createdBy: usersList[2].id,
        },
        {
          caseId: casesList[2].id,
          amount: "18000.00",
          description: "Real estate dispute consultation",
          paid: false,
          dueDate: "2024-02-25",
          createdBy: usersList[1].id,
        },
        {
          caseId: casesList[3].id,
          amount: "12000.00",
          description: "Employment law case preparation",
          paid: true,
          dueDate: "2024-02-20",
          paidDate: "2024-02-18",
          createdBy: usersList[3].id,
        },
        {
          caseId: casesList[4].id,
          amount: "30000.00",
          description: "Criminal defense representation",
          paid: false,
          dueDate: "2024-03-01",
          createdBy: usersList[2].id,
        },
        {
          caseId: casesList[5].id,
          amount: "45000.00",
          description: "IP case full representation (completed)",
          paid: true,
          dueDate: "2024-01-20",
          paidDate: "2024-01-18",
          createdBy: usersList[3].id,
        },
      ];

      for (const invoiceData of invoicesData) {
        const [insertedInvoice] = await db.insert(invoices).values(invoiceData).returning();
        console.log(`✅ Created invoice: ${insertedInvoice.amount} EGP for case ${insertedInvoice.caseId}`);
      }
    }

    // Seed tasks
    const existingTasks = await db.select().from(tasks);
    if (existingTasks.length === 0) {
      console.log("📋 Seeding tasks...");
      const tasksData = [
        {
          title: "Prepare contract analysis report",
          description: "Analyze the software license agreement for breach clauses",
          status: "completed" as const,
          priority: "high",
          assignedTo: usersList[4].id, // assistant1
          caseId: casesList[0].id,
          dueDate: "2024-01-20",
          completedAt: new Date("2024-01-19T14:30:00Z"),
          createdBy: usersList[1].id,
        },
        {
          title: "Collect witness statements",
          description: "Interview key witnesses for the commercial dispute",
          status: "in_progress" as const,
          priority: "high",
          assignedTo: usersList[1].id, // lawyer1
          caseId: casesList[0].id,
          dueDate: "2024-02-10",
          createdBy: usersList[1].id,
        },
        {
          title: "File custody evaluation request",
          description: "Submit request for child custody evaluation",
          status: "pending" as const,
          priority: "medium",
          assignedTo: usersList[2].id, // lawyer2
          caseId: casesList[1].id,
          dueDate: "2024-02-15",
          createdBy: usersList[2].id,
        },
        {
          title: "Property survey coordination",
          description: "Arrange professional property boundary survey",
          status: "pending" as const,
          priority: "high",
          assignedTo: usersList[5].id, // assistant2
          caseId: casesList[2].id,
          dueDate: "2024-02-20",
          createdBy: usersList[1].id,
        },
        {
          title: "Review HR policies",
          description: "Analyze company HR policies for policy violations",
          status: "in_progress" as const,
          priority: "medium",
          assignedTo: usersList[3].id, // lawyer3
          caseId: casesList[3].id,
          dueDate: "2024-02-12",
          createdBy: usersList[3].id,
        },
        {
          title: "Compile alibi evidence",
          description: "Organize all alibi evidence and witness statements",
          status: "completed" as const,
          priority: "high",
          assignedTo: usersList[4].id, // assistant1
          caseId: casesList[4].id,
          dueDate: "2024-02-05",
          completedAt: new Date("2024-02-04T16:45:00Z"),
          createdBy: usersList[2].id,
        },
        {
          title: "Draft settlement agreement",
          description: "Prepare final settlement documentation",
          status: "completed" as const,
          priority: "medium",
          assignedTo: usersList[3].id, // lawyer3
          caseId: casesList[5].id,
          dueDate: "2024-01-10",
          completedAt: new Date("2024-01-08T11:20:00Z"),
          createdBy: usersList[3].id,
        },
      ];

      for (const taskData of tasksData) {
        const [insertedTask] = await db.insert(tasks).values(taskData).returning();
        console.log(`✅ Created task: ${insertedTask.title}`);
      }
    }

    // Seed activity logs
    const existingLogs = await db.select().from(activityLog);
    if (existingLogs.length === 0) {
      console.log("📊 Seeding activity logs...");
      const activitiesData = [
        {
          userId: usersList[1].id,
          action: "create_case",
          targetType: "case",
          targetId: casesList[0].id,
          details: "Created new commercial law case for Al-Rashid",
        },
        {
          userId: usersList[2].id,
          action: "create_case",
          targetType: "case",
          targetId: casesList[1].id,
          details: "Created new family law case for Al-Sharif",
        },
        {
          userId: usersList[1].id,
          action: "upload_document",
          targetType: "document",
          targetId: 1,
          details: "Uploaded software license agreement",
        },
        {
          userId: usersList[4].id,
          action: "complete_task",
          targetType: "task",
          targetId: 1,
          details: "Completed contract analysis report",
        },
        {
          userId: usersList[2].id,
          action: "schedule_session",
          targetType: "session",
          targetId: 1,
          details: "Scheduled initial hearing for commercial dispute",
        },
        {
          userId: usersList[3].id,
          action: "create_invoice",
          targetType: "invoice",
          targetId: 1,
          details: "Created invoice for case consultation",
        },
        {
          userId: usersList[1].id,
          action: "update_case",
          targetType: "case",
          targetId: casesList[0].id,
          details: "Updated case status and notes",
        },
        {
          userId: usersList[5].id,
          action: "upload_document",
          targetType: "document",
          targetId: 2,
          details: "Uploaded property deed for real estate case",
        },
      ];

      for (const activityData of activitiesData) {
        await db.insert(activityLog).values(activityData);
        console.log(`✅ Created activity log: ${activityData.action}`);
      }
    }

    console.log("\n🎉 Comprehensive database seeding completed successfully!");
    console.log("\n📊 Database Summary:");
    console.log(`👤 Users: ${usersList.length}`);
    console.log(`🏢 Clients: ${clientsList.length}`);
    console.log(`⚖️ Cases: ${casesList.length}`);
    console.log(`📅 Sessions: ${(await db.select().from(sessions)).length}`);
    console.log(`📄 Documents: ${(await db.select().from(documents)).length}`);
    console.log(`💰 Invoices: ${(await db.select().from(invoices)).length}`);
    console.log(`📋 Tasks: ${(await db.select().from(tasks)).length}`);
    console.log(`📊 Activity Logs: ${(await db.select().from(activityLog)).length}`);
    
    console.log("\n🔐 Login Credentials:");
    console.log("┌─────────────┬──────────────┬────────────────────────┐");
    console.log("│ Username    │ Password     │ Role                   │");
    console.log("├─────────────┼──────────────┼────────────────────────┤");
    console.log("│ admin       │ admin123     │ Administrator          │");
    console.log("│ lawyer1     │ lawyer123    │ Lawyer (Ahmed)         │");
    console.log("│ lawyer2     │ lawyer123    │ Lawyer (Sarah)         │");
    console.log("│ lawyer3     │ lawyer123    │ Lawyer (Mohammad)      │");
    console.log("│ assistant1  │ assistant123 │ Assistant (Fatima)     │");
    console.log("│ assistant2  │ assistant123 │ Assistant (Omar)       │");
    console.log("└─────────────┴──────────────┴────────────────────────┘");

    console.log("\n🚀 System is ready with realistic legal data!");
    
  } catch (error) {
    console.error("❌ Error in comprehensive seeding:", error);
    throw error;
  }
}

// Run the comprehensive seed function
comprehensiveSeed()
  .then(() => {
    console.log("✨ Comprehensive seed script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Comprehensive seed script failed:", error);
    process.exit(1);
  });

export { comprehensiveSeed }; 