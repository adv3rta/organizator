import type { SubscriptionPlan } from "@adverta/shared";

export interface PaymentIntent {
  paymentId: string;
  checkoutUrl: string;
}

export interface PaymentProvider {
  createPayment(userEmail: string, plan: Exclude<SubscriptionPlan, "none">): Promise<PaymentIntent>;
}
