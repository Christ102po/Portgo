import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";
import { SignatureCanvas } from "./SignatureCanvas";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";

export function PcgSignOffDialog({ open, onOpenChange, scheduleId, onSigned }) {
  const [officerName, setOfficerName] = useState("");
  const [badgeNumber, setBadgeNumber] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const { showToast } = useToast();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!signatureDataUrl) {
      showToast({ title: "Signature required", description: "Please sign in the box before certifying.", variant: "error" });
      return;
    }
    setIsSaving(true);
    try {
      const res = await apiClient.post(`/schedules/${scheduleId}/manifest/signoff`, {
        officerName,
        badgeNumber,
        signatureDataUrl,
      });
      showToast({ title: "Manifest certified", description: "PCG inspection sign-off recorded.", variant: "success" });
      onSigned(res.data.signOff);
      onOpenChange(false);
      setOfficerName("");
      setBadgeNumber("");
      setSignatureDataUrl(null);
    } catch (err) {
      showToast({ title: "Sign-off failed", description: err.response?.data?.message, variant: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>PCG Inspection Sign-Off</DialogTitle>
        <DialogDescription>
          Capture the on-duty Coast Guard officer&apos;s details and signature to certify this manifest
          for official submission.
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="officerName">Officer Name</Label>
            <Input id="officerName" value={officerName} onChange={(e) => setOfficerName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="badgeNumber">Badge Number</Label>
            <Input id="badgeNumber" value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} required />
          </div>
          <div>
            <Label>Digital Signature</Label>
            <SignatureCanvas onChange={setSignatureDataUrl} />
          </div>
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? "Certifying..." : "Certify & Lock Manifest"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
