import { type RuntimeEnv } from "./env";
import type { AuthProvider, PaymentProvider, SubscriptionProvider } from "./provider-types";
import {
  BackendAuthProvider,
  BackendPaymentProvider,
  BackendSubscriptionProvider
} from "../providers/backend-providers";
import { MockAuthProvider, MockPaymentProvider, MockSubscriptionProvider } from "../providers/mock-providers";

export const createProviders = (): {
  authProvider: AuthProvider;
  subscriptionProvider: SubscriptionProvider;
  paymentProvider: PaymentProvider;
} => {
  throw new Error("createProviders requires runtime env.");
};

export const createProvidersFromEnv = (env: RuntimeEnv): {
  authProvider: AuthProvider;
  subscriptionProvider: SubscriptionProvider;
  paymentProvider: PaymentProvider;
} => {
  const authProvider = env.authMode === "mock" ? new MockAuthProvider() : new BackendAuthProvider();
  const subscriptionProvider =
    env.subscriptionMode === "mock" ? new MockSubscriptionProvider() : new BackendSubscriptionProvider(env.cacheTtlHours);
  const paymentProvider = env.subscriptionMode === "mock" ? new MockPaymentProvider() : new BackendPaymentProvider();
  console.log(`[renderer] auth=${env.authMode} subscriptions=${env.subscriptionMode}`);
  return {
    authProvider,
    subscriptionProvider,
    paymentProvider
  };
};
