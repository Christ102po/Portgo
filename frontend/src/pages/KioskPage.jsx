import { WizardProvider } from "../context/WizardContext";
import { WizardShell } from "../components/wizard/WizardShell";
import { OfflineSyncManager } from "../components/wizard/OfflineSyncManager";

export default function KioskPage() {
  return (
    <WizardProvider>
      <div className="min-h-[100dvh] bg-gradient-to-b from-emerald-50 via-[#f4fbf7] to-emerald-100/60">
        <OfflineSyncManager />
        <WizardShell />
      </div>
    </WizardProvider>
  );
}
