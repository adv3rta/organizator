import type { SubscriptionPlan } from "@adverta/shared";
import type { PaymentIntent, PaymentProvider } from "./payment-provider.js";

export class MockPaymentProvider implements PaymentProvider {
  async createPayment(_userEmail: string, plan: Exclude<SubscriptionPlan, "none">): Promise<PaymentIntent> {
    const paymentId = `mock_${plan}_${Date.now()}`;
    return {
      paymentId,
      checkoutUrl: `https://mock.adverta.local/checkout/${paymentId}`
    };
  }
}
