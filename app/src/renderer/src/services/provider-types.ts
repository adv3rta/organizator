import type {
  AuthSession,
  CreatePaymentResponse,
  LoginRequest,
  RegisterRequest,
  StatusResponse,
  SubscriptionPlan
} from "@adverta/shared";

export interface AuthProvider {
  login(input: LoginRequest): Promise<AuthSession>;
  register(input: RegisterRequest): Promise<AuthSession>;
  logout(): Promise<void>;
  loadSession(): Promise<AuthSession | null>;
}

export interface SubscriptionProvider {
  getStatus(session: AuthSession | null): Promise<StatusResponse>;
}

export interface PaymentProvider {
  createPayment(session: AuthSession, plan: Exclude<SubscriptionPlan, "none">): Promise<CreatePaymentResponse>;
  simulateSuccess?(session: AuthSession, plan: Exclude<SubscriptionPlan, "none">): Promise<StatusResponse>;
}
