import { createContext, useContext } from "react";
import type { AuthSession, StatusResponse } from "@adverta/shared";
import type { AuthProvider, PaymentProvider, SubscriptionProvider } from "../services/provider-types";

export type ScreenState = "loading" | "login" | "paywall" | "workspace" | "error";

export interface AppContextValue {
  authProvider: AuthProvider;
  subscriptionProvider: SubscriptionProvider;
  paymentProvider: PaymentProvider;
  session: AuthSession | null;
  status: StatusResponse | null;
  screen: ScreenState;
  busy: boolean;
  error: string | null;
  setBusy: (value: boolean) => void;
  setError: (value: string | null) => void;
  setSession: (value: AuthSession | null) => void;
  setStatus: (value: StatusResponse | null) => void;
  setScreen: (value: ScreenState) => void;
  refreshStatus: (sessionOverride?: AuthSession | null) => Promise<StatusResponse | null>;
}

export const AppContext = createContext<AppContextValue | null>(null);

export const useAppContext = (): AppContextValue => {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error("AppContext is not available.");
  }
  return value;
};
