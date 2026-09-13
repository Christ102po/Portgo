import { useEffect, useState } from "react";
import { Ban, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from "../ui/Dialog";
import { Switch } from "../ui/Switch";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";
import { cn } from "../../lib/cn";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";

export function OperationStatusToggle() {
  const [advisory, setAdvisory] = useState(null);
  const [open, setOpen] = useState(false);
  const [draftSuspended, setDraftSuspended] = useState(false);
  const [draftReason, setDraftReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  function load() {
    apiClient.get("/advisory").then((res) => setAdvisory(res.data.advisory));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (open && advisory) {
      setDraftSuspended(advisory.suspended);
      setDraftReason(advisory.suspendedReason || "");
    }
  }, [open, advisory]);

  async function handleSave() {
    setIsSaving(true);
    try {
      const res = await apiClient.put("/advisory", {
        suspended: draftSuspended,
        suspendedReason: draftReason || null,
      });
      setAdvisory(res.data.advisory);
      showToast({
        title: draftSuspended ? "Emergency No-Sail Suspension activated" : "Operations resumed",
        description: draftSuspended
          ? "New passenger registrations are now disabled kiosk-wide."
          : "New registrations are re-enabled.",
        variant: draftSuspended ? "error" : "success",
      });
      setOpen(false);
    } finally {
      setIsSaving(false);
    }
  }

  const isSuspended = advisory?.suspended;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
            isSuspended
              ? "bg-red-600 text-white shadow-[0_0_0_3px_rgba(239,68,68,0.25)] animate-pulse"
              : "border border-slate-200 text-slate-500 hover:bg-surface"
          )}
        >
          <Ban className="h-3.5 w-3.5" />
          {isSuspended ? "No-Sail Suspension Active" : "Normal Operations"}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-graphite" />
          Emergency Operation Status
        </DialogTitle>
        <DialogDescription>
          Suspending operations immediately blocks all new kiosk and ticketing-desk registrations, and
          shows an official port notice to every passenger.
        </DialogDescription>

        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-surface px-4 py-3">
            <span className="text-sm font-medium text-ink">
              {draftSuspended ? "Emergency No-Sail Suspension" : "Normal Operations"}
            </span>
            <Switch checked={draftSuspended} onCheckedChange={setDraftSuspended} />
          </div>

          <div>
            <Label htmlFor="suspendReason">Reason (shown to passengers)</Label>
            <Input
              id="suspendReason"
              placeholder="e.g. Coast Guard Gale Warning — all sailings suspended"
              value={draftReason}
              onChange={(e) => setDraftReason(e.target.value)}
            />
          </div>

          <Button
            className="w-full"
            variant={draftSuspended ? "danger" : "primary"}
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : draftSuspended ? "Activate Suspension" : "Save Status"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
