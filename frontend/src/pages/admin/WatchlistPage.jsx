import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, ShieldAlert, Ban, RotateCcw } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { WatchlistFormDialog } from "../../components/admin/WatchlistFormDialog";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../../components/ui/Toast";

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 last:border-0">
      {Array.from({ length: 5 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full max-w-[140px]" />
        </td>
      ))}
    </tr>
  );
}

export default function WatchlistPage() {
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const { showToast } = useToast();

  async function load() {
    setIsLoading(true);
    const res = await apiClient.get("/watchlist");
    setEntries(res.data.entries);
    setIsLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditingEntry(null);
    setDialogOpen(true);
  }

  function openEdit(entry) {
    setEditingEntry(entry);
    setDialogOpen(true);
  }

  async function handleSubmit(data) {
    if (editingEntry) {
      await apiClient.put(`/watchlist/${editingEntry.id}`, data);
      showToast({ title: "Watchlist entry updated", variant: "success" });
    } else {
      await apiClient.post("/watchlist", data);
      showToast({ title: "Watchlist entry added", variant: "success" });
    }
    await load();
  }

  async function handleToggleActive(entry) {
    try {
      await apiClient.put(`/watchlist/${entry.id}`, { active: !entry.active });
      showToast({ title: `${entry.fullName} ${entry.active ? "deactivated" : "reactivated"}`, variant: "success" });
      await load();
    } catch (err) {
      showToast({ title: "Action failed", description: err.response?.data?.message, variant: "error" });
    }
  }

  async function handleDelete(entry) {
    try {
      await apiClient.delete(`/watchlist/${entry.id}`);
      showToast({ title: `${entry.fullName} removed from watchlist`, variant: "info" });
      await load();
    } catch (err) {
      showToast({ title: "Delete failed", description: err.response?.data?.message, variant: "error" });
    }
  }

  return (
    <div>
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-6 w-6 text-graphite" />
          <div>
            <h1 className="text-2xl font-bold text-graphite">Security Watchlist</h1>
            <p className="mt-1 text-sm text-slate-500">
              Passengers here are flagged with a discrete alert at the Gate Scanner. Boarding is never
              blocked automatically — it&apos;s an advisory for manual clearance.
            </p>
          </div>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Add Entry
        </Button>
      </header>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-surface text-xs uppercase tracking-wide text-slate-400">
              <th className="px-4 py-3 font-medium">Full Name</th>
              <th className="px-4 py-3 font-medium">Passport No.</th>
              <th className="px-4 py-3 font-medium">Contact No.</th>
              <th className="px-4 py-3 font-medium">Reason</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 3 }).map((_, i) => <SkeletonRow key={i} />)}
            {!isLoading && entries.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  No watchlist entries. Boarding proceeds normally for everyone.
                </td>
              </tr>
            )}
            {!isLoading &&
              entries.map((entry) => (
                <tr key={entry.id} className="border-b border-slate-50 transition-colors last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 font-medium text-ink">{entry.fullName}</td>
                  <td className="px-4 py-3 text-slate-500">{entry.passportNumber || "—"}</td>
                  <td className="px-4 py-3 text-slate-500">{entry.contactNumber || "—"}</td>
                  <td className="px-4 py-3 max-w-[240px] truncate text-slate-500" title={entry.reason}>
                    {entry.reason}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={entry.active ? "warning" : "neutral"}>
                      {entry.active ? "Active" : "Deactivated"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(entry)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleToggleActive(entry)}>
                        {entry.active ? <Ban className="h-3.5 w-3.5" /> : <RotateCcw className="h-3.5 w-3.5" />}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDelete(entry)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <WatchlistFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entry={editingEntry}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
