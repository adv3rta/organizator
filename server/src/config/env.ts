import "dotenv/config";

const read = (name: string, fallback?: string): string => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
};

export const env = {
  port: Number(read("SERVER_PORT", "3010")),
  host: read("SERVER_HOST", "127.0.0.1"),
  dbPath: read("SERVER_DB_PATH", "./server/data/adverta-tools.db"),
  authMode: read("AUTH_MODE", "mock"),
  subscriptionMode: read("SUBSCRIPTION_MODE", "mock"),
  sessionTtlDays: Number(read("SESSION_TTL_DAYS", "30")),
  yookassaShopId: process.env.YOOKASSA_SHOP_ID ?? "",
  yookassaSecretKey: process.env.YOOKASSA_SECRET_KEY ?? "",
  yookassaReturnUrl: process.env.YOOKASSA_RETURN_URL ?? "",
  yookassaWebhookSecret: process.env.YOOKASSA_WEBHOOK_SECRET ?? "",
  yookassaPaymentPageUrl: process.env.YOOKASSA_PAYMENT_PAGE_URL ?? ""
};

export const isProductionSubscription = env.subscriptionMode === "production";
