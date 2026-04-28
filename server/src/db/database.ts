import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database as SqlJsDatabase, type SqlValue, type QueryExecResult } from "sql.js";

export interface AppDatabase {
  exec(sql: string): Promise<void>;
  run(sql: string, ...params: SqlValue[]): Promise<{ lastID?: number }>;
  get<T>(sql: string, ...params: SqlValue[]): Promise<T | undefined>;
}

let dbPromise: Promise<AppDatabase> | null = null;

const migrations = [
  "PRAGMA foreign_keys = ON;",
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    user_id INTEGER PRIMARY KEY,
    status TEXT NOT NULL,
    plan TEXT NOT NULL,
    trial_start_date TEXT,
    trial_end_date TEXT,
    subscription_ends_at TEXT,
    provider_subscription_id TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`,
  `CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider_payment_id TEXT NOT NULL,
    plan TEXT NOT NULL,
    status TEXT NOT NULL,
    checkout_url TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );`
];

const normalizeObject = <T>(result?: QueryExecResult): T | undefined => {
  if (!result || result.values.length === 0) {
    return undefined;
  }
  const row = result.values[0];
  const object = Object.fromEntries(result.columns.map((column, index) => [column, row[index]]));
  return object as T;
};

const buildDatabase = (db: SqlJsDatabase, dbPath: string): AppDatabase => {
  const persist = (): void => {
    const buffer = Buffer.from(db.export());
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
    fs.writeFileSync(dbPath, buffer);
  };

  return {
    async exec(sql: string) {
      db.exec(sql);
      persist();
    },
    async run(sql: string, ...params: SqlValue[]) {
      db.run(sql, params);
      const result = normalizeObject<{ id: number }>(db.exec("SELECT last_insert_rowid() AS id;")[0]);
      persist();
      return { lastID: result?.id };
    },
    async get<T>(sql: string, ...params: SqlValue[]) {
      const statement = db.prepare(sql, params);
      const hasRow = statement.step();
      if (!hasRow) {
        statement.free();
        return undefined;
      }
      const row = statement.getAsObject() as T;
      statement.free();
      return row;
    }
  };
};

export const getDb = async (dbPath: string): Promise<AppDatabase> => {
  if (!dbPromise) {
    const SQL = await initSqlJs({});
    const resolved = path.resolve(dbPath);
    const existing = fs.existsSync(resolved) ? fs.readFileSync(resolved) : undefined;
    const db = existing ? new SQL.Database(existing) : new SQL.Database();
    dbPromise = Promise.resolve(buildDatabase(db, resolved)).then(async (database) => {
      for (const migration of migrations) {
        await database.exec(migration);
      }
      return database;
    });
  }
  return dbPromise;
};
