import { useEffect, useState } from "react";
import { Plus, KeyRound, Ban, RotateCcw, Users } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Select } from "../../components/ui/Select";
import { Skeleton } from "../../components/ui/Skeleton";
import { StaffFormDialog } from "../../components/admin/StaffFormDialog";
import { ResetPasswordModal } from "../../components/admin/ResetPasswordModal";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../../components/ui/Toast";
import { useAuth } from "../../hooks/useAuth";

const ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "Super Admin" },
  { value: "ADMIN", label: "Admin" },
  { value: "TICKETING_OFFICER", label: "Ticketing Officer" },
  { value: "GATE_SCANNER", label: "Gate Scanner Staff" },
];

const ROLE_BADGE = {
  SUPER_ADMIN: "graphite",
  ADMIN: "outline",
  TICKETING_OFFICER: "active",
  GATE_SCANNER: "warning",
};

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 last:border-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[120px]" />
        </td>
      ))}
    </tr>
  );
}

export default function StaffPage() {
  const { admin: currentAdmin } = useAuth();
  const [admins, setAdmins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const { showToast } = useToast();

  async function load() {
    setIsLoading(true);
    const res = await apiClient.get("/admins");
    setAdmins(res.data.admins);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCreate(data) {
    await apiClient.post("/admins", data);
    showToast({ title: "Staff account created", variant: "success" });
    await load();
  }

  async function handleRoleChange(admin, role) {
    try {
      await apiClient.put(`/admins/${admin.id}`, { role });
      showToast({ title: `${admin.fullName}'s role updated`, variant: "success" });
      await load();
    } catch (err) {
      showToast({ title: "Failed to update role", description: err.response?.data?.message, variant: "error" });
    }
  }

  async function handleToggleActive(admin) {
    try {
      await apiClient.put(`/admins/${admin.id}`, { active: !admin.active });
      showToast({ title: `${admin.fullName} ${admin.active ? "deactivated" : "activated"}`, variant: "success" });
      await load();
    } catch (err) {
      showToast({ title: "Action failed", description: err.response?.data?.message, variant: "error" });
    }
  }

  async function handleResetPassword(password) {
    await apiClient.patch(`/admins/${resetTarget.id}/password`, { password });
    showToast({ title: "Password reset", variant: "success" });
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-graphite" />
          <div>
            <h1 className="text-2xl font-bold text-graphite">Manage Staff</h1>
            <p className="mt-1 text-sm text-slate-500">Port personnel accounts and access levels.</p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Add Staff
        </Button>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-surface text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
            {!isLoading &&
              admins.map((a) => {
                const isSelf = a.id === currentAdmin?.id;
                return (
                  <tr key={a.id} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-surface">
                    <td className="px-4 py-3 font-medium text-ink">
                      {a.fullName}
                      {isSelf && <span className="ml-1.5 text-xs text-slate-400">(you)</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{a.email}</td>
                    <td className="px-4 py-3">
                      {isSelf ? (
                        <Badge variant={ROLE_BADGE[a.role]}>{a.role.replace(/_/g, " ")}</Badge>
                      ) : (
                        <Select
                          value={a.role}
                          onValueChange={(role) => handleRoleChange(a, role)}
                          options={ROLE_OPTIONS}
                          className="h-9 w-48"
                        />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={a.active ? "active" : "neutral"}>{a.active ? "Active" : "Deactivated"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => setResetTarget(a)}>
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        {!isSelf && (
                          <Button variant="outline" size="sm" onClick={() => handleToggleActive(a)}>
                            {a.active ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      <StaffFormDialog open={dialogOpen} onOpenChange={setDialogOpen} onSubmit={handleCreate} />
      <ResetPasswordModal
        open={!!resetTarget}
        onOpenChange={(open) => !open && setResetTarget(null)}
        admin={resetTarget}
        onConfirm={handleResetPassword}
      />
    </div>
  );
}
