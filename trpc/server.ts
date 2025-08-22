import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { generateChallengeForDate, getTodaysDate, getDifficultyForDate } from "@/lib/challenge";
import { generateTodaysChallenge } from "@/lib/ai-generation";
import { isGeminiEnabled } from "@/lib/ai-generation/config";
import { db, ensureUser, ensureChallenge } from "@/prisma/database";
import { logger } from "@/lib/logger";
import type { DifficultyLevel } from "@/types";

/**
 * Zod validation schemas for tRPC procedures
 * Ensures type safety and input validation across the API
 */
const schemas = {
  userId: z.string().min(1, "User ID is required"),
  userEmail: z.string().email("Invalid email format").optional(),
  challengeId: z.string().min(1, "Challenge ID is required"),
  challengeDate: z.string().min(1, "Challenge date is required"),
  timeMs: z.number().positive("Time must be positive"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  forceAI: z.boolean().optional().default(false),
  localAttempt: z.object({
    challengeId: z.string(),
    challengeDate: z.string(),
    completedAt: z.string(),
    timeMs: z.number(),
    difficulty: z.string(),
  }),
} as const;

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<object>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  demo: publicProcedure.query(async () => {
    return { demo: true };
  }),

  onNewTodo: publicProcedure
    .input((value): string => {
      if (typeof value === "string") {
        return value;
      }
      throw new Error("Input is not a string");
    })
    .mutation(async (opts) => {
      console.log("Received new todo", { text: opts.input });
    }),

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
        logger.warn(
          "Database query failed, proceeding with generation",
          { error: dbError instanceof Error ? dbError.message : String(dbError) }
        );
        // Continue to generation - don't let DB errors stop us
      }

      if (existingChallenge) {
        logger.info(
          "Found existing challenge",
          { 
            title: existingChallenge.title, 
            generatedBy: existingChallenge.generated_by,
            difficulty: existingChallenge.difficulty 
          }
        );
        // Return existing challenge from database
        return {
          id: existingChallenge.id,
          date: today,
          content: existingChallenge.content,
          title: existingChallenge.title,
          difficulty: existingChallenge.difficulty as DifficultyLevel,
        };
      }

      logger.info(`No existing challenge found for ${today}`);
      logger.info(`AI Generation enabled: ${isGeminiEnabled()}`);

      // If no existing challenge and Gemini is enabled, generate new one
      if (isGeminiEnabled()) {
        logger.info("Generating new AI challenge");

        const generationResult = await generateTodaysChallenge();
        const challenge = generationResult.challenge;

        // Try to store the generated challenge in database
        try {
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
          logger.info("Stored AI challenge in database", { challengeId: challenge.id });
        } catch (dbError) {
          logger.warn(
            "Failed to store challenge in database, but continuing",
            { error: dbError instanceof Error ? dbError.message : String(dbError) }
          );
          // Continue without database storage - better to return challenge than fail
        }

        logger.info(
          "Generated new AI challenge",
          { 
            generatedBy: generationResult.generatedBy, 
            title: challenge.title,
            difficulty: challenge.difficulty 
          }
        );
        return challenge;
      }

      // Fallback to static challenge generation
      logger.info("Using static challenge generation (AI disabled)");
      const todaysDate = new Date().toISOString().split('T')[0];
      const staticChallenge = generateChallengeForDate(todaysDate);

      // Store static challenge in database for consistency
      await db.challenge.create({
        data: {
          id: staticChallenge.id,
          date: new Date(staticChallenge.date),
          content: staticChallenge.content,
          title: staticChallenge.title,
          difficulty: staticChallenge.difficulty,
          generated_by: "static",
          validation_status: "validated",
        },
      });

      return staticChallenge;
    } catch (error) {
      console.error("Error in getTodaysChallenge:", error);
      // Ultimate fallback to static generation without database storage
      const todaysDate = new Date().toISOString().split('T')[0];
      return generateChallengeForDate(todaysDate);
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

        let generationResult;

        if (input.forceAI && isGeminiEnabled()) {
          // Force AI generation
          generationResult = await generateTodaysChallenge();
        } else {
          // Use default logic (AI if available, static otherwise)
          if (isGeminiEnabled()) {
            generationResult = await generateTodaysChallenge();
          } else {
            const todaysDate = new Date().toISOString().split('T')[0];
            const staticChallenge = generateChallengeForDate(todaysDate);
            generationResult = {
              challenge: staticChallenge,
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
        throw new Error(
          `Failed to regenerate challenge: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
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
        const targetDate = input.challengeDate || getTodaysDate();
        const todaysChallenge = generateChallengeForDate(targetDate);

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
        const todaysChallenge = generateChallengeForDate(input.challengeDate);

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
            throw new Error("Challenge attempt already exists for this user");
          }
          if (error.message.includes("foreign key")) {
            throw new Error("Invalid user or challenge reference");
          }
        }

        throw new Error(
          `Failed to save challenge completion: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }),

  getGlobalChallengeStats: publicProcedure
    .input(
      z.object({
        challengeId: z.string(),
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
          (sum: number, attempt: any) => sum + (attempt.time_ms || 0),
          0,
        );
        const averageTime = Math.round(totalTime / totalCompletions);
        const fastestTime = Math.min(
          ...attempts.map((attempt: any) => attempt.time_ms || Infinity),
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
        userId: z.string(),
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
          (sum: number, attempt: any) => sum + (attempt.time_ms || 0),
          0,
        );
        const averageTime = Math.round(totalTime / completedChallenges);
        const bestTime = Math.min(
          ...attempts.map((attempt: any) => attempt.time_ms || Infinity),
        );

        // Calculate current streak (consecutive days)
        let currentStreak = 0;
        const today = new Date();
        const sortedAttempts = attempts.sort(
          (a: any, b: any) =>
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
        userId: z.string(),
        localAttempts: z.array(
          z.object({
            challengeId: z.string(),
            challengeDate: z.string(),
            completedAt: z.string(),
            timeMs: z.number(),
            difficulty: z.string(),
          }),
        ),
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
        throw new Error("Failed to migrate localStorage data to database");
      }
    }),
});

export type AppRouter = typeof appRouter;
