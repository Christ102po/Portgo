import { useEffect, useRef, useState } from "react";
import { Users, UploadCloud, Download, Search, FileSpreadsheet } from "lucide-react";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Skeleton } from "../../components/ui/Skeleton";
import { StatCard } from "../../components/admin/StatCard";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../../components/ui/Toast";
import { downloadBarangayCsvTemplate } from "../../lib/barangayCsvTemplate";

const PAGE_SIZE = 20;

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

export default function BarangayMasterlistPage() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  function load() {
    setIsLoading(true);
    apiClient
      .get("/barangay-residents", { params: { page, pageSize: PAGE_SIZE, search: search || undefined } })
      .then((res) => {
        setRows(res.data.rows);
        setTotal(res.data.total);
      })
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    const timeout = setTimeout(load, 250);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  function handleImportClick() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      setIsImporting(true);
      try {
        const res = await apiClient.post("/barangay-residents/import", { csvText: reader.result });
        showToast({
          title: "Masterlist imported",
          description: `${res.data.imported} resident record(s) loaded — replaced the previous list.`,
          variant: "success",
        });
        setPage(1);
        load();
      } catch (err) {
        showToast({
          title: "Import failed",
          description: err.response?.data?.message || "Please check the CSV format and try again.",
          variant: "error",
        });
      } finally {
        setIsImporting(false);
      }
    };
    reader.readAsText(file);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-graphite">Barangay Resident Masterlist</h1>
          <p className="mt-1 text-sm text-slate-500">
            Powers the kiosk&apos;s Full Name autocomplete for Local Resident registrations. Uploading a new file
            replaces the current list.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={downloadBarangayCsvTemplate}>
            <Download className="h-4 w-4" />
            Download Sample CSV Template
          </Button>
          <Button onClick={handleImportClick} disabled={isImporting}>
            <UploadCloud className="h-4 w-4" />
            {isImporting ? "Importing..." : "Import Barangay Masterlist (CSV)"}
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileSelected} />
        </div>
      </header>

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Residents on File" value={total} icon={Users} accent />
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-sm">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-700">
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Expected CSV columns
          </p>
          <p>Full Name, Gender, Age, Barangay Address, Municipality, Status, Phone Number — column order and casing don&apos;t matter.</p>
        </div>
      </div>

      <div className="mb-3 relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="h-10 pl-9"
          placeholder="Search by name"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
              <th className="px-4 py-3">Full Name</th>
              <th className="px-4 py-3">Gender</th>
              <th className="px-4 py-3">Age</th>
              <th className="px-4 py-3">Barangay Address</th>
              <th className="px-4 py-3">Municipality</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Phone Number</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-sm text-slate-400">
                  No resident records yet — import a masterlist CSV to get started.
                </td>
              </tr>
            )}
            {!isLoading &&
              rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-800">{r.fullName}</td>
                  <td className="px-4 py-3">
                    {r.gender ? <Badge variant="outline">{r.gender}</Badge> : <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.age ?? "—"}</td>
                  <td className="px-4 py-3 text-slate-700">{r.barangay}</td>
                  <td className="px-4 py-3 text-slate-700">{r.municipality || "—"}</td>
                  <td className="px-4 py-3">
                    <Badge variant={r.status === "Active" ? "active" : "neutral"}>{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{r.phoneNumber || "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {total > PAGE_SIZE && (
        <div className="mt-3 flex items-center justify-between px-1 text-xs text-slate-500">
          <span>
            Page {page} of {totalPages} &middot; {total} total
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
