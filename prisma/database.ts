/**
 * Database Client Service
 *
 * Provides a singleton Prisma client instance for server-side operations
 * with proper connection management and edge/serverless compatibility.
 */

// Ensure we're in a Node.js server environment
if (typeof window !== "undefined") {
  throw new Error("Database client should only be imported on the server side");
}

import { PrismaClient } from "../lib/generated/prisma/client";

// Global variable to store the Prisma client instance
declare global {
  var __prisma: InstanceType<typeof PrismaClient> | undefined;
}

// Create singleton Prisma client instance
export const db =
  globalThis.__prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// In development, store the client in globalThis to prevent multiple instances
if (process.env.NODE_ENV === "development") {
  globalThis.__prisma = db;
}

// Graceful shutdown handling
if (typeof window === "undefined") {
  process.on("beforeExit", async () => {
    await db.$disconnect();
  });
}

/**
 * Ensures user exists in database, creates if needed
 */
export async function ensureUser(
  userId: string,
  email?: string,
  name?: string,
) {
  try {
    const user = await db.user.upsert({
      where: { id: userId },
      update: {
        // Update email/name if provided
        ...(email && { email }),
        ...(name && { name }),
      },
      create: {
        id: userId,
        email: email || `user-${userId}@example.com`, // Fallback email
        name: name || null,
      },
    });
    return user;
  } catch (error) {
    console.error("Error ensuring user exists:", error);
    throw new Error("Failed to create or update user");
  }
}

/**
 * Creates or updates a challenge in the database
 */
export async function ensureChallenge(
  challengeId: string,
  challengeDate: string,
  content: string,
  title: string,
  difficulty: string,
) {
  try {
    const challenge = await db.challenge.upsert({
      where: { id: challengeId },
      update: {
        content,
        title,
        difficulty,
      },
      create: {
        id: challengeId,
        date: new Date(challengeDate),
        content,
        title,
        difficulty,
      },
    });
    return challenge;
  } catch (error) {
    console.error("Error ensuring challenge exists:", error);
    throw new Error("Failed to create or update challenge");
  }
}
