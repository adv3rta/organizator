import type { DesktopBridge } from "../../../preload/index";

declare global {
  interface Window {
    adverta: DesktopBridge;
  }
}

export {};
