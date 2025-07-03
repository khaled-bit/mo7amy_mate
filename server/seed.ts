import { db } from "./db";
import { users, clients, cases, documents } from "@shared/schema";
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
    phone: "+1234567890",
    role: "admin" as const,
  },
  {
    username: "lawyer1",
    password: "lawyer123",
    name: "Ahmed Al-Mahmoud",
    email: "ahmed@lawyermate.com",
    phone: "+1234567891",
    role: "lawyer" as const,
  },
  {
    username: "lawyer2",
    password: "lawyer123",
    name: "Sarah Al-Zahra",
    email: "sarah@lawyermate.com",
    phone: "+1234567892",
    role: "lawyer" as const,
  },
  {
    username: "assistant1",
    password: "assistant123",
    name: "Mohammad Al-Ali",
    email: "mohammad@lawyermate.com",
    phone: "+1234567893",
    role: "assistant" as const,
  },
  {
    username: "assistant2",
    password: "assistant123",
    name: "Fatima Al-Hassan",
    email: "fatima@lawyermate.com",
    phone: "+1234567894",
    role: "assistant" as const,
  },
];

async function seedDatabase() {
  try {
    console.log("🌱 Starting database seeding...");

    // Check if users already exist
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      console.log("📋 Users already exist in the database. Skipping seed.");
      console.log(`Found ${existingUsers.length} existing users:`);
      existingUsers.forEach(user => 
        console.log(`  - ${user.username} (${user.role}): ${user.name}`)
      );
      return;
    }

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

      console.log(`✅ Created user: ${insertedUser.username} (${insertedUser.role})`);
    }

    // Check if we need to create sample data
    const existingClients = await db.select().from(clients);
    if (existingClients.length === 0) {
      console.log("👥 Creating sample clients...");
      
      const [client1] = await db.insert(clients).values({
        name: "أحمد محمد علي",
        phone: "+966501234567",
        email: "ahmed@example.com",
        address: "الرياض، المملكة العربية السعودية",
        nationalId: "1234567890",
        notes: "عميل جديد",
        createdBy: 1,
      }).returning();

      const [client2] = await db.insert(clients).values({
        name: "فاطمة عبدالله",
        phone: "+966507654321",
        email: "fatima@example.com",
        address: "جدة، المملكة العربية السعودية",
        nationalId: "0987654321",
        notes: "عميل منتظم",
        createdBy: 1,
      }).returning();

      console.log("✅ Created sample clients");

      console.log("⚖️ Creating sample cases...");
      
      const [case1] = await db.insert(cases).values({
        title: "قضية تجارية - شركة التقنية المتقدمة",
        type: "commercial",
        court: "محكمة التجارة",
        status: "active",
        clientId: client1.id,
        description: "نزاع تجاري حول عقد توريد",
        createdBy: 1,
      }).returning();

      const [case2] = await db.insert(cases).values({
        title: "قضية عمالية - محمد السيد",
        type: "labor",
        court: "محكمة العمل",
        status: "active",
        clientId: client2.id,
        description: "مطالبة بإنهاء خدمة تعسفي",
        createdBy: 1,
      }).returning();

      console.log("✅ Created sample cases");

      console.log("📄 Creating sample documents...");
      
      await db.insert(documents).values([
        {
          caseId: case1.id,
          title: "عقد التوريد الأصلي",
          filePath: "uploads/sample-contract.pdf",
          fileSize: 1024000,
          fileType: "application/pdf",
          description: "نسخة من عقد التوريد الموقع",
          uploadedBy: 1,
        },
        {
          caseId: case1.id,
          title: "فاتورة المدفوعات",
          filePath: "uploads/sample-invoice.pdf",
          fileSize: 512000,
          fileType: "application/pdf",
          description: "فاتورة المدفوعات المقدمة",
          uploadedBy: 1,
        },
        {
          caseId: case2.id,
          title: "عقد العمل",
          filePath: "uploads/sample-employment.pdf",
          fileSize: 768000,
          fileType: "application/pdf",
          description: "عقد العمل الأصلي",
          uploadedBy: 1,
        },
        {
          caseId: case2.id,
          title: "إشعار الفصل",
          filePath: "uploads/sample-termination.pdf",
          fileSize: 256000,
          fileType: "application/pdf",
          description: "إشعار الفصل من العمل",
          uploadedBy: 1,
        }
      ]);

      console.log("✅ Created sample documents");
    }

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("\n📋 Default Login Credentials:");
    console.log("┌─────────────┬──────────────┬────────────────────────┐");
    console.log("│ Username    │ Password     │ Role                   │");
    console.log("├─────────────┼──────────────┼────────────────────────┤");
    console.log("│ admin       │ admin123     │ Administrator          │");
    console.log("│ lawyer1     │ lawyer123    │ Lawyer                 │");
    console.log("│ lawyer2     │ lawyer123    │ Lawyer                 │");
    console.log("│ assistant1  │ assistant123 │ Assistant              │");
    console.log("│ assistant2  │ assistant123 │ Assistant              │");
    console.log("└─────────────┴──────────────┴────────────────────────┘");
    
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seed function
seedDatabase()
  .then(() => {
    console.log("✨ Seed script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Seed script failed:", error);
    process.exit(1);
  });

export { seedDatabase }; 