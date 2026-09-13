import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";

const ROLE_OPTIONS = [
  { value: "ADMIN", label: "Admin" },
  { value: "TICKETING_OFFICER", label: "Ticketing Officer" },
  { value: "GATE_SCANNER", label: "Gate Scanner Staff" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

export function StaffFormDialog({ open, onOpenChange, onSubmit }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("ADMIN");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName("");
      setEmail("");
      setPassword("");
      setRole("ADMIN");
    }
  }, [open]);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({ fullName, email, password, role });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>Add Staff Account</DialogTitle>
        <DialogDescription>Create a new login for port personnel.</DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="staffName">Full Name</Label>
            <Input id="staffName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="staffEmail">Email</Label>
            <Input
              id="staffEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="staffPassword">Temporary Password</Label>
            <Input
              id="staffPassword"
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div>
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole} options={ROLE_OPTIONS} />
          </div>
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? "Creating..." : "Create Account"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
