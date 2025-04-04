import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@prisma/client";

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
          idexCabinets: {
            include: {
              idexCabinet: true,
            }
          },
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
          idexCabinets: {
            include: {
              idexCabinet: true,
            }
          },
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

      // Создаем новую сессию с кабинетами
      const newSession = await ctx.db.workSession.create({
        data: {
          startTime: new Date(),
          userId: ctx.session.user.id,
          comment: input.comment,
          idexCabinets: {
            create: input.cabinetIds.map(cabinetId => ({
              idexCabinet: {
                connect: {
                  id: cabinetId
                }
              }
            }))
          },
        },
        include: {
          idexCabinets: {
            include: {
              idexCabinet: true,
            }
          },
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
      // Правильный расчет длительности в секундах
      const durationMs = endTime.getTime() - session.startTime.getTime();
      const durationSec = Math.floor(durationMs / 1000);

      const dataToUpdate: any = {
        endTime,
        duration: durationSec,
      };

      if (input.comment !== undefined) {
        dataToUpdate.comment = input.comment;
      }

      const updatedSession = await ctx.db.workSession.update({
        where: {
          id: input.sessionId,
        },
        data: dataToUpdate,
        include: {
          idexCabinets: {
            include: {
              idexCabinet: true,
            }
          },
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
        include: {
          idexCabinets: {
            include: {
              idexCabinet: true,
            }
          },
        },
      });

      return updatedSession;
    }),
    
  // Добавить кабинеты в сессию (работает для любых сессий - активных и завершенных)
  addCabinetsToSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        cabinetIds: z.array(z.number()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await ctx.db.workSession.findUnique({
        where: {
          id: input.sessionId,
          userId: ctx.session.user.id,
        },
        include: {
          idexCabinets: true,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Рабочая сессия не найдена',
        });
      }
      
      // Получаем текущие ID кабинетов в сессии
      const existingCabinetLinks = await ctx.db.workSessionIdexCabinet.findMany({
        where: {
          workSessionId: input.sessionId,
        },
        select: {
          idexCabinetId: true,
        },
      });
      
      const existingCabinetIds = existingCabinetLinks.map(link => link.idexCabinetId);
      
      // Фильтруем только новые кабинеты, которых еще нет в сессии
      const newCabinetIds = input.cabinetIds.filter(
        id => !existingCabinetIds.includes(id)
      );
      
      // Добавляем новые кабинеты к сессии
      if (newCabinetIds.length > 0) {
        await ctx.db.workSessionIdexCabinet.createMany({
          data: newCabinetIds.map(cabinetId => ({
            workSessionId: input.sessionId,
            idexCabinetId: cabinetId,
          })),
        });
      }
      
      // Возвращаем обновленную сессию
      const updatedSession = await ctx.db.workSession.findUnique({
        where: {
          id: input.sessionId,
        },
        include: {
          idexCabinets: {
            include: {
              idexCabinet: true,
            }
          },
        },
      });
      
      return updatedSession;
    }),
    
  // Удалить кабинеты из сессии (работает для любых сессий - активных и завершенных)
  removeCabinetsFromSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.number(),
        cabinetIds: z.array(z.number()),
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
      
      // Удаляем связи между сессией и указанными кабинетами
      await ctx.db.workSessionIdexCabinet.deleteMany({
        where: {
          workSessionId: input.sessionId,
          idexCabinetId: {
            in: input.cabinetIds,
          },
        },
      });
      
      // Возвращаем обновленную сессию
      const updatedSession = await ctx.db.workSession.findUnique({
        where: {
          id: input.sessionId,
        },
        include: {
          idexCabinets: {
            include: {
              idexCabinet: true,
            }
          },
        },
      });
      
      return updatedSession;
    }),
});
