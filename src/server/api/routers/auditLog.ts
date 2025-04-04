import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const auditLogRouter = createTRPCRouter({
  // Получение аудит-логов для конкретной сущности по ID
  getByEntity: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.string(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { entityType, entityId, page, pageSize } = input;
      const skip = (page - 1) * pageSize;

      // Получаем записи аудита для указанного объекта
      const [logs, totalCount] = await Promise.all([
        ctx.db.auditLog.findMany({
          where: {
            entityType,
            entityId,
          },
          include: {
            user: {
              select: {
                name: true,
              },
            },
          },
          orderBy: {
            timestamp: "desc",
          },
          skip,
          take: pageSize,
        }),
        ctx.db.auditLog.count({
          where: {
            entityType,
            entityId,
          },
        }),
      ]);

      return {
        logs,
        totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        page,
        pageSize,
      };
    }),

  // Получение всех аудит-логов с возможностью фильтрации по типу сущности
  getAll: protectedProcedure
    .input(
      z.object({
        entityType: z.string().optional(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const { entityType, page, pageSize } = input;
      const skip = (page - 1) * pageSize;

      // Получаем все типы логов (CARD, BALANCE, POURING) если тип не указан
      // или только указанный тип
      const whereClause = entityType 
        ? { entityType } 
        : {
            // Получаем все возможные типы сущностей
            entityType: {
              in: ["CARD", "BALANCE", "POURING"]
            } 
          };

      try {
        // Получаем все записи аудита с учетом фильтрации
        const [logs, totalCount] = await Promise.all([
          ctx.db.auditLog.findMany({
            where: whereClause,
            include: {
              user: {
                select: {
                  name: true,
                },
              },
            },
            orderBy: {
              timestamp: "desc",
            },
            skip,
            take: pageSize,
          }),
          ctx.db.auditLog.count({ where: whereClause }),
        ]);

        // Преобразуем данные для ответа
        const formattedLogs = logs.map(log => ({
          id: log.id.toString(),
          entityId: log.entityId,
          entityType: log.entityType,
          action: log.action,
          oldValue: log.oldValue,
          newValue: log.newValue,
          userId: log.userId.toString(),
          username: log.user?.name || "Система",
          createdAt: log.timestamp,
        }));

        return {
          logs: formattedLogs,
          totalCount,
          totalPages: Math.ceil(totalCount / pageSize),
          page,
          pageSize,
        };
      } catch (error) {
        console.error("Ошибка при получении аудит логов:", error);
        return {
          logs: [],
          totalCount: 0,
          totalPages: 0,
          page,
          pageSize,
        };
      }
    }),
});
