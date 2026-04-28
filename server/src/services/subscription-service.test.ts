import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { afterEach, describe, expect, it } from "vitest";
import { getDb } from "../db/database.js";
import { SubscriptionService } from "./subscription-service.js";

const tempFiles: string[] = [];

afterEach(() => {
  for (const file of tempFiles.splice(0)) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
    }
  }
});

describe("SubscriptionService", () => {
  it("creates a 14 day trial for a new user", async () => {
    const dbPath = path.join(os.tmpdir(), `adverta-test-${Date.now()}.db`);
    tempFiles.push(dbPath);
    const db = await getDb(dbPath);
    await db.run(
      "INSERT INTO users (email, display_name, password_hash, created_at) VALUES (?, ?, ?, ?)",
      "user@example.com",
      "User",
      "hash",
      new Date().toISOString()
    );
    const subscriptionService = new SubscriptionService(db);
    const trial = await subscriptionService.ensureTrial(1);
    expect(trial.status).toBe("trialing");
    expect(trial.accessGranted).toBe(true);
    expect(trial.trialEndDate).toBeTruthy();
  });
});
