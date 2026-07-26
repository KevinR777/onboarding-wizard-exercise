import "dotenv/config";
import { prisma } from "../src/prisma.js";

const sessions = await prisma.onboardingSession.findMany({ orderBy: { createdAt: "asc" } });
console.log(`\nOnboardingSession (${sessions.length} row${sessions.length === 1 ? "" : "s"}):`);
console.table(sessions);

await prisma.$disconnect();
