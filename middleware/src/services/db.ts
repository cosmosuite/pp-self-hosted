/**
 * Prisma database client (lazy initialization).
 */

import { PrismaClient } from "@prisma/client";

let prisma: PrismaClient | null = null;

export function getDb(): PrismaClient | null {
  if (!process.env.DATABASE_URL) return null;

  if (!prisma) {
    prisma = new PrismaClient();
    console.log("Prisma client initialized");
  }
  return prisma;
}

export function isDbEnabled(): boolean {
  return !!process.env.DATABASE_URL;
}
