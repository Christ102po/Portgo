import { WizardProvider } from "../context/WizardContext";
import { WizardShell } from "../components/wizard/WizardShell";
import { OfflineSyncManager } from "../components/wizard/OfflineSyncManager";

export default function KioskPage() {
  return (
    <WizardProvider>
      <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100">
        <OfflineSyncManager />
        <WizardShell />
      </div>
    </WizardProvider>
  );
}
