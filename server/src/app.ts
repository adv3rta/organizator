import cors from "cors";
import express from "express";
import { env, isProductionSubscription } from "./config/env.js";
import { getDb } from "./db/database.js";
import { MockPaymentProvider } from "./providers/mock-payment-provider.js";
import { YooKassaPaymentProvider } from "./providers/yookassa-payment-provider.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createAuthRoutes } from "./routes/auth-routes.js";
import { createPaymentRoutes } from "./routes/payment-routes.js";
import { AuthService } from "./services/auth-service.js";
import { PaymentService } from "./services/payment-service.js";
import { SubscriptionService } from "./services/subscription-service.js";

export const createServer = async () => {
  const db = await getDb(env.dbPath);
  const authService = new AuthService(db, env.sessionTtlDays);
  const subscriptionService = new SubscriptionService(db);
  const paymentProvider = isProductionSubscription
    ? new YooKassaPaymentProvider({
        shopId: env.yookassaShopId,
        secretKey: env.yookassaSecretKey,
        returnUrl: env.yookassaReturnUrl,
        paymentPageUrl: env.yookassaPaymentPageUrl
      })
    : new MockPaymentProvider();
  const paymentService = new PaymentService(db, paymentProvider);

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));

  app.get("/health", (_request, response) => {
    response.json({
      ok: true,
      subscriptionMode: env.subscriptionMode,
      authMode: env.authMode
    });
  });

  app.use(createAuthRoutes(authService, subscriptionService));
  app.use(createPaymentRoutes(authService, paymentService, subscriptionService));
  app.use(errorHandler);

  return app;
};
