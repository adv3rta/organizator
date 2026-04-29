import fs from "node:fs";
import path from "node:path";
import { app } from "electron";

const filePath = (): string => path.join(app.getPath("userData"), "app-cache.json");

const readStore = (): Record<string, unknown> => {
  try {
    if (!fs.existsSync(filePath())) {
      return {};
    }
    return JSON.parse(fs.readFileSync(filePath(), "utf8")) as Record<string, unknown>;
  } catch {
    return {};
  }
};

const writeStore = (value: Record<string, unknown>): void => {
  fs.mkdirSync(path.dirname(filePath()), { recursive: true });
  fs.writeFileSync(filePath(), JSON.stringify(value, null, 2), "utf8");
};

export const cacheStore = {
  get<T>(key: string): T | null {
    const store = readStore();
    return (store[key] as T | undefined) ?? null;
  },
  getAll(): Record<string, unknown> {
    return readStore();
  },
  set<T>(key: string, value: T): void {
    const store = readStore();
    store[key] = value;
    writeStore(store);
  },
  delete(key: string): void {
    const store = readStore();
    delete store[key];
    writeStore(store);
  },
  clear(): void {
    writeStore({});
  }
};
