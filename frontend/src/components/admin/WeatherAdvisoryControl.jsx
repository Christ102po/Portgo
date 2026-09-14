import { useEffect, useState } from "react";
import { CloudLightning, AlertTriangle, MessageSquare } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "../ui/Dialog";
import { Switch } from "../ui/Switch";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";

export function WeatherAdvisoryControl() {
  const [advisory, setAdvisory] = useState(null);
  const [open, setOpen] = useState(false);
  const [draftActive, setDraftActive] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [broadcastSms, setBroadcastSms] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmingBulkCancel, setConfirmingBulkCancel] = useState(false);
  const [isBulkCancelling, setIsBulkCancelling] = useState(false);
  const { showToast } = useToast();

  function load() {
    apiClient.get("/advisory").then((res) => setAdvisory(res.data.advisory));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (open && advisory) {
      setDraftActive(advisory.active);
      setDraftMessage(advisory.message || "");
      setConfirmingBulkCancel(false);
    }
  }, [open, advisory]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const wasActive = advisory?.active;
      const res = await apiClient.put("/advisory", { active: draftActive, message: draftMessage || null });
      setAdvisory(res.data.advisory);
      showToast({
        title: draftActive ? "Weather advisory activated" : "Weather advisory cleared",
        variant: draftActive ? "info" : "success",
      });

      if (draftActive && !wasActive && broadcastSms) {
        try {
          const smsRes = await apiClient.post("/advisory/broadcast-sms", { message: draftMessage || undefined });
          showToast({
            title: "SMS alert broadcast sent",
            description: `Sent to ${smsRes.data.sent} of ${smsRes.data.total} passenger(s) with active bookings.`,
            variant: "info",
          });
        } catch {
          showToast({ title: "SMS broadcast failed", description: "Advisory was still saved.", variant: "error" });
        }
      }

      if (!draftActive) setOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleBulkCancel() {
    setIsBulkCancelling(true);
    try {
      const res = await apiClient.post("/advisory/cancel-all-schedules", {
        reason: draftMessage || "Port Weather Advisory / Gale Warning",
      });
      showToast({
        title: "All active sailings cancelled",
        description: `${res.data.schedulesCancelled} schedule(s), ${res.data.tripsCancelled} booking(s) affected.`,
        variant: "success",
      });
      setConfirmingBulkCancel(false);
      setOpen(false);
    } finally {
      setIsBulkCancelling(false);
    }
  }

  const isActive = advisory?.active;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
            isActive
              ? "bg-red-100 text-red-700 shadow-[0_0_0_3px_rgba(239,68,68,0.15)] animate-pulse"
              : "border border-slate-200 text-slate-500 hover:bg-surface"
          )}
        >
          <CloudLightning className="h-3.5 w-3.5" />
          {isActive ? "Gale Warning Active" : "Weather Advisory"}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <CloudLightning className="h-5 w-5 text-graphite" />
          Port Weather Advisory
        </DialogTitle>
        <DialogDescription>
          When active, a warning banner is shown to every passenger on the kiosk.
        </DialogDescription>

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-surface px-4 py-3">
            <span className="text-sm font-medium text-ink">Gale Warning / Port Suspension Alert</span>
            <Switch checked={draftActive} onCheckedChange={setDraftActive} />
          </div>

          <div>
            <Label htmlFor="advisoryMessage">Advisory Message</Label>
            <Input
              id="advisoryMessage"
              placeholder="e.g. Trips may be delayed or suspended per PCG advisory"
              value={draftMessage}
              onChange={(e) => setDraftMessage(e.target.value)}
            />
          </div>

          {draftActive && (
            <label className="flex items-start gap-2.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
              <input
                type="checkbox"
                checked={broadcastSms}
                onChange={(e) => setBroadcastSms(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-blue-600"
              />
              <span className="flex items-start gap-1.5">
                <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                Also send an SMS alert to every passenger with an active booking
              </span>
            </label>
          )}

          <Button className="w-full" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Advisory"}
          </Button>

          <div className="border-t border-slate-100 pt-4">
            {!confirmingBulkCancel ? (
              <Button
                variant="outline"
                className="w-full text-red-600 hover:bg-red-50"
                onClick={() => setConfirmingBulkCancel(true)}
              >
                <AlertTriangle className="h-4 w-4" />
                Cancel All Active Sailings
              </Button>
            ) : (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm font-medium text-red-700">
                  This will cancel every currently active schedule and flag all their active bookings as
                  cancelled. This cannot be undone automatically.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setConfirmingBulkCancel(false)}
                    disabled={isBulkCancelling}
                  >
                    Back
                  </Button>
                  <Button
                    variant="danger"
                    className="flex-1"
                    onClick={handleBulkCancel}
                    disabled={isBulkCancelling}
                  >
                    {isBulkCancelling ? "Cancelling..." : "Confirm Cancel All"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
