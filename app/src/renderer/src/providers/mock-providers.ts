import type {
  AuthSession,
  AuthUser,
  CreatePaymentResponse,
  LoginRequest,
  RegisterRequest,
  StatusResponse,
  SubscriptionPlan,
  SubscriptionSnapshot
} from "@adverta/shared";
import { addDays } from "@adverta/shared";
import type { AuthProvider, PaymentProvider, SubscriptionProvider } from "../services/provider-types";
import { storage } from "../services/storage";

const SESSION_KEY = "mock_auth_session";
const SUBSCRIPTION_KEY = "mock_subscription_state";

const now = (): string => new Date().toISOString();

const buildUser = (input: { email: string; displayName?: string }): AuthUser => ({
  email: input.email.trim().toLowerCase(),
  displayName: input.displayName?.trim() || input.email.split("@")[0] || "Developer",
  createdAt: now()
});

const buildSession = (user: AuthUser): AuthSession => ({
  token: `mock_${Math.random().toString(36).slice(2)}`,
  user,
  provider: "mock",
  signedInAt: now()
});

const buildTrial = (): SubscriptionSnapshot => {
  const trialStartDate = now();
  return {
    status: "trialing",
    plan: "none",
    trialStartDate,
    trialEndDate: addDays(trialStartDate, 14),
    subscriptionEndsAt: null,
    accessGranted: true,
    updatedAt: now()
  };
};

const buildSubscription = (plan: Exclude<SubscriptionPlan, "none">): SubscriptionSnapshot => {
  const updatedAt = now();
  return {
    status: "active",
    plan,
    trialStartDate: null,
    trialEndDate: null,
    subscriptionEndsAt: addDays(updatedAt, plan === "annual" ? 365 : 30),
    accessGranted: true,
    updatedAt
  };
};

const buildExpiredTrial = (): SubscriptionSnapshot => {
  const trialStartDate = addDays(now(), -20);
  return {
    status: "expired",
    plan: "none",
    trialStartDate,
    trialEndDate: addDays(trialStartDate, 14),
    subscriptionEndsAt: null,
    accessGranted: false,
    updatedAt: now()
  };
};

export const debugStateFactory = {
  newUser: (): SubscriptionSnapshot | null => null,
  activeTrial: buildTrial,
  expiredTrial: buildExpiredTrial,
  activeMonthly: () => buildSubscription("monthly"),
  activeAnnual: () => buildSubscription("annual"),
  cancelled: (): SubscriptionSnapshot => ({
    status: "cancelled",
    plan: "none",
    trialStartDate: null,
    trialEndDate: null,
    subscriptionEndsAt: null,
    accessGranted: false,
    updatedAt: now()
  })
};

export class MockAuthProvider implements AuthProvider {
  async login(input: LoginRequest): Promise<AuthSession> {
    const session = buildSession(buildUser({ email: input.email }));
    await storage.set(SESSION_KEY, session);
    const existingSubscription = await storage.get<SubscriptionSnapshot | null>(SUBSCRIPTION_KEY);
    if (!existingSubscription?.data) {
      await storage.set(SUBSCRIPTION_KEY, buildTrial());
    }
    return session;
  }

  async register(input: RegisterRequest): Promise<AuthSession> {
    const session = buildSession(buildUser({ email: input.email, displayName: input.displayName }));
    await storage.set(SESSION_KEY, session);
    await storage.set(SUBSCRIPTION_KEY, buildTrial());
    return session;
  }

  async logout(): Promise<void> {
    await storage.delete(SESSION_KEY);
  }

  async loadSession(): Promise<AuthSession | null> {
    return (await storage.get<AuthSession>(SESSION_KEY))?.data ?? null;
  }
}

export class MockSubscriptionProvider implements SubscriptionProvider {
  async getStatus(session: AuthSession | null): Promise<StatusResponse> {
    const saved = (await storage.get<SubscriptionSnapshot | null>(SUBSCRIPTION_KEY))?.data ?? null;
    return {
      mode: "mock",
      authMode: "mock",
      authenticated: Boolean(session),
      session,
      subscription: session ? saved ?? buildTrial() : null
    };
  }

  async override(state: SubscriptionSnapshot | null): Promise<void> {
    await storage.set(SUBSCRIPTION_KEY, state);
  }
}

export class MockPaymentProvider implements PaymentProvider {
  async createPayment(_session: AuthSession, plan: Exclude<SubscriptionPlan, "none">): Promise<CreatePaymentResponse> {
    return {
      paymentId: `mock_${plan}_${Date.now()}`,
      checkoutUrl: `https://mock.adverta.local/${plan}`
    };
  }

  async simulateSuccess(_session: AuthSession, plan: Exclude<SubscriptionPlan, "none">): Promise<StatusResponse> {
    const snapshot = buildSubscription(plan);
    await storage.set(SUBSCRIPTION_KEY, snapshot);
    const session = (await storage.get<AuthSession>(SESSION_KEY))?.data ?? null;
    return {
      mode: "mock",
      authMode: "mock",
      authenticated: Boolean(session),
      session,
      subscription: snapshot
    };
  }
}
