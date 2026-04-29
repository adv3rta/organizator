import { useEffect, useMemo, useState } from "react";
import type { AuthSession, StatusResponse, SubscriptionPlan } from "@adverta/shared";
import { AppContext, type ScreenState } from "./contexts/AppContext";
import { BackArrow } from "./components/BackArrow";
import { Button } from "./components/Button";
import { Card } from "./components/Card";
import { DebugPanel } from "./components/DebugPanel";
import { Input } from "./components/Input";
import { Toggle } from "./components/Toggle";
import { createProvidersFromEnv } from "./services/provider-factory";
import { getEnv, loadEnv, type RuntimeEnv } from "./services/env";
import { defaultAppSettings, loadAppSettings, saveAppSettings, type AppSettings } from "./services/app-settings";
import { ImageSlicerTool } from "./tools/ImageSlicerTool";
import { MetadataEditorTool } from "./tools/MetadataEditorTool";
import { PaletteGrabberTool } from "./tools/PaletteGrabberTool";
import { WatermarkTool } from "./tools/WatermarkTool";

const tools = [
  { id: "slicer", title: "slicer", icon: "grid" },
  { id: "metadata", title: "metadata", icon: "text" },
  { id: "watermark", title: "watermark", icon: "drop" },
  { id: "palette", title: "palette", icon: "palette" }
] as const;

type ToolId = (typeof tools)[number]["id"];
type WorkspaceView = "menu" | "settings" | ToolId;

const imageExtensions = new Set(["png", "jpg", "jpeg", "webp", "bmp", "gif", "tif", "tiff"]);
const metadataExtensions = new Set(["mp3", "pdf", "png", "jpg", "jpeg", "webp", "tif", "tiff"]);

const fileExt = (filePath: string): string => filePath.split(".").pop()?.toLowerCase() ?? "";

const pickToolFromDrop = (paths: string[]): ToolId => {
  if (paths.length > 1) {
    return paths.every((item) => imageExtensions.has(fileExt(item))) ? "watermark" : "metadata";
  }
  const extension = fileExt(paths[0] ?? "");
  if (extension && metadataExtensions.has(extension) && !imageExtensions.has(extension)) {
    return "metadata";
  }
  return "slicer";
};

