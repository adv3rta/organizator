import type {
  AuthSession,
  CreatePaymentResponse,
  LoginRequest,
  RegisterRequest,
  StatusResponse,
  SubscriptionPlan
} from "@adverta/shared";
import type { AuthProvider, PaymentProvider, SubscriptionProvider } from "../services/provider-types";
import { createHttpClient } from "../services/http";
import { storage } from "../services/storage";

const SESSION_KEY = "backend_auth_session";
const STATUS_CACHE_KEY = "subscription_status_cache";

const authHeaders = (session: AuthSession | null | undefined): Record<string, string> =>
  session ? { Authorization: `Bearer ${session.token}` } : {};

export class BackendAuthProvider implements AuthProvider {
  async login(input: LoginRequest): Promise<AuthSession> {
    const http = createHttpClient();
    const response = await http.post("/login", input);
    await storage.set(SESSION_KEY, response.data.session);
    return response.data.session;
  }

  async register(input: RegisterRequest): Promise<AuthSession> {
    const http = createHttpClient();
    const response = await http.post("/register", input);
    await storage.set(SESSION_KEY, response.data.session);
    return response.data.session;
  }

  async logout(): Promise<void> {
    const http = createHttpClient();
    const session = await this.loadSession();
    await http.post("/logout", {}, { headers: authHeaders(session) }).catch(() => undefined);
    await storage.delete(SESSION_KEY);
  }

  async loadSession(): Promise<AuthSession | null> {
    return (await storage.get<AuthSession>(SESSION_KEY))?.data ?? null;
  }
}

export class BackendSubscriptionProvider implements SubscriptionProvider {
  constructor(private readonly cacheTtlHours: number) {}

  async getStatus(session: AuthSession | null): Promise<StatusResponse> {
    try {
      const http = createHttpClient();
      const response = await http.get("/status", { headers: authHeaders(session) });
      await storage.set(STATUS_CACHE_KEY, response.data);
      return response.data;
    } catch (error) {
      const cached = (await storage.get<StatusResponse>(STATUS_CACHE_KEY))?.data ?? null;
      if (cached) {
        const cachedEnvelope = await storage.get<StatusResponse>(STATUS_CACHE_KEY);
        const ageHours =
          cachedEnvelope ? (Date.now() - new Date(cachedEnvelope.cachedAt).getTime()) / (1000 * 60 * 60) : Infinity;
        if (ageHours <= this.cacheTtlHours) {
          return {
            ...cached,
            subscription: cached.subscription ? { ...cached.subscription, isOfflineFallback: true } : null
          };
        }
      }
      throw error;
    }
  }
}

export class BackendPaymentProvider implements PaymentProvider {
  async createPayment(session: AuthSession, plan: Exclude<SubscriptionPlan, "none">): Promise<CreatePaymentResponse> {
    const http = createHttpClient();
    const response = await http.post(
      "/create-payment",
      { plan },
      {
        headers: authHeaders(session)
      }
    );
    return response.data;
  }
}
