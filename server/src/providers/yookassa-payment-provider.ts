import crypto from "node:crypto";
import type { SubscriptionPlan } from "@adverta/shared";
import { HttpError } from "../services/errors.js";
import type { PaymentIntent, PaymentProvider } from "./payment-provider.js";

interface YooKassaConfig {
  shopId: string;
  secretKey: string;
  returnUrl: string;
  paymentPageUrl: string;
}

export class YooKassaPaymentProvider implements PaymentProvider {
  constructor(private readonly config: YooKassaConfig) {}

  async createPayment(userEmail: string, plan: Exclude<SubscriptionPlan, "none">): Promise<PaymentIntent> {
    if (!this.config.shopId || !this.config.secretKey || !this.config.returnUrl || !this.config.paymentPageUrl) {
      throw new HttpError(
        500,
        "PAYMENT_PROVIDER_NOT_CONFIGURED",
        "YooKassa production mode is selected, but credentials or URLs are missing."
      );
    }
    const paymentId = crypto.randomUUID();
    const params = new URLSearchParams({
      plan,
      email: userEmail,
      paymentId,
      returnUrl: this.config.returnUrl
    });
    return {
      paymentId,
      checkoutUrl: `${this.config.paymentPageUrl}?${params.toString()}`
    };
  }
}
