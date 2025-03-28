import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "../trpc";

export const authRouter = createTRPCRouter({
  login: publicProcedure
    .input(z.object({ passCode: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({
        where: { passCode: input.passCode },
        select: {
          id: true,
          name: true,
          passCode: true,
          isActive: true,
        },
      });

      if (!user || !user.isActive) {
        throw new Error("Неверный код доступа или пользователь неактивен");
      }

      return user;
    }),

  getSession: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        passCode: true,
      },
    });

    return { user };
  }),
});
