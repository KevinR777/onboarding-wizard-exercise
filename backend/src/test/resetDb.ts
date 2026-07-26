import { prisma } from "../prisma.js";

export const resetDb = () => prisma.onboardingSession.deleteMany();
