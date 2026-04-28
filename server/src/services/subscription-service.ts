import type { SubscriptionPlan, SubscriptionSnapshot, SubscriptionStatus } from "@adverta/shared";
import { addDays } from "@adverta/shared";
import type { AppDatabase } from "../db/database.js";

const PLANS: Record<Exclude<SubscriptionPlan, "none">, { amount: number; days: number }> = {
  monthly: { amount: 4.99, days: 30 },
  annual: { amount: 49.99, days: 365 }
};

export class SubscriptionService {
  constructor(private readonly db: AppDatabase) {}

  async ensureTrial(userId: number): Promise<SubscriptionSnapshot> {
    const existing = await this.getSubscription(userId);
    if (existing) {
      return existing;
    }
    const trialStartDate = new Date().toISOString();
    const trialEndDate = addDays(trialStartDate, 14);
    await this.db.run(
      `INSERT INTO subscriptions (user_id, status, plan, trial_start_date, trial_end_date, subscription_ends_at, provider_subscription_id, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      userId,
      "trialing",
      "none",
      trialStartDate,
      trialEndDate,
      null,
      null,
      new Date().toISOString()
    );
    return this.getSubscription(userId) as Promise<SubscriptionSnapshot>;
  }

  async getSubscription(userId: number): Promise<SubscriptionSnapshot | null> {
    const row = await this.db.get<{
      status: SubscriptionStatus;
      plan: SubscriptionPlan;
      trial_start_date: string | null;
      trial_end_date: string | null;
      subscription_ends_at: string | null;
      updated_at: string;
    }>("SELECT * FROM subscriptions WHERE user_id = ?", userId);
    if (!row) {
      return null;
    }
    let status = row.status;
    const now = Date.now();
    if (status === "trialing" && row.trial_end_date && new Date(row.trial_end_date).getTime() < now) {
      status = "expired";
      await this.update(userId, status, row.plan, row.subscription_ends_at, row.trial_start_date, row.trial_end_date);
    }
    if (status === "active" && row.subscription_ends_at && new Date(row.subscription_ends_at).getTime() < now) {
      status = "expired";
      await this.update(userId, status, "none", row.subscription_ends_at, row.trial_start_date, row.trial_end_date);
    }
    return {
      status,
      plan: status === "active" ? row.plan : row.plan === "none" ? "none" : row.plan,
      trialStartDate: row.trial_start_date,
      trialEndDate: row.trial_end_date,
      subscriptionEndsAt: row.subscription_ends_at,
      accessGranted: status === "trialing" || status === "active",
      updatedAt: new Date().toISOString()
    };
  }

  async activatePlan(userId: number, plan: Exclude<SubscriptionPlan, "none">, providerPaymentId?: string): Promise<SubscriptionSnapshot> {
    const startsAt = new Date().toISOString();
    const endsAt = addDays(startsAt, PLANS[plan].days);
    const current = await this.getSubscription(userId);
    if (!current) {
      await this.ensureTrial(userId);
    }
    await this.db.run(
      `UPDATE subscriptions
       SET status = ?, plan = ?, subscription_ends_at = ?, provider_subscription_id = ?, updated_at = ?
       WHERE user_id = ?`,
      "active",
      plan,
      endsAt,
      providerPaymentId ?? null,
      startsAt,
      userId
    );
    return this.getSubscription(userId) as Promise<SubscriptionSnapshot>;
  }

  async cancel(userId: number): Promise<SubscriptionSnapshot> {
    const current = await this.ensureTrial(userId);
    await this.update(
      userId,
      "cancelled",
      "none",
      current.subscriptionEndsAt,
      current.trialStartDate,
      current.trialEndDate
    );
    return this.getSubscription(userId) as Promise<SubscriptionSnapshot>;
  }

  private async update(
    userId: number,
    status: SubscriptionStatus,
    plan: SubscriptionPlan,
    subscriptionEndsAt: string | null,
    trialStartDate: string | null,
    trialEndDate: string | null
  ): Promise<void> {
    await this.db.run(
      `UPDATE subscriptions
       SET status = ?, plan = ?, subscription_ends_at = ?, trial_start_date = ?, trial_end_date = ?, updated_at = ?
       WHERE user_id = ?`,
      status,
      plan,
      subscriptionEndsAt,
      trialStartDate,
      trialEndDate,
      new Date().toISOString(),
      userId
    );
  }
}
