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
        amount: z.number().min(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { cardId, amount } = input;
      const userId = ctx.session.user.id;

      // Получаем последний баланс карты (если есть)
      const lastBalance = await ctx.db.cardBalance.findFirst({
        where: {
          cardId: cardId,
        },
        orderBy: {
          date: "desc",
        },
      });

      // Создание баланса
      const balance = await ctx.db.cardBalance.create({
        data: {
          cardId: cardId,
          date: new Date(),
          startBalance: lastBalance?.endBalance || 0, // Используем последний баланс как начальный
          endBalance: amount, // Новый баланс
        },
      });

      // Запись в аудит лог
      await ctx.db.auditLog.create({
        data: {
          entityId: balance.id,
          entityType: "CARD_BALANCE",
          action: "CREATE",
          userId,
          newValue: {
            cardId: cardId,
            startBalance: balance.startBalance,
            endBalance: balance.endBalance,
            date: balance.date,
          },
        },
      });

      return balance;
    }),

  // Обновление баланса
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        startBalance: z.number().min(0).optional(),
        endBalance: z.number().min(0).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const userId = ctx.session.user.id;

      // Получаем старые данные для аудита
      const oldBalance = await ctx.db.cardBalance.findUnique({
        where: { id },
      });

      if (!oldBalance) {
        throw new Error("Баланс не найден");
      }

      // Обновляем баланс
      const updatedBalance = await ctx.db.cardBalance.update({
        where: { id },
        data,
      });

      // Запись в аудит лог
      await ctx.db.auditLog.create({
        data: {
          entityId: id,
          entityType: "CARD_BALANCE",
          action: "UPDATE",
          userId,
          oldValue: oldBalance,
          newValue: updatedBalance,
        },
      });

      return updatedBalance;
    }),

  // Удаление баланса
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.session.user.id;

      // Сначала получим данные баланса для лога
      const balance = await ctx.db.cardBalance.findUnique({
        where: { id: parseInt(id) },
        include: { card: true },
      });

      if (!balance) {
        throw new Error("Баланс не найден");
      }

      // Удаление баланса
      await ctx.db.cardBalance.delete({
        where: { id: parseInt(id) },
      });

      // Запись в аудит лог
      await ctx.db.auditLog.create({
        data: {
          entityId: parseInt(id),
          entityType: "CARD_BALANCE",
          action: "DELETE",
          userId,
          oldValue: {
            cardId: balance.cardId,
            startBalance: balance.startBalance,
            endBalance: balance.endBalance,
            date: balance.date,
            cardNumber: balance.card.cardNumber,
          },
        },
      });

      return { success: true };
    }),
});
