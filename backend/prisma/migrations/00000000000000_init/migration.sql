-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "WizardStep" AS ENUM ('DETAILS', 'VALIDATE', 'REVIEW');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'VALID', 'PARTIAL', 'INVALID', 'UNAVAILABLE');

-- CreateTable
CREATE TABLE "OnboardingSession" (
    "id" TEXT NOT NULL,
    "currentStep" "WizardStep" NOT NULL DEFAULT 'DETAILS',
    "companyName" TEXT,
    "providerAccountId" TEXT,
    "providerApiKey" TEXT,
    "isLive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnboardingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationAttempt" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ValidationAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ValidationAttempt_sessionId_createdAt_idx" ON "ValidationAttempt"("sessionId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "ValidationAttempt" ADD CONSTRAINT "ValidationAttempt_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "OnboardingSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex (partial unique index; Prisma's schema DSL can't express a WHERE
-- clause on @@unique, so this is applied by hand rather than declared in schema.prisma)
-- Guarantees at most one PENDING ValidationAttempt per session.
CREATE UNIQUE INDEX "ValidationAttempt_sessionId_pending_key" ON "ValidationAttempt"("sessionId") WHERE "status" = 'PENDING';

