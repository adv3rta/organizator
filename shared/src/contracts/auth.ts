export type AuthMode = "mock" | "production";

export interface AuthUser {
  email: string;
  displayName: string;
  createdAt: string;
}

export interface AuthSession {
  token: string;
  user: AuthUser;
  provider: AuthMode;
  signedInAt: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LogoutResponse {
  success: true;
}
