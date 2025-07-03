import { db } from "./db";
import { users } from "@shared/schema";
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