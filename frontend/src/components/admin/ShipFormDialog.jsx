import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Button } from "../ui/Button";

export function ShipFormDialog({ open, onOpenChange, ship, onSubmit }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(ship?.name || "");
      setCode(ship?.code || "");
      setCapacity(String(ship?.capacity ?? 100));
    }
  }, [open, ship]);

  async function handleSubmit(e) {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSubmit({ name, code, capacity: Number(capacity) });
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>{ship ? "Edit Ship" : "Add Ship"}</DialogTitle>
        <DialogDescription>
          {ship ? "Update this vessel's details." : "Register a new vessel."}
        </DialogDescription>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <Label htmlFor="shipName">Ship Name</Label>
            <Input id="shipName" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="shipCode">Code</Label>
            <Input id="shipCode" value={code} onChange={(e) => setCode(e.target.value)} required />
          </div>
          <div>
            <Label htmlFor="shipCapacity">Passenger Capacity</Label>
            <Input
              id="shipCapacity"
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Ship"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
