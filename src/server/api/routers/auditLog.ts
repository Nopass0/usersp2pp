import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";

export const auditLogRouter = createTRPCRouter({
  getEntityLogs: protectedProcedure
    .input(
      z.object({
        entityType: z.string(),
        entityId: z.number(),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const { entityType, entityId, page, pageSize } = input;
      const skip = (page - 1) * pageSize;

      // Получаем все записи аудита для указанного объекта
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
});
