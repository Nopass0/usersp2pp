import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const cardBalancesRouter = createTRPCRouter({
  // Получение всех балансов для карты
  getByCardId: protectedProcedure
    .input(
      z.object({
        cardId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cardId } = input;

      const balances = await ctx.db.cardBalance.findMany({
        where: {
          cardId: cardId,
        },
        orderBy: {
          date: "desc",
        },
      });

      return balances;
    }),

  // Создание баланса
  create: protectedProcedure
    .input(
      z.object({
        cardId: z.number(),
        date: z.string(),
        startBalance: z.number().min(0),
        endBalance: z.number().min(0),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { cardId, date, startBalance, endBalance, comment } = input;
      const userId = ctx.session.user.id;

      // Создание баланса
      const balance = await ctx.db.cardBalance.create({
        data: {
          cardId,
          date: new Date(date),
          startBalance,
          endBalance,
          comment,
        },
      });

      // Запись в аудит лог
      await ctx.db.auditLog.create({
        data: {
          entityId: balance.id,
          entityType: "CardBalance",
          action: "CREATE",
          userId,
          newValue: {
            cardId,
            startBalance,
            endBalance,
            date: balance.date,
            comment,
          },
          cardBalanceId: balance.id, // Связь с балансом
        },
      });

      return balance;
    }),

  // Обновление баланса
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        date: z.string().optional(),
        startBalance: z.number().min(0).optional(),
        endBalance: z.number().min(0).optional(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, date, ...restData } = input;
      const userId = ctx.session.user.id;

      // Получаем старые данные для аудита
      const oldBalance = await ctx.db.cardBalance.findUnique({
        where: { id },
      });

      if (!oldBalance) {
        throw new Error("Баланс не найден");
      }

      // Преобразуем дату, если она передана
      const dataToUpdate = {
        ...restData,
        ...(date ? { date: new Date(date) } : {}),
      };

      // Обновляем баланс
      const updatedBalance = await ctx.db.cardBalance.update({
        where: { id },
        data: dataToUpdate,
      });

      // Запись в аудит лог
      await ctx.db.auditLog.create({
        data: {
          entityId: id,
          entityType: "CardBalance",
          action: "UPDATE",
          userId,
          oldValue: oldBalance,
          newValue: updatedBalance,
          cardBalanceId: id, // Связь с балансом
        },
      });

      return updatedBalance;
    }),

  // Удаление баланса
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.session.user.id;

      // Сначала получим данные баланса для лога
      const balance = await ctx.db.cardBalance.findUnique({
        where: { id },
        include: { card: true },
      });

      if (!balance) {
        throw new Error("Баланс не найден");
      }

      // Удаление баланса
      await ctx.db.cardBalance.delete({
        where: { id },
      });

      // Запись в аудит лог
      await ctx.db.auditLog.create({
        data: {
          entityId: id,
          entityType: "CardBalance",
          action: "DELETE",
          userId,
          oldValue: {
            cardId: balance.cardId,
            startBalance: balance.startBalance,
            endBalance: balance.endBalance,
            date: balance.date,
            cardNumber: balance.card.cardNumber,
            comment: balance.comment,
          },
          cardBalanceId: null, // Связь с удаленным балансом
        },
      });

      return { success: true };
    }),
});
