import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const transactionRouter = createTRPCRouter({
  // Получить все Telegram транзакции с фильтрацией
  getTelegramTransactions: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        type: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, type } = input;
      
      const where = {
        userId: ctx.session.user.id,
        ...(startDate && endDate
          ? {
              dateTime: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            }
          : {}),
        ...(type ? { type: { equals: type, mode: "insensitive" } } : {}),
      };
      
      const transactions = await ctx.db.transaction.findMany({
        where,
        orderBy: {
          dateTime: "desc",
        },
      });
      
      return transactions;
    }),
  
  // Получить все Bybit транзакции с фильтрацией
  getBybitTransactions: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        type: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate, type } = input;
      
      const where = {
        userId: ctx.session.user.id,
        ...(startDate && endDate
          ? {
              dateTime: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
            }
          : {}),
        ...(type ? { type: { equals: type, mode: "insensitive" } } : {}),
      };
      
      const transactions = await ctx.db.bybitTransaction.findMany({
        where,
        orderBy: {
          dateTime: "desc",
        },
      });
      
      return transactions;
    }),
  
  // Получить количество Telegram транзакций
  getTelegramTransactionsCount: protectedProcedure
    .query(async ({ ctx }) => {
      const count = await ctx.db.transaction.count({
        where: {
          userId: ctx.session.user.id,
        },
      });
      
      return count;
    }),
  
  // Получить количество Bybit транзакций
  getBybitTransactionsCount: protectedProcedure
    .query(async ({ ctx }) => {
      const count = await ctx.db.bybitTransaction.count({
        where: {
          userId: ctx.session.user.id,
        },
      });
      
      return count;
    }),
});