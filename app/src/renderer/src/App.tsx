import { useEffect, useMemo, useState } from "react";
import type { AuthSession, StatusResponse, SubscriptionPlan } from "@adverta/shared";
import { AppContext, type ScreenState } from "./contexts/AppContext";
import { Button } from "./components/Button";
import { Card } from "./components/Card";
import { DebugPanel } from "./components/DebugPanel";
import { Input } from "./components/Input";
import { StatusPill } from "./components/StatusPill";
import { createProvidersFromEnv } from "./services/provider-factory";
import { getEnv, loadEnv, type RuntimeEnv } from "./services/env";
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
type WorkspaceView = "menu" | ToolId;

const renderTool = (id: ToolId) => {
  switch (id) {
    case "slicer":
      return <ImageSlicerTool />;
    case "metadata":
      return <MetadataEditorTool />;
    case "watermark":
      return <WatermarkTool />;
    case "palette":
      return <PaletteGrabberTool />;
  }
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
  const [accountVisible, setAccountVisible] = useState(false);

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
        const nextEnv = await loadEnv();
        setRuntimeEnv(nextEnv);
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
    if (!session) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payment = await providers.paymentProvider.createPayment(session, plan);
      await window.adverta.openExternal(payment.checkoutUrl);
      if (runtimeEnv.subscriptionMode === "mock" && providers.paymentProvider.simulateSuccess) {
        setError("Checkout opened in mock mode. Use Simulate successful payment to unlock immediately.");
      } else {
        setError("Checkout opened. Waiting for payment confirmation...");
        window.setTimeout(() => {
          void refreshStatus(session);
        }, 4000);
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
    setAccountVisible(false);
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
            <span>{authModeView === "login" ? "Don’t have an account?" : "Already have an account?"}</span>
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
          <Button variant="contrast" className="account-pill" onClick={() => setAccountVisible((current) => !current)}>
            Account
          </Button>
          <Button variant="contrast" className="settings-pill" onClick={() => setDebugVisible((current) => !current)}>
            ⚙
          </Button>
        </div>
      </header>
      {accountVisible ? (
        <Card className="account-card" title={session?.user.displayName ?? session?.user.email ?? "Account"} subtitle={session?.user.email ?? ""}>
          <div className="account-card-content">
            <StatusPill
              label={
                status?.subscription?.accessGranted
                  ? status.subscription.plan === "none"
                    ? "Trial active"
                    : `${status.subscription.plan} active`
                  : "Access blocked"
              }
              tone={status?.subscription?.accessGranted ? "active" : "warning"}
            />
            <Button onClick={() => void refreshStatus()}>Refresh status</Button>
            <Button onClick={logout}>Log out</Button>
          </div>
        </Card>
      ) : null}
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

  const renderWorkspaceDetail = () => {
    const activeTool = tools.find((tool) => tool.id === workspaceView);
    if (!activeTool || workspaceView === "menu") {
      return null;
    }

    return (
      <section className="workspace-detail">
        <header className="menu-topbar">
          <div className="menu-title">Adv3rta tools</div>
          <div className="menu-topbar-actions">
            <Button onClick={() => setWorkspaceView("menu")}>Back</Button>
            <Button variant="contrast" className="account-pill" onClick={() => setAccountVisible((current) => !current)}>
              Account
            </Button>
            <Button variant="contrast" className="settings-pill" onClick={() => setDebugVisible((current) => !current)}>
              ⚙
            </Button>
          </div>
        </header>
        {accountVisible ? (
          <Card className="account-card" title={activeTool.title} subtitle={runtimeEnv.authMode === "mock" ? "Mock mode" : "Production mode"}>
            <div className="account-card-content">
              <StatusPill label={status?.subscription?.isOfflineFallback ? "Offline cache" : "Online state"} tone={status?.subscription?.isOfflineFallback ? "warning" : "active"} />
              <Button onClick={() => setWorkspaceView("menu")}>All tools</Button>
            </div>
          </Card>
        ) : null}
        {renderTool(workspaceView)}
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
      <main className="design-root">
        <DebugPanel visible={debugVisible} />
        {screen === "loading" ? <div className="screen-frame centered-frame"><Card className="loading-card" title="Starting" subtitle="Checking session and subscription state." /></div> : null}
        {screen === "login" ? <div className="screen-frame">{renderLoginScreen()}</div> : null}
        {screen === "paywall" ? (
          <div className="screen-frame centered-frame">
            <Card className="paywall-card" title="Unlock Adverta Tools" subtitle="Your access is currently inactive.">
              <div className="paywall-actions">
                <Button variant="glass" onClick={() => startPayment("monthly")} fullWidth disabled={busy}>
                  Monthly - $4.99
                </Button>
                <Button variant="glass" onClick={() => startPayment("annual")} fullWidth disabled={busy}>
                  Annual - $49.99
                </Button>
                {runtimeEnv.subscriptionMode === "mock" ? (
                  <Button variant="contrast" onClick={() => simulatePayment("monthly")} fullWidth>
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
