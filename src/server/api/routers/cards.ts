import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const CardStatusEnum = z.enum(["ACTIVE", "WARNING", "BLOCKED"]);

// First, let's define a helper function to safely convert any date input to a Date object
const parseDate = (date: string | Date | undefined): Date | undefined => {
  if (!date) return undefined;
  if (date instanceof Date) return date;
  try {
    return new Date(date);
  } catch (error) {
    console.error("Failed to parse date:", date, error);
    return undefined;
  }
};

export const cardsRouter = createTRPCRouter({
  getAll: publicProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(10),
        searchQuery: z.string().optional(),
        sortBy: z.string().default("createdAt"),
        sortDirection: z.enum(["asc", "desc"]).default("desc"),
        provider: z.string().optional(),
        bank: z.string().optional(),
        status: z.string().optional(),
        collectorName: z.string().optional(),
        picachu: z.string().optional(),
        letterCode: z.string().optional(),
        inWork: z.enum(["all", "true", "false"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const {
        page,
        pageSize,
        searchQuery,
        sortBy,
        sortDirection,
        provider,
        bank,
        status,
        collectorName,
        picachu,
        letterCode,
      } = input;

      // Создаем фильтр на основе параметров запроса
      const where = {
        ...(searchQuery
          ? {
              OR: [
                // Add externalId to search criteria - this allows searching by ID
                // Convert searchQuery to a number if it's a valid number, otherwise it won't match
                ...(!isNaN(parseInt(searchQuery))
                  ? [{ externalId: parseInt(searchQuery) }]
                  : []),
                { provider: { contains: searchQuery, mode: "insensitive" } },
                { bank: { contains: searchQuery, mode: "insensitive" } },
                { cardNumber: { contains: searchQuery, mode: "insensitive" } },
                { phoneNumber: { contains: searchQuery, mode: "insensitive" } },
                { picachu: { contains: searchQuery, mode: "insensitive" } },
                // Optional: Also search by letterCode if needed
                { letterCode: { contains: searchQuery, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(provider ? { provider } : {}),
        ...(bank ? { bank } : {}),
        ...(letterCode ? { letterCode } : {}),
        ...(status ? { status: status as CardStatusEnum } : {}),
        ...(picachu ? { picachu } : {}),
        ...(input.inWork && input.inWork !== "all"
          ? { inWork: input.inWork === "true" }
          : {}),
      };

      // Вычисляем общее количество карт с учетом фильтров
      const totalCount = await ctx.db.card.count({ where });

      // Вычисляем общую сумму стоимости карт
      const totalPriceResult = await ctx.db.card.aggregate({
        where,
        _sum: {
          cardPrice: true,
        },
      });

      // Получаем карты с пагинацией, сортировкой и фильтрацией
      const cards = await ctx.db.card.findMany({
        where,
        orderBy: {
          [sortBy]: sortDirection,
        },
        include: {
          cardPouring: true,
          balances: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      // Получаем доступные значения для фильтров
      const [providers, banks, picachus] = await Promise.all([
        ctx.db.card.findMany({
          select: { provider: true },
          distinct: ["provider"],
        }),
        ctx.db.card.findMany({
          select: { bank: true },
          distinct: ["bank"],
        }),
        ctx.db.card.findMany({
          select: { picachu: true },
          distinct: ["picachu"],
          where: { picachu: { not: null } },
        }),
      ]);

      // Получим уникальные имена коллекторов из таблицы CardPouring
      const pouringCollectorNames = await ctx.db.cardPouring.findMany({
        select: { collectorName: true },
        distinct: ["collectorName"],
        where: { collectorName: { not: null } },
      });

      // Обрабатываем данные карт чтобы добавить суммарные значения
      const processedCards = cards.map((card) => {
        // Расчет общей суммы проливов
        const totalPoured = card.cardPouring.reduce(
          (sum, pouring) => sum + pouring.pouringAmount,
          0,
        );

        // Расчет конечного баланса (последний баланс по дате)
        const lastBalance =
          card.balances.length > 0
            ? card.balances.sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime(),
              )[0].endBalance
            : 0;

        // Расчет начального баланса (самый ранний баланс по дате)
        const initialBalance =
          card.balances.length > 0
            ? card.balances.sort(
                (a, b) =>
                  new Date(a.date).getTime() - new Date(b.date).getTime(),
              )[0].startBalance
            : 0;

        // Расчет суммы снятия (всего пролито - последний баланс + начальный баланс)
        const withdrawal = totalPoured - (lastBalance - initialBalance);

        return {
          ...card,
          totalPoured,
          lastBalance,

          initialBalance,
          withdrawal,
          _count: {
            cardPouring: card.cardPouring.length,
            balances: card.balances.length,
          },
        };
      });

      let letterCodes = await ctx.db.card.findMany({
        select: { letterCode: true },
        distinct: ["letterCode"],
        where: { letterCode: { not: null } },
      });

      return {
        cards: processedCards,
        metadata: {
          totalCount,
          pageCount: Math.ceil(totalCount / pageSize),
          page,
          pageSize,
          totalCardPrice: totalPriceResult._sum.cardPrice || 0,
        },
        filterOptions: {
          providers: providers.map((p) => p.provider),
          banks: banks.map((b) => b.bank),
          statuses: Object.values(CardStatusEnum),
          collectorNames: pouringCollectorNames.map((c) => c.collectorName),
          picachus: picachus.map((p) => p.picachu),
          letterCodes: letterCodes.map((l) => l.letterCode),
        },
      };
    }),

  getStats: publicProcedure.query(async ({ ctx }) => {
    try {
      // Получаем общее количество карт
      const totalCardCount = await ctx.db.card.count();

      // Получаем общую стоимость всех карт
      const totalPriceResult = await ctx.db.card.aggregate({
        _sum: {
          cardPrice: true,
        },
      });

      // Получаем сумму оплаченных карт
      const paidSumResult = await ctx.db.card.aggregate({
        where: {
          isPaid: true,
        },
        _sum: {
          cardPrice: true,
        },
      });

      // Получаем сумму неоплаченных карт
      const unpaidSumResult = await ctx.db.card.aggregate({
        where: {
          isPaid: false,
        },
        _sum: {
          cardPrice: true,
        },
      });

      // Корректно преобразуем значения, чтобы избежать ошибок с null или undefined
      const totalCardPrice = totalPriceResult._sum.cardPrice || 0;
      const totalPaidSum = paidSumResult._sum.cardPrice || 0;
      const totalUnpaidSum = unpaidSumResult._sum.cardPrice || 0;

      return {
        totalCardPrice,
        totalPaidSum,
        totalUnpaidSum,
        totalCardCount,
      };
    } catch (error) {
      console.error("Error fetching card stats:", error);
      return {
        totalCardPrice: 0,
        totalPaidSum: 0,
        totalUnpaidSum: 0,
        totalCardCount: 0,
      };
    }
  }),

  getById: publicProcedure
    .input(
      z.object({
        id: z.number().int(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.db.card.findUnique({
        where: { id: input.id },
        include: {
          balances: {
            orderBy: {
              date: "desc",
            },
          },
          cardPouring: {
            orderBy: {
              pouringDate: "desc",
            },
          },
        },
      });
    }),

  create: publicProcedure
    .input(
      z.object({
        letterCode: z.string().optional(),
        externalId: z.number().int(),
        provider: z.string().min(1),
        cardNumber: z.string().min(1),
        bank: z.string().min(1),
        phoneNumber: z.string().min(1),
        appPin: z.number().int(),
        terminalPin: z.string().min(1),
        comment: z.string().optional(),
        status: CardStatusEnum.default("ACTIVE"),
        picachu: z.string().optional(),
        initialBalance: z.number().optional(),
        actor: z.string().optional(),
        // Initial pouring data if provided
        pouringAmount: z.number().optional(),
        initialAmount: z.number().optional(),
        initialDate: z.string().optional(), // Accept string only, we'll parse it manually
        collectorName: z.string().min(1), // Делаем обязательным
        cardPrice: z.number().optional(),
        isPaid: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        initialBalance,
        pouringAmount,
        initialAmount,
        initialDate,
        collectorName,
        cardPrice,
        isPaid,
        actor,
        ...cardData
      } = input;

      // Create the card
      const card = await ctx.db.card.create({
        data: {
          ...cardData,
          cardPrice: cardPrice ?? 0,
          isPaid: isPaid ?? false,
          actor: actor ?? "",
        },
      });

      // Create audit log for card creation
      await ctx.db.auditLog.create({
        data: {
          entityType: "Card",
          entityId: card.id,
          action: "CREATE",
          userId: ctx.session?.user?.id || 0, // Default to 0 if no user in session
          oldValue: null,
          newValue: {
            ...cardData,
            cardPrice,
            isPaid,
            actor,
            id: card.id,
          },
          timestamp: new Date(),
          cardId: card.id, // Используем новое поле для связи с картой
        },
      });

      // Create initial balance if provided
      if (initialBalance !== undefined) {
        const balance = await ctx.db.cardBalance.create({
          data: {
            cardId: card.id,
            date: new Date(),
            startBalance: initialBalance,
            endBalance: initialBalance,
          },
        });

        // Create audit log for balance creation
        await ctx.db.auditLog.create({
          data: {
            entityType: "CardBalance",
            entityId: balance.id,
            action: "CREATE",
            userId: ctx.session?.user?.id || 0,
            oldValue: null,
            newValue: {
              cardId: card.id,
              date: new Date(),
              startBalance: initialBalance,
              endBalance: initialBalance,
              id: balance.id,
              actor: actor ?? "",
            },
            timestamp: new Date(),
            cardBalanceId: balance.id, // Используем новое поле для связи с балансом
          },
        });
      }

      // Create initial pouring if all required data is provided
      if (pouringAmount !== undefined || initialAmount !== undefined) {
        // Используем любое непустое значение из двух полей
        const finalPouringAmount = pouringAmount ?? initialAmount ?? 0;

        // Safely parse the initialDate
        const parsedInitialDate = initialDate
          ? parseDate(initialDate)
          : new Date();

        const pouring = await ctx.db.cardPouring.create({
          data: {
            cardId: card.id,
            pouringDate: new Date(),
            initialAmount: finalPouringAmount,
            initialDate: parsedInitialDate,
            pouringAmount: finalPouringAmount,
            status: card.status,
            collectorName: collectorName ?? "",
            actor: actor ?? "",
          },
        });

        // Create audit log for pouring creation
        await ctx.db.auditLog.create({
          data: {
            entityType: "CardPouring",
            entityId: pouring.id,
            action: "CREATE",
            userId: ctx.session?.user?.id || 0,
            oldValue: null,
            newValue: {
              cardId: card.id,
              pouringDate: new Date(),
              initialAmount: finalPouringAmount,
              initialDate: parsedInitialDate,
              pouringAmount: finalPouringAmount,
              status: card.status,
              collectorName: collectorName ?? "",
              actor: actor ?? "",
              id: pouring.id,
            },
            timestamp: new Date(),
            cardPouringId: pouring.id, // Используем новое поле для связи с проливом
          },
        });
      }

      return card;
    }),

  update: publicProcedure
    .input(
      z.object({
        id: z.number().int(),
        letterCode: z.string().optional(),
        externalId: z.number().int().optional(),
        provider: z.string().min(1).optional(),
        cardNumber: z.string().min(1).optional(),
        bank: z.string().min(1).optional(),
        phoneNumber: z.string().min(1).optional(),
        appPin: z.number().int().optional(),
        inWork: z.boolean().optional(),
        terminalPin: z.string().min(1).optional(),
        comment: z.string().optional(),
        collectorName: z.string().optional(),
        status: CardStatusEnum.optional(),
        picachu: z.string().optional(),
        cardPrice: z.number().or(z.string()).optional(),
        isPaid: z.boolean().optional(),
        actor: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Convert cardPrice from string to number if needed
      const parsedData = {
        ...updateData,
        cardPrice:
          typeof updateData.cardPrice === "string"
            ? parseFloat(updateData.cardPrice)
            : updateData.cardPrice,
      };

      // Get the current state before updating
      const existingCard = await ctx.db.card.findUnique({
        where: { id },
      });

      if (!existingCard) {
        throw new Error(`Card with ID ${id} not found`);
      }

      // Update the card
      const updatedCard = await ctx.db.card.update({
        where: { id },
        data: parsedData,
      });

      // Create audit log entry for the update
      await ctx.db.auditLog.create({
        data: {
          entityType: "Card",
          entityId: id,
          action: "UPDATE",
          userId: ctx.session?.user?.id || 0,
          oldValue: existingCard,
          newValue: updatedCard,
        },
      });

      return updatedCard;
    }),

  delete: publicProcedure
    .input(
      z.object({
        id: z.number().int(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Fetch the card before deletion for audit log
      const cardToDelete = await ctx.db.card.findUnique({
        where: { id: input.id },
      });

      if (!cardToDelete) {
        return { success: false };
      }

      // Delete the card
      await ctx.db.card.delete({
        where: { id: input.id },
      });

      // Create audit log entry for the deletion
      await ctx.db.auditLog.create({
        data: {
          entityType: "Card",
          entityId: input.id,
          action: "DELETE",
          userId: ctx.session?.user?.id || 0,
          oldValue: cardToDelete,
          newValue: null,
          timestamp: new Date(),
        },
      });

      return { success: true, deletedCardId: input.id };
    }),

  // Обновление активного метода оплаты
  updatePaymentMethod: publicProcedure
    .input(
      z.object({
        id: z.number().int(),
        paymentMethod: z.enum(["c2c", "sbp"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, paymentMethod } = input;

      // Получаем текущие данные для аудит-лога
      const existingCard = await ctx.db.card.findUnique({
        where: { id },
      });

      if (!existingCard) {
        throw new Error(`Карта с ID ${id} не найдена`);
      }

      // Обновляем активный метод оплаты
      const updatedCard = await ctx.db.card.update({
        where: { id },
        data: {
          activePaymentMethod: paymentMethod,
          updatedAt: new Date(),
        },
      });

      // Создаем запись в аудит логе
      await ctx.db.auditLog.create({
        data: {
          entityType: "Card",
          entityId: id,
          action: "UPDATE",
          userId: ctx.session?.user?.id || 0,
          oldValue: { activePaymentMethod: existingCard.activePaymentMethod },
          newValue: { activePaymentMethod: paymentMethod },
          timestamp: new Date(),
          cardId: id,
        },
      });

      return { success: true, card: updatedCard };
    }),

  // Get unique values for filters
  getFilterOptions: publicProcedure.query(async ({ ctx }) => {
    try {
      const [providers, banks, collectorNames, picachus, letterCodes] =
        await Promise.all([
          ctx.db.card.findMany({
            select: { provider: true },
            distinct: ["provider"],
            where: { provider: { not: "" } },
          }),
          ctx.db.card.findMany({
            select: { bank: true },
            distinct: ["bank"],
            where: { bank: { not: "" } },
          }),
          ctx.db.cardPouring.findMany({
            where: {
              collectorName: {
                not: null,
                not: "",
              },
            },
            select: { collectorName: true },
            distinct: ["collectorName"],
          }),
          ctx.db.card.findMany({
            where: {
              picachu: {
                not: null,
                not: "",
              },
            },
            select: { picachu: true },
            distinct: ["picachu"],
          }),
          ctx.db.card.findMany({
            where: {
              letterCode: {
                not: null,
                not: "",
              },
            },
            select: { letterCode: true },
            distinct: ["letterCode"],
          }),
        ]);

      return {
        providers: providers.map((p) => p.provider),
        banks: banks.map((b) => b.bank),
        collectorNames: collectorNames
          .map((c) => c.collectorName)
          .filter(Boolean),
        picachus: picachus.map((p) => p.picachu).filter(Boolean),
        letterCodes: letterCodes.map((lc) => lc.letterCode).filter(Boolean),
      };
    } catch (error) {
      console.error("Error fetching filter options:", error);
      return {
        providers: [],
        banks: [],
        collectorNames: [],
        picachus: [],
      };
    }
  }),

  // New endpoint to get audit logs
  getAuditLogs: publicProcedure
    .input(
      z.object({
        entityType: z.enum(["Card", "CardBalance", "CardPouring"]).optional(),
        entityId: z.number().int().optional(),
        userId: z.number().int().optional(),
        page: z.number().int().default(1),
        pageSize: z.number().int().default(20),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const {
        entityType,
        entityId,
        userId,
        page,
        pageSize,
        startDate,
        endDate,
      } = input;

      const skip = (page - 1) * pageSize;

      // Build where clause based on input
      let whereClause: any = {};

      if (entityType) {
        whereClause.entityType = entityType;
      }

      if (entityId) {
        whereClause.entityId = entityId;
      }

      if (userId) {
        whereClause.userId = userId;
      }

      // Date range filter
      if (startDate || endDate) {
        whereClause.timestamp = {};

        if (startDate) {
          whereClause.timestamp.gte = startDate;
        }

        if (endDate) {
          whereClause.timestamp.lte = endDate;
        }
      }

      // Get audit logs with pagination
      const [logs, totalCount] = await Promise.all([
        ctx.db.auditLog.findMany({
          where: whereClause,
          orderBy: {
            timestamp: "desc",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          skip,
          take: pageSize,
        }),
        ctx.db.auditLog.count({
          where: whereClause,
        }),
      ]);

      return {
        logs,
        totalPages: Math.ceil(totalCount / pageSize),
        totalCount,
      };
    }),
});
