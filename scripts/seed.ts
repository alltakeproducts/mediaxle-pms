/**
 * Seed script: creates the initial admin account in MongoDB.
 * Run with: npx tsx scripts/seed.ts
 */
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/performance-tracker";
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || "admin123";
const ADMIN_NAME = process.env.SEED_ADMIN_NAME || "Administrator";

async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

async function seed() {
  console.log(`Connecting to MongoDB...`);
  await mongoose.connect(MONGODB_URI);

  const db = mongoose.connection.db!;

  // Check if admin already exists
  const existing = await db.collection("admins").findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`Admin "${ADMIN_EMAIL}" already exists.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  await db.collection("admins").insertOne({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    passwordHash,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Admin created successfully:`);
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});