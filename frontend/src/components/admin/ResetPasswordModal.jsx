import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";

export function ResetPasswordModal({ open, onOpenChange, admin, onConfirm }) {
  const [password, setPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onConfirm(password);
      setPassword("");
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  if (!admin) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-graphite" />
          Reset Password
        </DialogTitle>
        <DialogDescription>
          Set a new password for <span className="font-medium text-ink">{admin.fullName}</span> ({admin.email}).
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSaving || password.length < 8}>
            {isSaving ? "Saving..." : "Reset Password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
