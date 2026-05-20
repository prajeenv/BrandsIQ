/**
 * Database connection test script
 * Run with: npx tsx scripts/test-db.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  log: ["query", "info", "warn", "error"],
});

async function main() {
  console.log("🔌 Testing database connection...\n");

  try {
    // Test 1: Basic connection
    console.log("1️⃣ Testing basic connection...");
    await prisma.$connect();
    console.log("   ✅ Connected to database\n");

    // Test 2: Query database version
    console.log("2️⃣ Checking PostgreSQL version...");
    const result = await prisma.$queryRaw<[{ version: string }]>`SELECT version()`;
    console.log(`   ✅ PostgreSQL: ${result[0].version.split(",")[0]}\n`);

    // Test 3: Check all tables exist
    console.log("3️⃣ Verifying tables...");
    const tables = await prisma.$queryRaw<{ tablename: string }[]>`
      SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `;
    const tableNames = tables.map((t) => t.tablename).sort();
    console.log(`   ✅ Found ${tableNames.length} tables:`);
    tableNames.forEach((t) => console.log(`      - ${t}`));
    console.log();

    // Test 4: Create a test user
    console.log("4️⃣ Testing User CRUD operations...");
    const testEmail = `test-${Date.now()}@example.com`;

    // Create
    const user = await prisma.user.create({
      data: {
        email: testEmail,
        name: "Test User",
      },
    });
    console.log(`   ✅ Created user: ${user.id}`);

    // Read
    const foundUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { brandVoice: true },
    });
    console.log(`   ✅ Found user: ${foundUser?.email}`);
    console.log(`   ✅ Default tier: ${foundUser?.tier}`);
    console.log(`   ✅ Default credits: ${foundUser?.credits}`);
    console.log(`   ✅ Default sentiment credits: ${foundUser?.sentimentCredits}`);

    // Update
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { name: "Updated Test User" },
    });
    console.log(`   ✅ Updated user name: ${updatedUser.name}`);

    // Delete
    await prisma.user.delete({
      where: { id: user.id },
    });
    console.log(`   ✅ Deleted test user\n`);

    // Test 5: Test relations (BrandVoice)
    console.log("5️⃣ Testing relations...");
    const userWithBrandVoice = await prisma.user.create({
      data: {
        email: `test-relations-${Date.now()}@example.com`,
        name: "Relations Test User",
        brandVoice: {
          // V2 shape (iter 3 clean-reset). Other columns take DB defaults.
          create: {
            tone: "friendly_professional",
            keyPhrases: ["Thank you", "We appreciate"],
          },
        },
      },
      include: { brandVoice: true },
    });
    console.log(`   ✅ Created user with brand voice`);
    console.log(`   ✅ Brand voice tone: ${userWithBrandVoice.brandVoice?.tone}`);
    console.log(`   ✅ Key phrases: ${userWithBrandVoice.brandVoice?.keyPhrases.join(", ")}`);

    // Cleanup
    await prisma.user.delete({
      where: { id: userWithBrandVoice.id },
    });
    console.log(`   ✅ Cleaned up test data\n`);

    // Test 6: Test indexes
    console.log("6️⃣ Verifying indexes...");
    const indexes = await prisma.$queryRaw<{ indexname: string; tablename: string }[]>`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `;
    console.log(`   ✅ Found ${indexes.length} indexes`);
    console.log();

    // Summary
    console.log("═".repeat(50));
    console.log("✅ All database tests passed!");
    console.log("═".repeat(50));
    console.log("\nDatabase is ready for use.\n");

  } catch (error) {
    console.error("\n❌ Database test failed:");
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
