export interface FileDialogRequest {
  title: string;
  properties: Array<"openFile" | "openDirectory" | "multiSelections">;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface FileDialogResponse {
  canceled: boolean;
  filePaths: string[];
}

export interface CacheEnvelope<T> {
  data: T;
  cachedAt: string;
}

export interface IpcResult<T> {
  ok: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}
