import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const idexCabinetRouter = createTRPCRouter({
  // Получить все кабинеты
  getAll: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        // Получаем все кабинеты без ограничений
        const cabinets = await ctx.db.idexCabinet.findMany({
          orderBy: {
            idexId: 'asc',
          },
          // Убедимся, что мы получаем все поля
          select: {
            id: true,
            idexId: true,
            login: true,
            password: true,
            createdAt: true,
            updatedAt: true,
            workSessionId: true,
          },
          // Не устанавливаем лимит, чтобы получить все записи
        });
        
        // Добавим логирование для диагностики
        console.log(`Retrieved ${cabinets.length} cabinets`);
        
        return cabinets;
      } catch (error) {
        console.error("Error fetching cabinets:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Ошибка при получении кабинетов",
          cause: error,
        });
      }
    }),
  
  // Получить кабинеты для конкретной рабочей сессии
  getByWorkSession: protectedProcedure
    .input(z.object({ workSessionId: z.number() }))
    .query(async ({ ctx, input }) => {
      try {
        const workSession = await ctx.db.workSession.findUnique({
          where: {
            id: input.workSessionId,
            userId: ctx.session.user.id,
          },
          include: {
            idexCabinets: true,
          },
        });
        
        if (!workSession) {
          return [];
        }
        
        return workSession.idexCabinets;
      } catch (error) {
        console.error("Error fetching session cabinets:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Ошибка при получении кабинетов сессии",
          cause: error,
        });
      }
    }),
  
  // Получить общее количество кабинетов
  getCount: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const count = await ctx.db.idexCabinet.count();
        return count;
      } catch (error) {
        console.error("Error counting cabinets:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Ошибка при подсчете кабинетов",
          cause: error,
        });
      }
    }),
});