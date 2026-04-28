import crypto from "node:crypto";
import { addDays } from "@adverta/shared";
import type { AuthSession, AuthUser, LoginRequest, RegisterRequest } from "@adverta/shared";
import type { AppDatabase } from "../db/database.js";
import { HttpError } from "./errors.js";

const hashPassword = (password: string): string =>
  crypto.pbkdf2Sync(password, "adverta-tools", 100_000, 64, "sha512").toString("hex");

const createToken = (): string => crypto.randomBytes(24).toString("hex");

export class AuthService {
  constructor(
    private readonly db: AppDatabase,
    private readonly sessionTtlDays: number
  ) {}

  async register(input: RegisterRequest): Promise<AuthSession> {
    const email = input.email.trim().toLowerCase();
    if (!email || !input.password || !input.displayName.trim()) {
      throw new HttpError(400, "INVALID_INPUT", "Email, password, and display name are required.");
    }
    const existing = await this.db.get<{ id: number }>("SELECT id FROM users WHERE email = ?", email);
    if (existing) {
      throw new HttpError(409, "EMAIL_EXISTS", "An account with this email already exists.");
    }
    const createdAt = new Date().toISOString();
    const result = await this.db.run(
      "INSERT INTO users (email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?)",
      email,
      input.displayName.trim(),
      hashPassword(input.password),
      createdAt
    );
    const userId = result.lastID;
    if (!userId) {
      throw new HttpError(500, "REGISTER_FAILED", "Failed to create user.");
    }
    return this.createSession(userId, {
      email,
      displayName: input.displayName.trim(),
      createdAt
    });
  }

  async login(input: LoginRequest): Promise<AuthSession> {
    const email = input.email.trim().toLowerCase();
    const user = await this.db.get<{
      id: number;
      email: string;
      display_name: string;
      password_hash: string;
      created_at: string;
    }>("SELECT * FROM users WHERE email = ?", email);
    if (!user || user.password_hash !== hashPassword(input.password)) {
      throw new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password.");
    }
    return this.createSession(user.id, {
      email: user.email,
      displayName: user.display_name,
      createdAt: user.created_at
    });
  }

  async getSession(token: string | undefined): Promise<AuthSession | null> {
    if (!token) {
      return null;
    }
    const row = await this.db.get<{
      token: string;
      created_at: string;
      expires_at: string;
      email: string;
      display_name: string;
      user_created_at: string;
    }>(
      `SELECT sessions.token, sessions.created_at, sessions.expires_at,
              users.email, users.display_name, users.created_at AS user_created_at
       FROM sessions
       INNER JOIN users ON users.id = sessions.user_id
       WHERE sessions.token = ?`,
      token
    );
    if (!row) {
      return null;
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await this.logout(token);
      return null;
    }
    return {
      token: row.token,
      signedInAt: row.created_at,
      provider: "production",
      user: {
        email: row.email,
        displayName: row.display_name,
        createdAt: row.user_created_at
      }
    };
  }

  async requireUserId(token: string | undefined): Promise<number> {
    if (!token) {
      throw new HttpError(401, "UNAUTHORIZED", "Authentication required.");
    }
    const row = await this.db.get<{ user_id: number; expires_at: string }>(
      "SELECT user_id, expires_at FROM sessions WHERE token = ?",
      token
    );
    if (!row || new Date(row.expires_at).getTime() < Date.now()) {
      throw new HttpError(401, "UNAUTHORIZED", "Session is not valid.");
    }
    return row.user_id;
  }

  async logout(token: string | undefined): Promise<void> {
    if (!token) {
      return;
    }
    await this.db.run("DELETE FROM sessions WHERE token = ?", token);
  }

  private async createSession(userId: number, user: AuthUser): Promise<AuthSession> {
    const token = createToken();
    const signedInAt = new Date().toISOString();
    const expiresAt = addDays(signedInAt, this.sessionTtlDays);
    await this.db.run(
      "INSERT INTO sessions (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
      token,
      userId,
      signedInAt,
      expiresAt
    );
    return {
      token,
      signedInAt,
      provider: "production",
      user
    };
  }
}
