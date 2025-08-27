import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { isGeminiEnabled } from "../lib/ai-generation/config/index.js";
import {
  type GenerationResult,
  generateTodaysChallenge,
} from "../lib/ai-generation/index.js";
import { challengeService, getTodaysDate } from "../lib/challenge/index.js";
import { logger } from "../lib/logger.js";
import { db, ensureChallenge, ensureUser } from "../prisma/database.js";
import type { DifficultyLevel } from "../types/index.js";

/**
 * Zod validation schemas for tRPC procedures
 * Ensures type safety and input validation across the API
 */
const schemas = {
  userId: z.string().min(1, "User ID is required and cannot be empty"),
  userEmail: z
    .string()
    .email({ message: "Please provide a valid email address" })
    .optional(),
  challengeId: z
    .string()
    .min(1, "Challenge ID is required and cannot be empty"),
  challengeDate: z.string().min(1, "Challenge date is required in ISO format"),
  timeMs: z
    .number()
    .positive("Completion time must be a positive number in milliseconds"),
  difficulty: z.enum(
    ["easy", "medium", "hard"],
    "Difficulty must be 'easy', 'medium', or 'hard'",
  ),
  forceAI: z.boolean().optional().default(false),
  localAttempt: z.object({
    challengeId: z.string().min(1, "Challenge ID is required"),
    challengeDate: z.string().min(1, "Challenge date is required"),
    completedAt: z.string().min(1, "Completion timestamp is required"),
    timeMs: z.number().positive("Time must be positive"),
    difficulty: z.string().min(1, "Difficulty level is required"),
  }),
};

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<object>().create({
  errorFormatter(opts) {
    const { shape, error } = opts;
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.code === "BAD_REQUEST" && error.cause instanceof Error
            ? error.cause
            : null,
      },
    };
  },
});

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  /**
   * Retrieves today's challenge, generating one if it doesn't exist
   * Handles both AI-generated and static challenges with graceful fallbacks
   */
  getTodaysChallenge: publicProcedure.query(async () => {
    try {
      const today = getTodaysDate();
      logger.info(`Checking for today's challenge: ${today}`);

      let existingChallenge = null;

      // Try to check database, but handle connection errors gracefully
      try {
        existingChallenge = await db.challenge.findFirst({
          where: {
            date: new Date(today),
          },
        });
      } catch (dbError) {
        logger.warn("Database query failed, proceeding with generation", {
          error: dbError instanceof Error ? dbError.message : String(dbError),
        });
        // Continue to generation - don't let DB errors stop us
      }

      if (existingChallenge) {
        logger.info("Found existing challenge", {
          title: existingChallenge.title,
          generatedBy: existingChallenge.generated_by,
          difficulty: existingChallenge.difficulty,
        });
        // Return existing challenge from database
        return {
          id: existingChallenge.id,
          date: today,
          startingContent: existingChallenge.starting_content || undefined,
          content: existingChallenge.content,
          title: existingChallenge.title,
          difficulty: existingChallenge.difficulty as DifficultyLevel,
        };
      }

      logger.info("📅 No existing challenge found for today", {
        date: today,
        geminiEnabled: isGeminiEnabled(),
      });

      // If no existing challenge and Gemini is enabled, generate new one
      if (isGeminiEnabled()) {
        logger.info("🚀 Generating new AI challenge", {
          service: "gemini",
          date: today,
        });

        const generationResult = await generateTodaysChallenge();
        const challenge = generationResult.challenge;

        logger.info("✅ AI challenge generated successfully", {
          challengeId: challenge.id,
          title: challenge.title,
          difficulty: challenge.difficulty,
          generatedBy: generationResult.generatedBy,
        });

        // Try to store the generated challenge in database
        try {
          await db.challenge.create({
            data: {
              id: challenge.id,
              date: new Date(challenge.date),
              starting_content: challenge.startingContent || null,
              content: challenge.content,
              title: challenge.title,
              difficulty: challenge.difficulty,
              prompt_used: generationResult.promptUsed,
              generated_by: generationResult.generatedBy,
              validation_status: "validated",
            },
          });
          logger.info("Stored AI challenge in database", {
            challengeId: challenge.id,
          });
        } catch (dbError) {
          logger.warn("Failed to store challenge in database, but continuing", {
            error: dbError instanceof Error ? dbError.message : String(dbError),
          });
          // Continue without database storage - better to return challenge than fail
        }

        logger.info("Generated new AI challenge", {
          generatedBy: generationResult.generatedBy,
          title: challenge.title,
          difficulty: challenge.difficulty,
        });
        return challenge;
      }

      // Fallback to static challenge generation
      logger.info("📚 Using static challenge generation (AI disabled)", {
        reason: "Gemini not enabled",
        geminiEnabled: isGeminiEnabled(),
      });

      const staticChallengeResult =
        await challengeService.generateTodaysChallenge({ forceAI: false });
      const staticChallenge = staticChallengeResult.challenge;

      logger.info("✅ Static challenge generated", {
        challengeId: staticChallenge.id,
        title: staticChallenge.title,
        difficulty: staticChallenge.difficulty,
      });

      // Store static challenge in database for consistency
      await db.challenge.create({
        data: {
          id: staticChallenge.id,
          date: new Date(staticChallenge.date),
          starting_content: staticChallenge.startingContent || null,
          content: staticChallenge.content,
          title: staticChallenge.title,
          difficulty: staticChallenge.difficulty,
          generated_by: "static",
          validation_status: "validated",
        },
      });

      return staticChallenge;
    } catch (error) {
      logger.error("💥 Error in getTodaysChallenge - using ultimate fallback", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Ultimate fallback to static generation without database storage
      const fallbackResult = await challengeService.generateTodaysChallenge({
        forceAI: false,
      });

      logger.warn("⚠️ Using ultimate fallback challenge (no database storage)", {
        challengeId: fallbackResult.challenge.id,
      });

      return fallbackResult.challenge;
    }
  }),

  // Debug environment variables
  debugEnvironment: publicProcedure.query(() => {
    return {
      geminiApiKey: process.env.GEMINI_API_KEY
        ? `${process.env.GEMINI_API_KEY.substring(0, 10)}...`
        : "NOT_FOUND",
      googleApiKey: process.env.GOOGLE_AI_API_KEY
        ? `${process.env.GOOGLE_AI_API_KEY.substring(0, 10)}...`
        : "NOT_FOUND",
      nodeEnv: process.env.NODE_ENV,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      hasGoogleKey: Boolean(process.env.GOOGLE_AI_API_KEY),
      allEnvKeys: Object.keys(process.env).filter(
        (key) => key.includes("GEMINI") || key.includes("GOOGLE"),
      ),
    };
  }),

  // Test Gemini API directly
  testGeminiAPI: publicProcedure.query(async () => {
    try {
      logger.info("🧪 Testing Gemini API directly...");

      // First, test configuration
      const geminiEnabled = isGeminiEnabled();
      const apiKey =
        process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY;

      logger.info("🔧 Configuration check", {
        geminiEnabled,
        hasApiKey: Boolean(apiKey),
        apiKeyLength: apiKey?.length || 0,
        apiKeyPrefix: `${apiKey?.substring(0, 10)}...` || "NOT_SET",
        debugMode: process.env.GEMINI_DEBUG === "true",
      });

      if (!geminiEnabled) {
        return {
          success: false,
          error:
            "Gemini service is not enabled. Check your API key configuration.",
          generatedBy: "config_error",
          configuration: {
            geminiEnabled: false,
            hasApiKey: Boolean(apiKey),
            recommendation:
              "Set GEMINI_API_KEY or GOOGLE_AI_API_KEY environment variable",
          },
        };
      }

      const result = await generateTodaysChallenge({
        date: "2025-08-25", // Use tomorrow's date to avoid conflicts
        difficulty: "easy", // Start with easy for testing
      });

      logger.info("✅ Gemini API test successful", {
        generatedBy: result.generatedBy,
        title: result.challenge.title,
        generationTime: result.metadata?.generationTimeMs,
      });

      return {
        success: true,
        generatedBy: result.generatedBy,
        title: result.challenge.title,
        difficulty: result.challenge.difficulty,
        generationTime: result.metadata?.generationTimeMs,
        contentPreview: `${result.challenge.content.substring(0, 150)}...`,
        startingContentPreview:
          `${result.challenge.startingContent?.substring(0, 150)}...` || "None",
        promptUsed: `${result.promptUsed.substring(0, 200)}...`,
        configuration: {
          geminiEnabled: true,
          hasApiKey: true,
          debugMode: process.env.GEMINI_DEBUG === "true",
        },
      };
    } catch (error) {
      logger.error("❌ Gemini API test failed", {
        error: error instanceof Error ? error.message : String(error),
        name: error instanceof Error ? error.name : "Unknown",
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Extract helpful troubleshooting info
      const troubleshooting = [];
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();

        if (
          errorMessage.includes("api_key") ||
          errorMessage.includes("unauthorized")
        ) {
          troubleshooting.push(
            "Check that your GEMINI_API_KEY is valid and has proper permissions",
          );
        }
        if (errorMessage.includes("quota") || errorMessage.includes("rate")) {
          troubleshooting.push(
            "You may have hit API rate limits or quota. Wait and try again.",
          );
        }
        if (
          errorMessage.includes("network") ||
          errorMessage.includes("fetch")
        ) {
          troubleshooting.push(
            "Check your internet connection and firewall settings",
          );
        }
        if (errorMessage.includes("model")) {
          troubleshooting.push(
            "The model name might be incorrect. Using: gemini-1.5-flash",
          );
        }
      }

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorName: error instanceof Error ? error.name : "Unknown",
        generatedBy: "error",
        troubleshooting,
        configuration: {
          geminiEnabled: isGeminiEnabled(),
          hasApiKey: Boolean(
            process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY,
          ),
          debugMode: process.env.GEMINI_DEBUG === "true",
        },
      };
    }
  }),

  // Force regenerate today's challenge (admin function)
  regenerateTodaysChallenge: publicProcedure
    .input(
      z.object({
        forceAI: z.boolean().optional().default(false),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const today = getTodaysDate();

        // Delete existing challenge for today
        await db.challenge.deleteMany({
          where: {
            date: new Date(today),
          },
        });

        let generationResult: GenerationResult;

        if (input.forceAI && isGeminiEnabled()) {
          // Force AI generation
          generationResult = await generateTodaysChallenge();
        } else {
          // Use default logic (AI if available, static otherwise)
          if (isGeminiEnabled()) {
            generationResult = await generateTodaysChallenge();
          } else {
            const staticChallengeResult =
              await challengeService.generateTodaysChallenge({
                forceAI: false,
              });
            generationResult = {
              challenge: staticChallengeResult.challenge,
              promptUsed: "Static regeneration",
              generatedBy: "static" as const,
            };
          }
        }

        const challenge = generationResult.challenge;

        // Store the new challenge
        await db.challenge.create({
          data: {
            id: challenge.id,
            date: new Date(challenge.date),
            content: challenge.content,
            title: challenge.title,
            difficulty: challenge.difficulty,
            prompt_used: generationResult.promptUsed,
            generated_by: generationResult.generatedBy,
            validation_status: "validated",
          },
        });

        console.log(
          `Regenerated ${generationResult.generatedBy} challenge:`,
          challenge.title,
        );

        return {
          success: true,
          challenge,
          generatedBy: generationResult.generatedBy,
          message: `Successfully regenerated challenge using ${generationResult.generatedBy} generation`,
        };
      } catch (error) {
        console.error("Failed to regenerate challenge:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to regenerate challenge: ${error instanceof Error ? error.message : "Unknown error"}`,
          cause: error,
        });
      }
    }),

  // Check AI generation status
  getAIStatus: publicProcedure.query(async () => {
    return {
      geminiEnabled: isGeminiEnabled(),
      message: isGeminiEnabled()
        ? "AI challenge generation is enabled"
        : "AI generation disabled - using static challenges",
    };
  }),

  /**
   * Retrieves user's attempt for a specific challenge
   * Returns null if no attempt exists
   */
  getUserAttempt: publicProcedure
    .input(
      z.object({
        userId: schemas.userId,
        challengeDate: schemas.challengeDate.optional(), // defaults to today
      }),
    )
    .query(async ({ input }) => {
      try {
        // Get today's challenge if no specific date provided
        const todaysChallengeResult =
          await challengeService.generateTodaysChallenge({ forceAI: false });
        const todaysChallenge = todaysChallengeResult.challenge;

        // Query the database for user's attempt
        const attempt = await db.challengeAttempt.findFirst({
          where: {
            user_id: input.userId,
            challenge_id: todaysChallenge.id,
          },
          include: {
            challenge: true,
          },
        });

        if (!attempt) {
          return null;
        }

        // Return in the format expected by the frontend
        return {
          id: attempt.id,
          userId: attempt.user_id,
          challengeId: attempt.challenge_id,
          completedAt: attempt.completed_at,
          timeMs: attempt.time_ms,
          attemptDate: attempt.attempt_date,
        };
      } catch (error) {
        console.error("Failed to fetch user attempt:", error);
        // Return null instead of throwing to maintain compatibility
        return null;
      }
    }),

  /**
   * Submits a completed challenge attempt
   * Creates or updates user's completion record with validation
   */
  submitCompletion: publicProcedure
    .input(
      z.object({
        userId: schemas.userId,
        userEmail: schemas.userEmail,
        challengeId: schemas.challengeId,
        timeMs: schemas.timeMs,
        challengeDate: schemas.challengeDate,
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Get today's challenge details to ensure we have complete data
        const todaysChallengeResult =
          await challengeService.generateTodaysChallenge({ forceAI: false });
        const todaysChallenge = todaysChallengeResult.challenge;

        // Ensure user exists in database
        await ensureUser(input.userId, input.userEmail);

        // Ensure challenge exists in database
        await ensureChallenge(
          input.challengeId,
          input.challengeDate,
          todaysChallenge.content,
          todaysChallenge.title,
          todaysChallenge.difficulty,
        );

        // Create or update the challenge attempt
        const attempt = await db.challengeAttempt.upsert({
          where: {
            user_id_challenge_id: {
              user_id: input.userId,
              challenge_id: input.challengeId,
            },
          },
          update: {
            completed_at: new Date(),
            time_ms: input.timeMs,
          },
          create: {
            user_id: input.userId,
            challenge_id: input.challengeId,
            completed_at: new Date(),
            time_ms: input.timeMs,
            attempt_date: new Date(),
          },
        });

        logger.challenge.completed(input.challengeId, input.timeMs);
        logger.info("Challenge completion saved to database", {
          userId: input.userId,
          challengeId: input.challengeId,
          timeMs: input.timeMs,
          timeSeconds: (input.timeMs / 1000).toFixed(2),
          attemptId: attempt.id,
        });

        return {
          success: true,
          timeMs: input.timeMs,
          attemptId: attempt.id,
          message: "Challenge completed successfully!",
        };
      } catch (error) {
        logger.challenge.failed(input.challengeId, error);
        logger.error("Failed to save challenge completion", {
          userId: input.userId,
          userEmail: input.userEmail,
          challengeId: input.challengeId,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
        });

        // Provide more specific error messages
        if (error instanceof Error) {
          if (error.message.includes("unique constraint")) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Challenge attempt already exists for this user",
              cause: error,
            });
          }
          if (error.message.includes("foreign key")) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid user or challenge reference",
              cause: error,
            });
          }
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to save challenge completion: ${error instanceof Error ? error.message : "Unknown error"}`,
          cause: error,
        });
      }
    }),

  getGlobalChallengeStats: publicProcedure
    .input(
      z.object({
        challengeId: schemas.challengeId,
      }),
    )
    .query(async ({ input }) => {
      try {
        // Get all completed attempts for this specific challenge
        const attempts = await db.challengeAttempt.findMany({
          where: {
            challenge_id: input.challengeId,
            completed_at: { not: null },
            time_ms: { not: null },
          },
        });

        const totalCompletions = attempts.length;

        if (totalCompletions === 0) {
          return {
            averageTime: 0,
            totalCompletions: 0,
            fastestTime: null,
          };
        }

        // Calculate global statistics for this challenge
        const totalTime = attempts.reduce(
          (sum: number, attempt) => sum + (attempt.time_ms || 0),
          0,
        );
        const averageTime = Math.round(totalTime / totalCompletions);
        const fastestTime = Math.min(
          ...attempts.map((attempt) => attempt.time_ms || Infinity),
        );

        return {
          averageTime,
          totalCompletions,
          fastestTime: fastestTime === Infinity ? null : fastestTime,
        };
      } catch (error) {
        console.error("Failed to fetch global challenge stats:", error);
        // Return empty stats on error
        return {
          averageTime: 0,
          totalCompletions: 0,
          fastestTime: null,
        };
      }
    }),

  getChallengeStats: publicProcedure
    .input(
      z.object({
        userId: schemas.userId,
      }),
    )
    .query(async ({ input }) => {
      try {
        // Get all completed attempts for the user
        const attempts = await db.challengeAttempt.findMany({
          where: {
            user_id: input.userId,
            completed_at: { not: null },
            time_ms: { not: null },
          },
          orderBy: {
            attempt_date: "desc",
          },
        });

        const completedChallenges = attempts.length;

        if (completedChallenges === 0) {
          return {
            totalAttempts: 0,
            completedChallenges: 0,
            averageTime: 0,
            currentStreak: 0,
            bestTime: null,
          };
        }

        // Calculate statistics
        const totalTime = attempts.reduce(
          (sum: number, attempt) => sum + (attempt.time_ms || 0),
          0,
        );
        const averageTime = Math.round(totalTime / completedChallenges);
        const bestTime = Math.min(
          ...attempts.map((attempt) => attempt.time_ms || Infinity),
        );

        // Calculate current streak (consecutive days)
        let currentStreak = 0;
        const today = new Date();
        const sortedAttempts = attempts.sort(
          (a, b) =>
            new Date(b.attempt_date).getTime() -
            new Date(a.attempt_date).getTime(),
        );

        for (let i = 0; i < sortedAttempts.length; i++) {
          const attemptDate = new Date(sortedAttempts[i].attempt_date);
          const expectedDate = new Date(today);
          expectedDate.setDate(today.getDate() - i);

          // Check if attempt was made on the expected date (within same day)
          if (attemptDate.toDateString() === expectedDate.toDateString()) {
            currentStreak++;
          } else {
            break;
          }
        }

        return {
          totalAttempts: completedChallenges,
          completedChallenges,
          averageTime,
          currentStreak,
          bestTime: bestTime === Infinity ? null : bestTime,
        };
      } catch (error) {
        console.error("Failed to fetch challenge stats:", error);
        // Return empty stats on error
        return {
          totalAttempts: 0,
          completedChallenges: 0,
          averageTime: 0,
          currentStreak: 0,
          bestTime: null,
        };
      }
    }),

  migrateLocalData: publicProcedure
    .input(
      z.object({
        userId: schemas.userId,
        localAttempts: z
          .array(schemas.localAttempt)
          .min(1, "At least one attempt is required for migration"),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Ensure user exists in database
        await ensureUser(input.userId);

        let migratedCount = 0;
        const errors: string[] = [];

        // Process each local attempt
        for (const localAttempt of input.localAttempts) {
          try {
            // Ensure challenge exists in database
            await ensureChallenge(
              localAttempt.challengeId,
              localAttempt.challengeDate,
              "", // We don't have content in localStorage, will be updated when challenge is accessed
              "Migrated Challenge",
              localAttempt.difficulty,
            );

            // Check if this attempt already exists in database to prevent duplicates
            const existingAttempt = await db.challengeAttempt.findFirst({
              where: {
                user_id: input.userId,
                challenge_id: localAttempt.challengeId,
              },
            });

            if (!existingAttempt) {
              // Migrate the attempt to database
              await db.challengeAttempt.create({
                data: {
                  user_id: input.userId,
                  challenge_id: localAttempt.challengeId,
                  completed_at: new Date(localAttempt.completedAt),
                  time_ms: localAttempt.timeMs,
                  attempt_date: new Date(localAttempt.challengeDate),
                },
              });
              migratedCount++;
            }
          } catch (error) {
            console.error(
              `Failed to migrate attempt ${localAttempt.challengeId}:`,
              error,
            );
            errors.push(
              `Failed to migrate challenge ${localAttempt.challengeId}`,
            );
          }
        }

        console.log(
          `Migration completed for user ${input.userId}: ${migratedCount} attempts migrated`,
        );

        return {
          success: true,
          migratedCount,
          totalAttempts: input.localAttempts.length,
          errors,
          message: `Successfully migrated ${migratedCount} out of ${input.localAttempts.length} attempts`,
        };
      } catch (error) {
        console.error("Failed to migrate local data:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to migrate localStorage data to database",
          cause: error,
        });
      }
    }),

  /**
   * Retrieves user's challenge history with pagination
   * Returns completed challenges with timestamps and performance data
   */
  getChallengeHistory: publicProcedure
    .input(
      z.object({
        userId: schemas.userId,
        limit: z.number().min(1).max(100).optional().default(10),
        offset: z.number().min(0).optional().default(0),
      }),
    )
    .query(async ({ input }) => {
      try {
        const challenges = await db.challengeAttempt.findMany({
          where: {
            user_id: input.userId,
            completed_at: { not: null },
          },
          include: {
            challenge: {
              select: {
                id: true,
                title: true,
                difficulty: true,
                date: true,
              },
            },
          },
          orderBy: {
            attempt_date: "desc",
          },
          take: input.limit,
          skip: input.offset,
        });

        return {
          challenges: challenges.map((attempt) => ({
            id: attempt.id,
            challengeId: attempt.challenge_id,
            title: attempt.challenge?.title || "Unknown Challenge",
            difficulty: attempt.challenge?.difficulty || "medium",
            completedAt: attempt.completed_at,
            timeMs: attempt.time_ms,
            challengeDate: attempt.challenge?.date,
          })),
          total: await db.challengeAttempt.count({
            where: {
              user_id: input.userId,
              completed_at: { not: null },
            },
          }),
        };
      } catch (error) {
        console.error("Failed to fetch challenge history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve challenge history",
          cause: error,
        });
      }
    }),

  /**
   * Updates user profile information
   * Allows updating display name and preferences
   */
  updateUserProfile: publicProcedure
    .input(
      z.object({
        userId: schemas.userId,
        displayName: z
          .string()
          .min(1, "Display name is required")
          .max(50, "Display name too long")
          .optional(),
        preferences: z
          .object({
            theme: z.enum(["light", "dark", "auto"]).optional(),
            difficulty: schemas.difficulty.optional(),
          })
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        // Ensure user exists
        await ensureUser(input.userId);

        const updateData: {
          display_name?: string;
          preferences?: object;
        } = {};
        if (input.displayName) {
          updateData.display_name = input.displayName;
        }
        if (input.preferences) {
          updateData.preferences = input.preferences;
        }

        const updatedUser = await db.user.update({
          where: { id: input.userId },
          data: updateData,
        });

        return {
          success: true,
          user: {
            id: updatedUser.id,
            displayName: updatedUser.display_name,
            preferences: updatedUser.preferences,
          },
        };
      } catch (error) {
        console.error("Failed to update user profile:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user profile",
          cause: error,
        });
      }
    }),

  /**
   * Retrieves challenge leaderboard for a specific challenge
   * Shows top performers with their completion times
   */
  getChallengeLeaderboard: publicProcedure
    .input(
      z.object({
        challengeId: schemas.challengeId,
        limit: z.number().min(1).max(100).optional().default(10),
      }),
    )
    .query(async ({ input }) => {
      try {
        const leaderboard = await db.challengeAttempt.findMany({
          where: {
            challenge_id: input.challengeId,
            completed_at: { not: null },
            time_ms: { not: null },
          },
          include: {
            user: {
              select: {
                id: true,
                display_name: true,
              },
            },
            challenge: {
              select: {
                title: true,
                difficulty: true,
              },
            },
          },
          orderBy: {
            time_ms: "asc", // Fastest times first
          },
          take: input.limit,
        });

        return {
          challengeTitle:
            leaderboard[0]?.challenge?.title || "Unknown Challenge",
          difficulty: leaderboard[0]?.challenge?.difficulty || "medium",
          entries: leaderboard.map((entry, index) => ({
            rank: index + 1,
            userId: entry.user_id,
            displayName: entry.user?.display_name || "Anonymous",
            timeMs: entry.time_ms,
            completedAt: entry.completed_at,
          })),
        };
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve challenge leaderboard",
          cause: error,
        });
      }
    }),

  /**
   * Validates a challenge solution in real-time
   * Compares user input against expected output
   */
  validateChallengeSolution: publicProcedure
    .input(
      z.object({
        challengeId: schemas.challengeId,
        userSolution: z.string().min(1, "Solution cannot be empty"),
        challengeDate: schemas.challengeDate.optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        const challengeResult = await challengeService.generateTodaysChallenge({
          forceAI: false,
        });
        const challenge = challengeResult.challenge;

        if (challenge.id !== input.challengeId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid challenge ID for the specified date",
          });
        }

        // Simple validation - normalize whitespace and compare
        const normalizeCode = (code: string) =>
          code.replace(/\s+/g, " ").trim();

        const userNormalized = normalizeCode(input.userSolution);
        const expectedNormalized = normalizeCode(challenge.content);

        const isCorrect = userNormalized === expectedNormalized;
        const similarity = calculateSimilarity(
          userNormalized,
          expectedNormalized,
        );

        return {
          isCorrect,
          similarity,
          feedback: isCorrect
            ? "Perfect! Your solution matches the expected output."
            : similarity > 0.8
              ? "Very close! Check for minor differences."
              : similarity > 0.5
                ? "Good progress, but there are several differences."
                : "Your solution needs significant changes.",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Failed to validate solution:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to validate challenge solution",
          cause: error,
        });
      }
    }),
});

/**
 * Simple similarity calculation using Levenshtein distance
 * Returns a value between 0 and 1, where 1 is identical
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1, // deletion
        matrix[j - 1][i] + 1, // insertion
        matrix[j - 1][i - 1] + substitutionCost, // substitution
      );
    }
  }

  return matrix[str2.length][str1.length];
}

export type AppRouter = typeof appRouter;
