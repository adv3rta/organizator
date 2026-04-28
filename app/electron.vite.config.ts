import { defineConfig, externalizeDepsPlugin } from "electron-vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const sharpNativeExternals = ["sharp", "@img/sharp-win32-x64", "@img/sharp-wasm32"];

export default defineConfig({
  main: {
    optimizeDeps: {
      exclude: sharpNativeExternals
    },
    ssr: {
      external: sharpNativeExternals
    },
    plugins: [
      externalizeDepsPlugin({
        include: sharpNativeExternals
      })
    ],
    build: {
      rollupOptions: {
        external: sharpNativeExternals,
        input: {
          index: path.resolve(__dirname, "src/main/index.ts")
        }
      }
    }
  },
  preload: {
    optimizeDeps: {
      exclude: sharpNativeExternals
    },
    ssr: {
      external: sharpNativeExternals
    },
    plugins: [
      externalizeDepsPlugin({
        include: sharpNativeExternals
      })
    ],
    build: {
      rollupOptions: {
        external: sharpNativeExternals,
        input: {
          index: path.resolve(__dirname, "src/preload/index.ts")
        }
      }
    }
  },
  renderer: {
    envPrefix: ["VITE_", "AUTH_", "SUBSCRIPTION_", "APP_"],
    resolve: {
      alias: {
        "@renderer": path.resolve(__dirname, "src/renderer/src")
      }
    },
    plugins: [react()]
  }
});
