import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const cardPouringsRouter = createTRPCRouter({
  // Получение всех проливов для карты
  getByCardId: protectedProcedure
    .input(
      z.object({
        cardId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { cardId } = input;

      const pourings = await ctx.db.cardPouring.findMany({
        where: {
          cardId: cardId,
        },
        orderBy: {
          pouringDate: "desc",
        },
      });

      return pourings;
    }),

  // Создание пролива для карты
  create: protectedProcedure
    .input(
      z.object({
        cardId: z.number(),
        amount: z.number().min(0.01),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { cardId, amount } = input;
      const userId = ctx.session.user.id;

      // Создание пролива
      const pouring = await ctx.db.cardPouring.create({
        data: {
          cardId: cardId,
          pouringDate: new Date(),
          pouringAmount: amount,
          initialAmount: 0, // Начальная сумма (требуется по схеме)
          initialDate: new Date(), // Начальная дата
          status: "ACTIVE",
        },
      });

      // Запись в аудит лог
      await ctx.db.auditLog.create({
        data: {
          entityId: pouring.id,
          entityType: "CARD_POURING",
          action: "CREATE",
          userId,
          newValue: {
            cardId: cardId,
            pouringAmount: amount,
            pouringDate: new Date(),
          },
        },
      });

      return pouring;
    }),

  // Обновление пролива
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        amount: z.number().min(0.01).optional(),
        withdrawalAmount: z.number().min(0).optional(),
        finalAmount: z.number().min(0).optional(),
        collectorName: z.string().optional(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const userId = ctx.session.user.id;

      // Получаем старые данные для аудита
      const oldPouring = await ctx.db.cardPouring.findUnique({
        where: { id },
      });

      if (!oldPouring) {
        throw new Error("Пролив не найден");
      }

      // Обновляем пролив
      const updatedPouring = await ctx.db.cardPouring.update({
        where: { id },
        data: {
          ...data,
          ...(data.finalAmount ? { finalDate: new Date() } : {}),
          ...(data.withdrawalAmount ? { withdrawalDate: new Date() } : {}),
        },
      });

      // Запись в аудит лог
      await ctx.db.auditLog.create({
        data: {
          entityId: id,
          entityType: "CARD_POURING",
          action: "UPDATE",
          userId,
          oldValue: oldPouring,
          newValue: updatedPouring,
        },
      });

      return updatedPouring;
    }),

  // Удаление пролива
  delete: protectedProcedure
    .input(
      z.object({
        id: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id } = input;
      const userId = ctx.session.user.id;

      // Получаем данные пролива для аудита и обновления карты
      const pouring = await ctx.db.cardPouring.findUnique({
        where: { id },
        include: {
          card: true,
        },
      });

      if (!pouring) {
        throw new Error("Пролив не найден");
      }

      // Удаляем пролив
      await ctx.db.cardPouring.delete({
        where: { id },
      });

      // Запись в аудит лог
      await ctx.db.auditLog.create({
        data: {
          entityId: id,
          entityType: "CARD_POURING",
          action: "DELETE",
          userId,
          oldValue: pouring,
          newValue: null,
        },
      });

      return { success: true };
    }),
});
