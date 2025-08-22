import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { getTodaysChallenge, getTodaysDate } from "@/lib/challenge-service";
import { db, ensureUser, ensureChallenge } from "@/prisma/database";

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

  // Challenge-related procedures
  getTodaysChallenge: publicProcedure.query(async () => {
    return getTodaysChallenge();
  }),

  getUserAttempt: publicProcedure
    .input(z.object({
      userId: z.string(),
      challengeDate: z.string().optional() // defaults to today
    }))
    .query(async ({ input }) => {
      try {
        // Get today's challenge if no specific date provided
        const targetDate = input.challengeDate || getTodaysDate();
        const todaysChallenge = getTodaysChallenge();
        
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
        console.error('Failed to fetch user attempt:', error);
        // Return null instead of throwing to maintain compatibility
        return null;
      }
    }),

  submitCompletion: publicProcedure
    .input(z.object({
      userId: z.string(),
      challengeId: z.string(),
      timeMs: z.number().positive(),
      challengeDate: z.string()
    }))
    .mutation(async ({ input }) => {
      try {
        // Get today's challenge details to ensure we have complete data
        const todaysChallenge = getTodaysChallenge();
        
        // Ensure user exists in database
        await ensureUser(input.userId);
        
        // Ensure challenge exists in database
        await ensureChallenge(
          input.challengeId,
          input.challengeDate,
          todaysChallenge.content,
          todaysChallenge.title,
          todaysChallenge.difficulty
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

        console.log('Challenge completed and saved to database:', {
          userId: input.userId,
          challengeId: input.challengeId,
          timeMs: input.timeMs,
          timeSeconds: (input.timeMs / 1000).toFixed(2),
          attemptId: attempt.id
        });
        
        return {
          success: true,
          timeMs: input.timeMs,
          attemptId: attempt.id,
          message: 'Challenge completed successfully!'
        };
      } catch (error) {
        console.error('Failed to save challenge completion:', error);
        throw new Error('Failed to save challenge completion to database');
      }
    }),

  getChallengeStats: publicProcedure
    .input(z.object({
      userId: z.string()
    }))
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
            attempt_date: 'desc',
          },
        });

        const completedChallenges = attempts.length;
        
        if (completedChallenges === 0) {
          return {
            totalAttempts: 0,
            completedChallenges: 0,
            averageTime: 0,
            currentStreak: 0,
            bestTime: null
          };
        }

        // Calculate statistics
        const totalTime = attempts.reduce((sum: number, attempt: any) => sum + (attempt.time_ms || 0), 0);
        const averageTime = Math.round(totalTime / completedChallenges);
        const bestTime = Math.min(...attempts.map((attempt: any) => attempt.time_ms || Infinity));

        // Calculate current streak (consecutive days)
        let currentStreak = 0;
        const today = new Date();
        const sortedAttempts = attempts.sort((a: any, b: any) => 
          new Date(b.attempt_date).getTime() - new Date(a.attempt_date).getTime()
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
        console.error('Failed to fetch challenge stats:', error);
        // Return empty stats on error
        return {
          totalAttempts: 0,
          completedChallenges: 0,
          averageTime: 0,
          currentStreak: 0,
          bestTime: null
        };
      }
    }),

  migrateLocalData: publicProcedure
    .input(z.object({
      userId: z.string(),
      localAttempts: z.array(z.object({
        challengeId: z.string(),
        challengeDate: z.string(),
        completedAt: z.string(),
        timeMs: z.number(),
        difficulty: z.string(),
      }))
    }))
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
              '', // We don't have content in localStorage, will be updated when challenge is accessed
              'Migrated Challenge',
              localAttempt.difficulty
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
            console.error(`Failed to migrate attempt ${localAttempt.challengeId}:`, error);
            errors.push(`Failed to migrate challenge ${localAttempt.challengeId}`);
          }
        }

        console.log(`Migration completed for user ${input.userId}: ${migratedCount} attempts migrated`);

        return {
          success: true,
          migratedCount,
          totalAttempts: input.localAttempts.length,
          errors,
          message: `Successfully migrated ${migratedCount} out of ${input.localAttempts.length} attempts`
        };
      } catch (error) {
        console.error('Failed to migrate local data:', error);
        throw new Error('Failed to migrate localStorage data to database');
      }
    })
});

export type AppRouter = typeof appRouter;
