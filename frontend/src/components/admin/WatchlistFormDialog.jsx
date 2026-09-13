import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";

export function WatchlistFormDialog({ open, onOpenChange, entry, onSubmit }) {
  const [fullName, setFullName] = useState("");
  const [passportNumber, setPassportNumber] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [reason, setReason] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(entry?.fullName || "");
      setPassportNumber(entry?.passportNumber || "");
      setContactNumber(entry?.contactNumber || "");
      setReason(entry?.reason || "");
    }
  }, [open, entry]);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({
        fullName,
        passportNumber: passportNumber || undefined,
        contactNumber: contactNumber || undefined,
        reason,
      });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{entry ? "Edit Watchlist Entry" : "Add Watchlist Entry"}</DialogTitle>
        <DialogDescription>
          Matching passengers will be flagged with a &ldquo;Security Clearance Required&rdquo; badge at the
          gate scanner. This never blocks boarding — it&apos;s an advisory for the gate officer.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="wlFullName">Full Name</Label>
            <Input id="wlFullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="wlPassport">Passport Number (Optional)</Label>
              <Input id="wlPassport" value={passportNumber} onChange={(e) => setPassportNumber(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="wlContact">Contact Number (Optional)</Label>
              <Input id="wlContact" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
            </div>
          </div>
          <div>
            <Label htmlFor="wlReason">Reason</Label>
            <Input
              id="wlReason"
              placeholder="e.g. Immigration hold, PNP advisory reference #..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Entry"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
