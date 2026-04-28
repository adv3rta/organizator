import { Router } from "express";
import { z } from "zod";
import type { AuthService } from "../services/auth-service.js";
import type { PaymentService } from "../services/payment-service.js";
import type { SubscriptionService } from "../services/subscription-service.js";

const createPaymentSchema = z.object({
  plan: z.enum(["monthly", "annual"])
});

const webhookSchema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(["paid"])
});

const readToken = (authorization?: string): string | undefined =>
  authorization?.startsWith("Bearer ") ? authorization.slice("Bearer ".length) : undefined;

export const createPaymentRoutes = (
  authService: AuthService,
  paymentService: PaymentService,
  subscriptionService: SubscriptionService
): Router => {
  const router = Router();

  router.post("/create-payment", async (request, response, next) => {
    try {
      const payload = createPaymentSchema.parse(request.body);
      const token = readToken(request.header("authorization"));
      const session = await authService.getSession(token);
      const userId = await authService.requireUserId(token);
      if (!session) {
        response.status(401).json({
          error: {
            code: "UNAUTHORIZED",
            message: "Login is required."
          }
        });
        return;
      }
      const payment = await paymentService.createPayment(userId, session.user.email, payload.plan);
      response.json(payment);
    } catch (error) {
      next(error);
    }
  });

  router.post("/webhooks/yookassa", async (request, response, next) => {
    try {
      const payload = webhookSchema.parse(request.body);
      await paymentService.markPaid(payload.paymentId);
      const payment = await paymentService.findByPaymentId(payload.paymentId);
      if (payment) {
        await subscriptionService.activatePlan(payment.userId, payment.plan, payload.paymentId);
      }
      response.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  router.post("/payments/mock-complete", async (request, response, next) => {
    try {
      const payload = createPaymentSchema.parse(request.body);
      const token = readToken(request.header("authorization"));
      const userId = await authService.requireUserId(token);
      const subscription = await subscriptionService.activatePlan(userId, payload.plan);
      response.json({ subscription });
    } catch (error) {
      next(error);
    }
  });

  return router;
};
