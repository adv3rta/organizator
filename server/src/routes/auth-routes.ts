import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../services/auth-service.js";
import type { SubscriptionService } from "../services/subscription-service.js";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  displayName: z.string().min(2)
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const readToken = (authorization?: string): string | undefined =>
  authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;

export const createAuthRoutes = (authService: AuthService, subscriptionService: SubscriptionService): Router => {
  const router = Router();

  router.post("/register", async (request, response, next) => {
    try {
      const payload = registerSchema.parse(request.body);
      const session = await authService.register(payload);
      const userId = await authService.requireUserId(session.token);
      const subscription = await subscriptionService.ensureTrial(userId);
      response.json({ session, subscription });
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async (request, response, next) => {
    try {
      const payload = loginSchema.parse(request.body);
      const session = await authService.login(payload);
      const userId = await authService.requireUserId(session.token);
      const subscription = await subscriptionService.ensureTrial(userId);
      response.json({ session, subscription });
    } catch (error) {
      next(error);
    }
  });

  router.post("/logout", async (request, response, next) => {
    try {
      await authService.logout(readToken(request.header("authorization")));
      response.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.get("/status", async (request, response, next) => {
    try {
      const session = await authService.getSession(readToken(request.header("authorization")));
      if (!session) {
        response.json({
          mode: "production",
          authMode: "production",
          authenticated: false,
          session: null,
          subscription: null
        });
        return;
      }
      const userId = await authService.requireUserId(session.token);
      const subscription = await subscriptionService.ensureTrial(userId);
      response.json({
        mode: "production",
        authMode: "production",
        authenticated: true,
        session,
        subscription
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
