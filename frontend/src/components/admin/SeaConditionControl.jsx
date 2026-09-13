import { useEffect, useState } from "react";
import { CloudSun, CloudLightning, Ban, ShieldAlert } from "lucide-react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { cn } from "../../lib/cn";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";

const STATES = [
  {
    value: "NORMAL",
    label: "Normal",
    icon: CloudSun,
    activeClass: "border-transparent bg-emerald-600 text-white",
    description: "Clear sailing — all sailings proceed as scheduled.",
  },
  {
    value: "GALE_WARNING",
    label: "Gale Warning",
    icon: CloudLightning,
    activeClass: "border-transparent bg-amber-500 text-white",
    description: "Advisory banner shown to passengers; sailings still allowed.",
  },
  {
    value: "SUSPENDED",
    label: "Trips Suspended",
    icon: Ban,
    activeClass: "border-transparent bg-red-600 text-white",
    description: "New registrations blocked kiosk-wide; all sailings halted.",
  },
];

function deriveState(advisory) {
  if (!advisory) return "NORMAL";
  if (advisory.suspended) return "SUSPENDED";
  if (advisory.active) return "GALE_WARNING";
  return "NORMAL";
}

export function SeaConditionControl() {
  const [advisory, setAdvisory] = useState(null);
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  function load() {
    apiClient.get("/advisory").then((res) => {
      setAdvisory(res.data.advisory);
      setReason(res.data.advisory.suspendedReason || res.data.advisory.message || "");
    });
  }

  useEffect(() => {
    load();
  }, []);

  const current = deriveState(advisory);

  async function applyState(nextState) {
    setIsSaving(true);
    try {
      const payload =
        nextState === "SUSPENDED"
          ? {
              suspended: true,
              active: true,
              suspendedReason: reason || "PCG Gale Warning",
              message: reason || "PCG Gale Warning",
            }
          : nextState === "GALE_WARNING"
          ? { suspended: false, active: true, message: reason || "Gale Warning in effect — monitor for updates" }
          : { suspended: false, active: false, message: null, suspendedReason: null };
      const res = await apiClient.put("/advisory", payload);
      setAdvisory(res.data.advisory);
      showToast({
        title: `Sea Condition set to ${STATES.find((s) => s.value === nextState).label}`,
        variant: nextState === "NORMAL" ? "success" : "error",
      });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2.5">
        <ShieldAlert className="h-5 w-5 shrink-0 text-graphite" />
        <div>
          <p className="text-sm font-bold text-graphite">Sea Condition Status</p>
          <p className="text-xs text-slate-400">
            PCG / Port Authority control &mdash; updates the kiosk alert banner for every passenger in real time.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {STATES.map((s) => {
          const Icon = s.icon;
          const isActive = current === s.value;
          return (
            <button
              key={s.value}
              type="button"
              disabled={isSaving}
              onClick={() => applyState(s.value)}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-xl border-2 px-4 py-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-60",
                isActive ? s.activeClass : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
              )}
            >
              <span className="flex items-center gap-1.5 text-sm font-bold">
                <Icon className="h-4 w-4" />
                {s.label}
              </span>
              <span className={cn("text-[11px]", isActive ? "text-white/85" : "text-slate-400")}>
                {s.description}
              </span>
            </button>
          );
        })}
      </div>

      {current !== "NORMAL" && (
        <div className="mt-3.5">
          <Label htmlFor="seaConditionReason">Advisory Message / Reason (shown to passengers)</Label>
          <div className="flex gap-2">
            <Input
              id="seaConditionReason"
              placeholder="e.g. PCG Gale Warning #3 — swells up to 3m"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
            <Button variant="outline" size="sm" onClick={() => applyState(current)} disabled={isSaving}>
              Update Message
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
