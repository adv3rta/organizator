import type { CreatePaymentResponse, SubscriptionPlan } from "@adverta/shared";
import type { AppDatabase } from "../db/database.js";
import type { PaymentProvider } from "../providers/payment-provider.js";

export class PaymentService {
  constructor(
    private readonly db: AppDatabase,
    private readonly provider: PaymentProvider
  ) {}

  async createPayment(userId: number, userEmail: string, plan: Exclude<SubscriptionPlan, "none">): Promise<CreatePaymentResponse> {
    const intent = await this.provider.createPayment(userEmail, plan);
    const now = new Date().toISOString();
    await this.db.run(
      `INSERT INTO payments (user_id, provider_payment_id, plan, status, checkout_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      userId,
      intent.paymentId,
      plan,
      "pending",
      intent.checkoutUrl,
      now,
      now
    );
    return intent;
  }

  async markPaid(paymentId: string): Promise<void> {
    await this.db.run(
      "UPDATE payments SET status = ?, updated_at = ? WHERE provider_payment_id = ?",
      "paid",
      new Date().toISOString(),
      paymentId
    );
  }

  async findByPaymentId(paymentId: string): Promise<{ userId: number; plan: Exclude<SubscriptionPlan, "none"> } | null> {
    const row = await this.db.get<{ user_id: number; plan: Exclude<SubscriptionPlan, "none"> }>(
      "SELECT user_id, plan FROM payments WHERE provider_payment_id = ?",
      paymentId
    );
    if (!row) {
      return null;
    }
    return {
      userId: row.user_id,
      plan: row.plan
    };
  }
}
