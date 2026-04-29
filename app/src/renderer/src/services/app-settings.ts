import { storage } from "./storage";

export type LanguageMode = "ru" | "eng";
export type ThemeMode = "dark" | "black";

export interface AppSettings {
  language: LanguageMode;
  defaultExportFolder: string | null;
  notifications: boolean;
  themeMode: ThemeMode;
  autoOpenExportFolder: boolean;
  confirmOverwrite: boolean;
  saveLastToolSettings: boolean;
}

export const SETTINGS_KEY = "app_settings";

export const defaultAppSettings: AppSettings = {
  language: "eng",
  defaultExportFolder: null,
  notifications: true,
  themeMode: "dark",
  autoOpenExportFolder: true,
  confirmOverwrite: true,
  saveLastToolSettings: true
};

export const loadAppSettings = async (): Promise<AppSettings> => {
  const saved = await storage.get<AppSettings>(SETTINGS_KEY);
  return {
    ...defaultAppSettings,
    ...(saved?.data ?? {})
  };
};

export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
  await storage.set(SETTINGS_KEY, settings);
};
