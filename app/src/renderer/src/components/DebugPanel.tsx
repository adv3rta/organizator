import { useMemo } from "react";
import { useAppContext } from "../contexts/AppContext";
import { getEnv } from "../services/env";
import { debugStateFactory, MockSubscriptionProvider } from "../providers/mock-providers";
import { Button } from "./Button";
import { Card } from "./Card";

interface DebugPanelProps {
  visible: boolean;
}

export const DebugPanel = ({ visible }: DebugPanelProps) => {
  const { subscriptionProvider, refreshStatus } = useAppContext();

  const provider = useMemo(
    () => (subscriptionProvider instanceof MockSubscriptionProvider ? subscriptionProvider : null),
    [subscriptionProvider]
  );

  if (!visible || getEnv().subscriptionMode !== "mock" || !provider) {
    return null;
  }

  const setState = async (key: keyof typeof debugStateFactory): Promise<void> => {
    await provider.override(debugStateFactory[key]());
    await refreshStatus();
  };

  return (
    <Card className="debug-panel" title="Developer Panel" subtitle="Mock subscription state controls.">
      <div className="debug-panel-grid">
        <Button onClick={() => setState("activeTrial")}>Start Trial</Button>
        <Button onClick={() => setState("expiredTrial")}>Expire Trial</Button>
        <Button onClick={() => setState("activeMonthly")}>Activate Monthly</Button>
        <Button onClick={() => setState("activeAnnual")}>Activate Annual</Button>
        <Button onClick={() => setState("cancelled")}>Cancel Subscription</Button>
        <Button onClick={() => setState("newUser")}>Reset State</Button>
      </div>
    </Card>
  );
};
