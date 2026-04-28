export interface RuntimeEnv {
  authMode: "mock" | "production";
  subscriptionMode: "mock" | "production";
  apiBaseUrl: string;
  cacheTtlHours: number;
}

let runtimeEnv: RuntimeEnv | null = null;

export const loadEnv = async (): Promise<RuntimeEnv> => {
  if (!runtimeEnv) {
    runtimeEnv = await window.adverta.runtimeConfig();
  }
  return runtimeEnv;
};

export const getEnv = (): RuntimeEnv => {
  if (!runtimeEnv) {
    return {
      authMode: "mock",
      subscriptionMode: "mock",
      apiBaseUrl: "http://127.0.0.1:3010",
      cacheTtlHours: 24
    };
  }
  return runtimeEnv;
};
