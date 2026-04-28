export type SubscriptionMode = "mock" | "production";
export type SubscriptionPlan = "monthly" | "annual" | "none";
export type SubscriptionStatus =
  | "new"
  | "trialing"
  | "active"
  | "expired"
  | "cancelled";

export interface SubscriptionSnapshot {
  status: SubscriptionStatus;
  plan: SubscriptionPlan;
  trialStartDate: string | null;
  trialEndDate: string | null;
  subscriptionEndsAt: string | null;
  accessGranted: boolean;
  isOfflineFallback?: boolean;
  updatedAt: string;
}

export interface StatusResponse {
  mode: SubscriptionMode;
  authMode: "mock" | "production";
  authenticated: boolean;
  session: import("./auth").AuthSession | null;
  subscription: SubscriptionSnapshot | null;
}

export interface RegisterStatusResponse {
  session: import("./auth").AuthSession;
  subscription: SubscriptionSnapshot;
}

export interface CreatePaymentRequest {
  plan: Exclude<SubscriptionPlan, "none">;
}

export interface CreatePaymentResponse {
  checkoutUrl: string;
  paymentId: string;
}
