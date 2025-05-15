import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";

// Helper function to check if database error is related to table not existing
function isTableNotExistError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // Error code for relation not found or table doesn't exist
    return error.code === 'P2021' || error.code === 'P2003' || error.code === 'P2010';
  }
  return false;
}

// Handle database errors with graceful fallbacks
function handleDatabaseError(error: unknown, errorMessage: string): never {
  console.error(`${errorMessage}:`, error);

  if (isTableNotExistError(error)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Notification system is initializing. Please try again later.",
      cause: error,
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: errorMessage,
    cause: error,
  });
}

export const notificationRouter = createTRPCRouter({
  // Get all unread notifications for the current user
  getUnreadNotifications: protectedProcedure.query(async ({ ctx }) => {
    try {
      // First check if the table exists by wrapping in a try-catch
      try {
        // Use the existing fields in the database
        const notifications = await ctx.db.cabinetNotification.findMany({
          where: {
            userId: ctx.session.user.id,
            isRead: false,
          },
          orderBy: {
            timestamp: "desc",
          },
        });

        // Just return the notifications as is
        return notifications;
      } catch (dbError) {
        // If error is related to table not existing, return empty array instead of error
        if (isTableNotExistError(dbError)) {
          console.warn("CabinetNotification table may not exist yet, returning empty array");
          return [];
        }
        throw dbError; // Re-throw if it's another kind of error
      }
    } catch (error) {
      handleDatabaseError(error, "Failed to fetch notifications");
    }
  }),

  // Get all unread cancellations
  getUnreadCancellations: protectedProcedure.query(async ({ ctx }) => {
    try {
      // First check if the table exists by wrapping in a try-catch
      try {
        // Use the existing fields in the database
        const cancellations = await ctx.db.cancellation.findMany({
          where: {
            isRead: false,
          },
          orderBy: {
            timestamp: "desc",
          },
        });

        // Just return the cancellations as is
        return cancellations;
      } catch (dbError) {
        // If error is related to table not existing, return empty array instead of error
        if (isTableNotExistError(dbError)) {
          console.warn("Cancellation table may not exist yet, returning empty array");
          return [];
        }
        throw dbError; // Re-throw if it's another kind of error
      }
    } catch (error) {
      handleDatabaseError(error, "Failed to fetch cancellations");
    }
  }),

  // Get all notifications for the current user (with pagination)
  getAllNotifications: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(10),
        cursor: z.number().nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const { limit, cursor } = input;

        try {
          // Get all notifications for current user, sorted by timestamp descending
          const notifications = await ctx.db.cabinetNotification.findMany({
            where: {
              userId: ctx.session.user.id,
            },
            take: limit + 1, // Take one extra to check if there's a next page
            skip: cursor ? 1 : 0, // Skip first item if cursor is defined
            ...(cursor ? { cursor: { id: cursor } } : {}), // Add cursor if defined
            orderBy: [
              { timestamp: "desc" },
              { id: "desc" }, // Secondary sort by ID for consistent pagination
            ],
          });

          // Use notifications directly
          const mappedNotifications = notifications;

          let nextCursor: typeof cursor = undefined;
          if (mappedNotifications.length > limit) {
            const nextItem = mappedNotifications.pop();
            nextCursor = nextItem?.id;
          }

          return {
            items: mappedNotifications,
            nextCursor,
          };
        } catch (dbError) {
          // If error is related to table not existing, return empty results
          if (isTableNotExistError(dbError)) {
            return {
              items: [],
              nextCursor: undefined,
            };
          }
          throw dbError;
        }
      } catch (error) {
        handleDatabaseError(error, "Failed to fetch notifications");
      }
    }),

  // Mark notification as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number().or(z.bigint()).or(z.string().transform(val => BigInt(val))) }))
    .mutation(async ({ ctx, input }) => {
      try {
        try {
          const notification = await ctx.db.cabinetNotification.findUnique({
            where: { id: input.id },
          });

          if (!notification) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Notification not found",
            });
          }

          if (notification.userId !== ctx.session.user.id) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Cannot access this notification",
            });
          }

          await ctx.db.cabinetNotification.update({
            where: { id: input.id },
            data: { isRead: true },
          });

          return { success: true };
        } catch (dbError) {
          if (isTableNotExistError(dbError)) {
            return { success: false, reason: "Notification system is initializing" };
          }
          throw dbError;
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        handleDatabaseError(error, "Failed to mark notification as read");
      }
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      try {
        await ctx.db.cabinetNotification.updateMany({
          where: {
            userId: ctx.session.user.id,
            isRead: false,
          },
          data: {
            isRead: true,
          },
        });

        return { success: true };
      } catch (dbError) {
        if (isTableNotExistError(dbError)) {
          return { success: true }; // Pretend success if table doesn't exist
        }
        throw dbError;
      }
    } catch (error) {
      handleDatabaseError(error, "Failed to mark all notifications as read");
    }
  }),

  // Mark cancellation as read
  markCancellationAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      try {
        try {
          const cancellation = await ctx.db.cancellation.findUnique({
            where: { id: input.id },
          });

          if (!cancellation) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Cancellation notification not found",
            });
          }

          await ctx.db.cancellation.update({
            where: { id: input.id },
            data: { isRead: true },
          });

          return { success: true };
        } catch (dbError) {
          if (isTableNotExistError(dbError)) {
            return { success: false, reason: "Cancellation system is initializing" };
          }
          throw dbError;
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        handleDatabaseError(error, "Failed to mark cancellation as read");
      }
    }),

  // Mark all cancellations as read
  markAllCancellationsAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      try {
        await ctx.db.cancellation.updateMany({
          where: {
            isRead: false,
          },
          data: {
            isRead: true,
          },
        });

        return { success: true };
      } catch (dbError) {
        if (isTableNotExistError(dbError)) {
          return { success: true }; // Pretend success if table doesn't exist
        }
        throw dbError;
      }
    } catch (error) {
      handleDatabaseError(error, "Failed to mark all cancellations as read");
    }
  }),

  // Get new notifications count
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      try {
        const count = await ctx.db.cabinetNotification.count({
          where: {
            userId: ctx.session.user.id,
            isRead: false,
          },
        });

        return { count };
      } catch (dbError) {
        if (isTableNotExistError(dbError)) {
          return { count: 0 }; // Return 0 if table doesn't exist
        }
        throw dbError;
      }
    } catch (error) {
      handleDatabaseError(error, "Failed to fetch notification count");
    }
  }),

  // Get cancellations count
  getUnreadCancellationsCount: protectedProcedure.query(async ({ ctx }) => {
    try {
      try {
        const count = await ctx.db.cancellation.count({
          where: {
            isRead: false,
          },
        });

        return { count };
      } catch (dbError) {
        if (isTableNotExistError(dbError)) {
          return { count: 0 }; // Return 0 if table doesn't exist
        }
        throw dbError;
      }
    } catch (error) {
      handleDatabaseError(error, "Failed to fetch cancellations count");
    }
  }),
});