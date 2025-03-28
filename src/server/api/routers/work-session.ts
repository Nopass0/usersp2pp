import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const workSessionRouter = createTRPCRouter({
  // Получить активную сессию пользователя (без даты окончания)
  getActiveSession: protectedProcedure
    .query(async ({ ctx }) => {
      const activeSession = await ctx.db.workSession.findFirst({
        where: {
          userId: ctx.session.user.id,
          endTime: null,
        },
        include: {
          idexCabinets: true,
        },
        orderBy: {
          startTime: 'desc',
        },
      });

      return activeSession;
    }),

  // Получить все сессии пользователя
  getUserSessions: protectedProcedure
    .query(async ({ ctx }) => {
      const sessions = await ctx.db.workSession.findMany({
        where: {
          userId: ctx.session.user.id,
        },
        include: {
          idexCabinets: true,
        },
        orderBy: {
          startTime: 'desc',
        },
      });

      return sessions;
    }),

  // Создать новую рабочую сессию
  startSession: protectedProcedure
    .input(
      z.object({
        cabinetIds: z.array(z.number()),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Проверим, нет ли уже активной сессии
      const existingActiveSession = await ctx.db.workSession.findFirst({
        where: {
          userId: ctx.session.user.id,
          endTime: null,
        },
      });

      if (existingActiveSession) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'У вас уже есть активная рабочая сессия',
        });
      }

      // Создаем новую сессию
      const newSession = await ctx.db.workSession.create({
        data: {
          startTime: new Date(),
          userId: ctx.session.user.id,
          idexCabinets: {
            connect: input.cabinetIds.map(id => ({ id })),
          },
        },
        include: {
          idexCabinets: true,
        },
      });

      return newSession;
    }),

  // Завершить рабочую сессию
  endSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        comment: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.workSession.findUnique({
        where: {
          id: input.sessionId,
          userId: ctx.session.user.id,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Рабочая сессия не найдена',
        });
      }

      if (session.endTime) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Рабочая сессия уже завершена',
        });
      }

      const endTime = new Date();
      const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

      const updatedSession = await ctx.db.workSession.update({
        where: {
          id: input.sessionId,
        },
        data: {
          endTime,
          duration,
        },
        include: {
          idexCabinets: true,
        },
      });

      return updatedSession;
    }),

  // Обновить комментарий к сессии
  updateSessionComment: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        comment: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.workSession.findUnique({
        where: {
          id: input.sessionId,
          userId: ctx.session.user.id,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Рабочая сессия не найдена',
        });
      }

      const updatedSession = await ctx.db.workSession.update({
        where: {
          id: input.sessionId,
        },
        data: {
          comment: input.comment,
        },
      });

      return updatedSession;
    }),
});
