import "dotenv/config";
import { prisma } from "../src/prisma.js";

const attempts = await prisma.validationAttempt.findMany({ orderBy: { createdAt: "asc" } });
console.log(`\nValidationAttempt (${attempts.length} row${attempts.length === 1 ? "" : "s"}):`);
console.table(
  attempts.map((attempt) => ({
    ...attempt,
    payload: attempt.payload ? JSON.stringify(attempt.payload) : null,
  })),
);

await prisma.$disconnect();
