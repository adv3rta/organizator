import { contextBridge, ipcRenderer } from "electron";
import type {
  CacheEnvelope,
  FileDialogRequest,
  FileDialogResponse,
  IpcResult,
  ImageSlicerInput,
  ImageSlicerResult,
  MetadataInspection,
  MetadataUpdateEntry,
  MetadataUpdateResult,
  PaletteGrabberInput,
  PaletteResult,
  WatermarkJobInput,
  WatermarkJobResult
} from "@adverta/shared";

const invoke = async <T>(channel: string, payload?: unknown): Promise<T> => ipcRenderer.invoke(channel, payload);

const api = {
  runtimeConfig: (): Promise<{
    authMode: "mock" | "production";
    subscriptionMode: "mock" | "production";
    apiBaseUrl: string;
    cacheTtlHours: number;
  }> => invoke("app:runtime-config"),
  selectFiles: (request: FileDialogRequest): Promise<FileDialogResponse> => invoke("dialog:select-files", request),
  selectFolder: (request: FileDialogRequest): Promise<FileDialogResponse> => invoke("dialog:select-folder", request),
  openExternal: (url: string): Promise<void> => invoke("shell:open-external", url),
  copyToClipboard: (value: string): Promise<void> => invoke("clipboard:write-text", value),
  cacheGet: <T>(key: string): Promise<CacheEnvelope<T> | null> => invoke("cache:get", key),
  cacheSet: <T>(key: string, value: CacheEnvelope<T>): Promise<void> => invoke("cache:set", { key, value }),
  cacheDelete: (key: string): Promise<void> => invoke("cache:delete", key),
  inspectMetadata: (paths: string[]): Promise<IpcResult<MetadataInspection[]>> => invoke("tool:metadata-inspect", paths),
  updateMetadata: (entries: MetadataUpdateEntry[]): Promise<IpcResult<MetadataUpdateResult>> =>
    invoke("tool:metadata-update", entries),
  sliceImage: (input: ImageSlicerInput): Promise<IpcResult<ImageSlicerResult>> => invoke("tool:image-slice", input),
  applyWatermark: (input: WatermarkJobInput): Promise<IpcResult<WatermarkJobResult>> =>
    invoke("tool:watermark", input),
  grabPalette: (input: PaletteGrabberInput): Promise<IpcResult<PaletteResult>> => invoke("tool:palette-grab", input)
};

contextBridge.exposeInMainWorld("adverta", api);

export type DesktopBridge = typeof api;
