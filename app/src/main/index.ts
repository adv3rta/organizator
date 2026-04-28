import { app, BrowserWindow, clipboard, dialog, ipcMain, shell } from "electron";
import path from "node:path";
import { cacheStore } from "./cache-store.js";
import { applyWatermark, grabPalette, inspectMetadata, sliceImage, updateMetadata } from "./tools.js";

const isDev = !!process.env.ELECTRON_RENDERER_URL;

const createWindow = async (): Promise<void> => {
  const window = new BrowserWindow({
    width: 1520,
    height: 960,
    minWidth: 1280,
    minHeight: 860,
    backgroundColor: "#1E1E2E",
    title: "Adverta Tools",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.mjs"),
      contextIsolation: true,
      sandbox: false
    }
  });

  if (isDev) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL as string);
  } else {
    await window.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
};

app.whenReady().then(async () => {
  console.log(
    `[app] Adverta Tools starting | auth=${process.env.AUTH_MODE ?? "mock"} | subscriptions=${process.env.SUBSCRIPTION_MODE ?? "mock"}`
  );
  ipcMain.handle("app:runtime-config", async () => ({
    authMode: (process.env.AUTH_MODE ?? "mock") as "mock" | "production",
    subscriptionMode: (process.env.SUBSCRIPTION_MODE ?? "mock") as "mock" | "production",
    apiBaseUrl: process.env.APP_API_BASE_URL ?? "http://127.0.0.1:3010",
    cacheTtlHours: Number(process.env.APP_CACHE_TTL_HOURS ?? "24")
  }));
  ipcMain.handle("dialog:select-files", async (_event, request) =>
    dialog.showOpenDialog({
      title: request.title,
      properties: request.properties,
      filters: request.filters
    })
  );
  ipcMain.handle("dialog:select-folder", async (_event, request) =>
    dialog.showOpenDialog({
      title: request.title,
      properties: request.properties
    })
  );
  ipcMain.handle("shell:open-external", async (_event, url: string) => {
    await shell.openExternal(url);
  });
  ipcMain.handle("clipboard:write-text", async (_event, value: string) => {
    clipboard.writeText(value);
  });
  ipcMain.handle("cache:get", async (_event, key: string) => cacheStore.get(key));
  ipcMain.handle("cache:set", async (_event, payload: { key: string; value: unknown }) => {
    cacheStore.set(payload.key, payload.value);
  });
  ipcMain.handle("cache:delete", async (_event, key: string) => {
    cacheStore.delete(key);
  });
  ipcMain.handle("tool:metadata-inspect", async (_event, payload: string[]) => {
    try {
      return { ok: true, data: await inspectMetadata(payload) };
    } catch (error) {
      return { ok: false, error: { message: error instanceof Error ? error.message : "Inspection failed." } };
    }
  });
  ipcMain.handle("tool:metadata-update", async (_event, payload) => {
    try {
      return { ok: true, data: await updateMetadata(payload) };
    } catch (error) {
      return { ok: false, error: { message: error instanceof Error ? error.message : "Metadata update failed." } };
    }
  });
  ipcMain.handle("tool:image-slice", async (_event, payload) => {
    try {
      return { ok: true, data: await sliceImage(payload) };
    } catch (error) {
      return { ok: false, error: { message: error instanceof Error ? error.message : "Image slicing failed." } };
    }
  });
  ipcMain.handle("tool:watermark", async (_event, payload) => {
    try {
      return { ok: true, data: await applyWatermark(payload) };
    } catch (error) {
      return { ok: false, error: { message: error instanceof Error ? error.message : "Watermarking failed." } };
    }
  });
  ipcMain.handle("tool:palette-grab", async (_event, payload) => {
    try {
      return { ok: true, data: await grabPalette(payload) };
    } catch (error) {
      return { ok: false, error: { message: error instanceof Error ? error.message : "Palette extraction failed." } };
    }
  });
  await createWindow();
  app.on("activate", async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
