import type { AppSettings } from "../services/app-settings";

export interface ToolProps {
  incomingFiles?: string[];
  consumeIncomingFiles: () => void;
  appSettings: AppSettings;
}
