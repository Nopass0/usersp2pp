import { authRouter } from "~/server/api/routers/auth";
import { workSessionRouter } from "~/server/api/routers/work-session";
import { idexCabinetRouter } from "~/server/api/routers/idex-cabinet";
import { transactionRouter } from "~/server/api/routers/transaction";
import { createCallerFactory, createTRPCRouter } from "~/server/api/trpc";
import { cardsRouter } from "./routers/cards";
import { cardPouringsRouter } from "./routers/cardPourings";
import { cardBalancesRouter } from "./routers/cardBalances";
import { auditLogRouter } from "./routers/auditLog";
import { notificationRouter } from "./routers/notification";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  auth: authRouter,
  workSession: workSessionRouter,
  idexCabinet: idexCabinetRouter,
  transaction: transactionRouter,
  cards: cardsRouter,
  cardPourings: cardPouringsRouter,
  cardBalances: cardBalancesRouter,
  auditLog: auditLogRouter,
  notification: notificationRouter
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