const TileIcon = ({ icon }: { icon: (typeof tools)[number]["icon"] }) => {
  if (icon === "grid") {
    return (
      <div className="menu-icon-grid" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (icon === "text") {
    return (
      <div className="menu-icon-text" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    );
  }

  if (icon === "drop") {
    return <div className="menu-icon-drop" aria-hidden="true" />;
  }

  return (
    <div className="menu-icon-palette" aria-hidden="true">
      <span />
      <span />
      <span />
    </div>
  );
};

interface SettingsScreenProps {
  settings: AppSettings;
  onChange: (patch: Partial<AppSettings>) => void;
  onChooseFolder: () => void;
  onClearCache: () => void;
  onExportLogs: () => void;
  onBack: () => void;
  onLogout: () => void;
  status: StatusResponse | null;
}

const SettingsScreen = ({
  settings,
  onChange,
  onChooseFolder,
  onClearCache,
  onExportLogs,
  onBack,
  onLogout,
  status
}: SettingsScreenProps) => (
  <section className="workspace-detail">
    <header className="tool-topbar">
      <BackArrow onClick={onBack} />
      <div className="tool-topbar-copy">
        <h1 className="tool-topbar-title">Settings</h1>
        <p className="tool-topbar-subtitle">Configure Adverta Tools without leaving the workspace.</p>
      </div>
    </header>

    <div className="settings-layout">
      <Card className="tool-panel" title="Preferences" subtitle="Compact controls with saved local state.">
        <div className="settings-grid">
          <div className="settings-row">
            <div className="settings-copy">
              <span className="settings-label">Language</span>
              <span className="settings-hint">Choose interface language.</span>
            </div>
            <div className="segmented-control">
              <Button className={settings.language === "ru" ? "is-active" : ""} onClick={() => onChange({ language: "ru" })}>
                RU
              </Button>
              <Button className={settings.language === "eng" ? "is-active" : ""} onClick={() => onChange({ language: "eng" })}>
                ENG
              </Button>
            </div>
          </div>

          <div className="settings-row">
            <div className="settings-copy">
              <span className="settings-label">Default export folder</span>
              <span className="settings-hint selected-file">{settings.defaultExportFolder ?? "Not selected"}</span>
            </div>
            <Button onClick={onChooseFolder}>Choose folder</Button>
          </div>

          <div className="settings-row">
            <div className="settings-copy">
              <span className="settings-label">Theme mode</span>
              <span className="settings-hint">Switch between dark and pure black surfaces.</span>
            </div>
            <div className="segmented-control">
              <Button className={settings.themeMode === "dark" ? "is-active" : ""} onClick={() => onChange({ themeMode: "dark" })}>
                Dark
              </Button>
              <Button className={settings.themeMode === "black" ? "is-active" : ""} onClick={() => onChange({ themeMode: "black" })}>
                Pure black
              </Button>
            </div>
          </div>

          <Toggle checked={settings.notifications} onChange={(value) => onChange({ notifications: value })} label="Notifications" hint="Show completion notifications inside the app." />
          <Toggle checked={settings.autoOpenExportFolder} onChange={(value) => onChange({ autoOpenExportFolder: value })} label="Auto-open export folder" hint="Open the selected destination after export finishes." />
          <Toggle checked={settings.confirmOverwrite} onChange={(value) => onChange({ confirmOverwrite: value })} label="Confirm overwrite" hint="Ask before replacing existing files." />
          <Toggle checked={settings.saveLastToolSettings} onChange={(value) => onChange({ saveLastToolSettings: value })} label="Save last tool settings" hint="Restore the last values when you reopen a tool." />
        </div>
      </Card>

      <Card className="tool-panel tool-panel-secondary" title="Maintenance" subtitle="Local cleanup and export actions.">
        <div className="settings-grid">
          <div className="settings-row">
            <div className="settings-copy">
              <span className="settings-label">Subscription state</span>
              <span className="settings-hint">{status?.subscription?.status ?? "unknown"}</span>
            </div>
          </div>
          <div className="tool-panel-actions">
            <Button onClick={onClearCache}>Clear cache</Button>
            <Button onClick={onExportLogs}>Export logs</Button>
            <Button onClick={onLogout}>Log out</Button>
          </div>
        </div>
      </Card>
    </div>
  </section>
);

export default function App() {
  const [runtimeEnv, setRuntimeEnv] = useState<RuntimeEnv>(getEnv());
  const providers = useMemo(() => createProvidersFromEnv(runtimeEnv), [runtimeEnv]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [screen, setScreen] = useState<ScreenState>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceView, setWorkspaceView] = useState<WorkspaceView>("menu");
  const [authModeView, setAuthModeView] = useState<"login" | "register">("login");
  const [debugVisible, setDebugVisible] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>(defaultAppSettings);
  const [pendingDrop, setPendingDrop] = useState<{ tool: ToolId; files: string[]; token: number } | null>(null);
  const [dropActive, setDropActive] = useState(false);

  const refreshStatus = async (sessionOverride?: AuthSession | null): Promise<StatusResponse | null> => {
    const activeSession = sessionOverride ?? session;
    try {
      const response = await providers.subscriptionProvider.getStatus(activeSession);
      setStatus(response);
      if (!response.authenticated || !response.session) {
        setScreen("login");
      } else if (!response.subscription?.accessGranted) {
        setScreen("paywall");
      } else {
        setScreen("workspace");
      }
      setError(null);
      return response;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Unable to refresh status.");
      setScreen(activeSession ? "error" : "login");
      return null;
    }
  };

  useEffect(() => {
    void (async () => {
      try {
        const [nextEnv, nextSettings] = await Promise.all([loadEnv(), loadAppSettings()]);
        setRuntimeEnv(nextEnv);
        setAppSettings(nextSettings);
        const bootstrapProviders = createProvidersFromEnv(nextEnv);
        const storedSession = await bootstrapProviders.authProvider.loadSession();
        setSession(storedSession);
        try {
          const response = await bootstrapProviders.subscriptionProvider.getStatus(storedSession);
          setStatus(response);
          if (!response.authenticated || !response.session) {
            setScreen("login");
          } else if (!response.subscription?.accessGranted) {
            setScreen("paywall");
          } else {
            setScreen("workspace");
          }
        } catch (caughtError) {
          setError(caughtError instanceof Error ? caughtError.message : "Bootstrap failed.");
          setScreen(storedSession ? "error" : "login");
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : "Bootstrap failed.");
        setScreen("login");
      }
    })();
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "d") {
        setDebugVisible((current) => !current);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const persistSettings = async (patch: Partial<AppSettings>): Promise<void> => {
    const next = {
      ...appSettings,
      ...patch
    };
    setAppSettings(next);
    await saveAppSettings(next);
  };

  const runAuth = async (mode: "login" | "register", formData: FormData): Promise<void> => {
    setBusy(true);
    setError(null);
    try {
      const email = String(formData.get("email") ?? "");
      const password = String(formData.get("password") ?? "");
      const displayName = String(formData.get("displayName") ?? email.split("@")[0] ?? "User");
      const nextSession =
        mode === "login"
          ? await providers.authProvider.login({ email, password })
          : await providers.authProvider.register({ email, password, displayName });
      setSession(nextSession);
      setWorkspaceView("menu");
      await refreshStatus(nextSession);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const quickLogin = async (): Promise<void> => {
    if (authModeView !== "login") {
      setAuthModeView("login");
      return;
    }
    const form = new FormData();
    form.set("email", "developer@adverta.local");
    form.set("password", "mock-password");
    await runAuth("login", form);
  };

  const startPayment = async (plan: Exclude<SubscriptionPlan, "none">): Promise<void> => {
    if (!session) return;
    setBusy(true);
    setError(null);
    try {
      const payment = await providers.paymentProvider.createPayment(session, plan);
      await window.adverta.openExternal(payment.checkoutUrl);
      if (runtimeEnv.subscriptionMode === "mock" && providers.paymentProvider.simulateSuccess) {
        setError("Checkout opened in mock mode. Use simulate successful payment to unlock immediately.");
      } else {
        setError("Checkout opened. Waiting for payment confirmation...");
        window.setTimeout(() => void refreshStatus(session), 4000);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Payment failed to start.");
    } finally {
      setBusy(false);
    }
  };

  const simulatePayment = async (plan: Exclude<SubscriptionPlan, "none">): Promise<void> => {
    if (!session || !providers.paymentProvider.simulateSuccess) return;
    setBusy(true);
    const updated = await providers.paymentProvider.simulateSuccess(session, plan);
    setStatus(updated);
    setScreen(updated.subscription?.accessGranted ? "workspace" : "paywall");
    setBusy(false);
  };

  const logout = async (): Promise<void> => {
    await providers.authProvider.logout();
    setSession(null);
    setStatus(null);
    setScreen("login");
    setWorkspaceView("menu");
  };

  const handleGlobalDrop = (files: string[]): void => {
    if (!files.length || screen !== "workspace") return;
    const targetTool = workspaceView === "menu" || workspaceView === "settings" ? pickToolFromDrop(files) : workspaceView;
    setWorkspaceView(targetTool);
    setPendingDrop({ tool: targetTool, files, token: Date.now() });
  };

  const chooseDefaultExportFolder = async (): Promise<void> => {
    const response = await window.adverta.selectFolder({
      title: "Choose default export folder",
      properties: ["openDirectory"]
    });
    if (!response.canceled && response.filePaths[0]) {
      await persistSettings({ defaultExportFolder: response.filePaths[0] });
    }
  };

  const clearCache = async (): Promise<void> => {
    await window.adverta.cacheClear();
    await persistSettings(defaultAppSettings);
    setError("Cache cleared.");
  };

  const exportLogs = async (): Promise<void> => {
    const response = await window.adverta.selectFolder({
      title: "Choose log export folder",
      properties: ["openDirectory"]
    });
    if (response.canceled || !response.filePaths[0]) return;
    const payload = {
      exportedAt: new Date().toISOString(),
      env: runtimeEnv,
      settings: appSettings,
      status,
      cache: await window.adverta.cacheGetAll()
    };
    const filePath = `${response.filePaths[0]}\\adverta-log-${Date.now()}.json`;
    await window.adverta.writeTextFile({
      filePath,
      content: JSON.stringify(payload, null, 2)
    });
    setError(`Logs exported to ${filePath}`);
  };

  const renderLoginScreen = () => (
    <section className="login-screen">
      <div className="login-brand">
        <div className="brand-emblem">
          <span>A</span>
        </div>
      </div>
      <Card className="login-card">
        <div className="login-card-inner">
          <h1 className="screen-title">{authModeView === "login" ? "Log in" : "Register"}</h1>
          <form
            className="login-form"
            onSubmit={(event) => {
              event.preventDefault();
              void runAuth(authModeView, new FormData(event.currentTarget));
            }}
          >
            {authModeView === "register" ? <Input name="displayName" placeholder="Display name" /> : null}
            <Input name="email" type="email" placeholder="Email" required />
            <Input name="password" type="password" placeholder="Password" required />
            <div className="login-actions">
              <Button variant="glass" type="submit" disabled={busy} fullWidth>
                {busy ? "Please wait..." : authModeView === "login" ? "Log in" : "Register"}
              </Button>
              <Button variant="glass" onClick={() => void quickLogin()} fullWidth>
                Continue with Google
              </Button>
            </div>
          </form>
          <div className="login-footer">
            <span>{authModeView === "login" ? "Don't have an account?" : "Already have an account?"}</span>
            <button
              type="button"
              className="link-button"
              onClick={() => setAuthModeView(authModeView === "login" ? "register" : "login")}
            >
              {authModeView === "login" ? "Register" : "Log in"}
            </button>
          </div>
          {error ? <div className="inline-note">{error}</div> : null}
        </div>
      </Card>
    </section>
  );

  const renderWorkspaceHome = () => (
    <section className="menu-screen">
      <header className="menu-topbar">
        <div className="menu-title">Adv3rta tools</div>
        <div className="menu-topbar-actions">
          <Button variant="contrast" className="settings-pill" onClick={() => setWorkspaceView("settings")}>
            ⚙
          </Button>
        </div>
      </header>
      <div className="drop-hint">Drop one image to open slicer, multiple images for watermarking, or mixed files for metadata.</div>
      <div className="menu-grid">
        {tools.map((tool) => (
          <button key={tool.id} className="tool-tile" onClick={() => setWorkspaceView(tool.id)}>
            <div className="tool-tile-icon">
              <TileIcon icon={tool.icon} />
            </div>
            <div className="tool-tile-label">{tool.title}</div>
          </button>
        ))}
      </div>
    </section>
  );

  const renderToolView = (id: ToolId) => {
    const incomingFiles = pendingDrop?.tool === id ? pendingDrop.files : undefined;
    const clearIncoming = () => {
      setPendingDrop((current) => (current?.tool === id ? null : current));
    };

    if (id === "slicer") {
      return <ImageSlicerTool incomingFiles={incomingFiles} consumeIncomingFiles={clearIncoming} appSettings={appSettings} />;
    }

    if (id === "metadata") {
      return <MetadataEditorTool incomingFiles={incomingFiles} consumeIncomingFiles={clearIncoming} appSettings={appSettings} />;
    }

    if (id === "watermark") {
      return <WatermarkTool incomingFiles={incomingFiles} consumeIncomingFiles={clearIncoming} appSettings={appSettings} />;
    }

    return <PaletteGrabberTool incomingFiles={incomingFiles} consumeIncomingFiles={clearIncoming} appSettings={appSettings} />;
  };

  const renderWorkspaceDetail = () => {
    if (workspaceView === "settings") {
      return (
        <SettingsScreen
          settings={appSettings}
          onChange={(patch) => void persistSettings(patch)}
          onChooseFolder={() => void chooseDefaultExportFolder()}
          onClearCache={() => void clearCache()}
          onExportLogs={() => void exportLogs()}
          onBack={() => setWorkspaceView("menu")}
          onLogout={() => void logout()}
          status={status}
        />
      );
    }

    const activeTool = tools.find((tool) => tool.id === workspaceView);
    if (!activeTool) return null;

    return (
      <section className="workspace-detail">
        <header className="tool-topbar">
          <BackArrow onClick={() => setWorkspaceView("menu")} />
          <div className="tool-topbar-copy">
            <h1 className="tool-topbar-title">{activeTool.title}</h1>
            <p className="tool-topbar-subtitle">Direct manipulation first, instant feedback always.</p>
          </div>
          <Button variant="contrast" className="settings-pill" onClick={() => setWorkspaceView("settings")}>
            ⚙
          </Button>
        </header>
        {renderToolView(activeTool.id)}
      </section>
    );
  };

  return (
    <AppContext.Provider
      value={{
        ...providers,
        session,
        status,
        screen,
        busy,
        error,
        setBusy,
        setError,
        setSession,
        setStatus,
        setScreen,
        refreshStatus
      }}
    >
      <main
        className={`design-root theme-${appSettings.themeMode}`}
        onDragOver={(event) => {
          event.preventDefault();
          if (screen === "workspace") setDropActive(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget === event.target) {
            setDropActive(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDropActive(false);
          const files = [...event.dataTransfer.files].map((file) => file.path).filter(Boolean);
          handleGlobalDrop(files);
        }}
      >
        {dropActive ? <div className="drop-overlay">Drop files to continue</div> : null}
        <DebugPanel visible={debugVisible} />
        {screen === "loading" ? (
          <div className="screen-frame centered-frame">
            <Card className="loading-card" title="Starting" subtitle="Checking session and subscription state." />
          </div>
        ) : null}
        {screen === "login" ? <div className="screen-frame">{renderLoginScreen()}</div> : null}
        {screen === "paywall" ? (
          <div className="screen-frame centered-frame">
            <Card className="paywall-card" title="Unlock Adverta Tools" subtitle="Your access is currently inactive.">
              <div className="paywall-actions">
                <Button variant="glass" onClick={() => void startPayment("monthly")} fullWidth disabled={busy}>
                  Monthly - $4.99
                </Button>
                <Button variant="glass" onClick={() => void startPayment("annual")} fullWidth disabled={busy}>
                  Annual - $49.99
                </Button>
                {runtimeEnv.subscriptionMode === "mock" ? (
                  <Button variant="contrast" onClick={() => void simulatePayment("monthly")} fullWidth>
                    Simulate successful payment
                  </Button>
                ) : null}
              </div>
              {status?.subscription?.isOfflineFallback ? <div className="inline-note">Offline fallback is active. Last known subscription state is being used.</div> : null}
              {error ? <div className="inline-note">{error}</div> : null}
            </Card>
          </div>
        ) : null}
        {screen === "workspace" ? <div className="screen-frame">{workspaceView === "menu" ? renderWorkspaceHome() : renderWorkspaceDetail()}</div> : null}
        {screen === "error" ? (
          <div className="screen-frame centered-frame">
            <Card className="paywall-card" title="Connection issue" subtitle="We could not trust the current subscription state.">
              <div className="inline-note">{error ?? "Unknown error."}</div>
              <Button onClick={() => void refreshStatus()} fullWidth>
                Retry status check
              </Button>
            </Card>
          </div>
        ) : null}
      </main>
    </AppContext.Provider>
  );
}
