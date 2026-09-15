import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ArrowRightCircle,
  ArrowLeftCircle,
  MapPin,
  Plane,
  CheckCircle2,
  XCircle,
  UserX,
  Search,
  Sparkles,
  Printer,
  UploadCloud,
  Download,
} from "lucide-react";
import { StatCard } from "../../components/admin/StatCard";
import { RecentActivityPanel } from "../../components/admin/RecentActivityPanel";
import { PortStatusBanner } from "../../components/PortStatusBanner";
import { Badge } from "../../components/ui/Badge";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../components/ui/Dialog";
import { LocalTouristChart } from "../../components/admin/charts/LocalTouristChart";
import { PeakHoursChart } from "../../components/admin/charts/PeakHoursChart";
import { apiClient, downloadWithAuth } from "../../lib/apiClient";
import { verificationBadge } from "../../lib/verification";
import { downloadBarangayCsvTemplate } from "../../lib/barangayCsvTemplate";
import { useAuth } from "../../hooks/useAuth";
import { useToast } from "../../components/ui/Toast";

function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-9 w-9 rounded-lg" />
      </div>
      <Skeleton className="mt-4 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-24" />
    </div>
  );
}

function QuickSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    setIsSearching(true);
    const timeout = setTimeout(() => {
      apiClient
        .get("/records", { params: { search: query.trim(), pageSize: 6 } })
        .then((res) => {
          setResults(res.data.rows);
          setIsOpen(true);
        })
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function goToRecords(trip) {
    setIsOpen(false);
    navigate("/admin/records", { state: { presetSearch: query.trim() } });
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Quick search by name, passport, or phone number"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
        />
      </div>

      {isOpen && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          {isSearching && <p className="px-4 py-3 text-sm text-slate-400">Searching...</p>}
          {!isSearching && results.length === 0 && (
            <p className="px-4 py-3 text-sm text-slate-400">No matches found.</p>
          )}
          {!isSearching &&
            results.map((r) => {
              const verification = verificationBadge(r.passenger);
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => goToRecords(r)}
                  className="flex w-full items-center justify-between gap-3 border-b border-slate-50 px-4 py-2.5 text-left last:border-0 hover:bg-surface"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink">{r.passenger.fullName}</p>
                    <p className="truncate text-xs text-slate-400">
                      {r.passenger.contactNumber || r.passenger.passportNumber || "—"} &middot; {r.ship.name}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant="outline">{r.passenger.passengerType}</Badge>
                    <Badge variant={verification.variant}>{verification.label}</Badge>
                  </div>
                </button>
              );
            })}
          {!isSearching && results.length > 0 && (
            <button
              type="button"
              onClick={() => goToRecords()}
              className="w-full bg-surface px-4 py-2 text-center text-xs font-semibold text-graphite hover:bg-slate-100"
            >
              View all results in Passenger Records
            </button>
          )}
        </div>
      )}
    </div>
  );
}


function formatDetailDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTransaction(value) {
  if (value === "SIGN_IN") return "Departing · Surigao → Dapa";
  if (value === "SIGN_OUT") return "Arriving · Dapa → Surigao";
  return "—";
}

function formatStatus(value) {
  if (!value) return "—";
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function DashboardDetailDialog({ detail, onOpenChange }) {
  const rows = detail.rows || [];

  return (
    <Dialog open={detail.open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl p-0 sm:p-0">
        <div className="border-b border-slate-200 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle className="text-xl">{detail.title || "Dashboard details"}</DialogTitle>
          <DialogDescription>
            {detail.description || "The records included in this dashboard total."}
          </DialogDescription>
          {!detail.isLoading && !detail.error && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                {detail.total ?? rows.length} record{(detail.total ?? rows.length) === 1 ? "" : "s"}
              </span>
              {detail.summary?.local != null && (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                  Locals: {detail.summary.local}
                </span>
              )}
              {detail.summary?.verifiedTourist != null && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700">
                  Verified tourists: {detail.summary.verifiedTourist}
                </span>
              )}
              {detail.total > (detail.limit || 200) && (
                <span className="text-slate-400">Showing the latest {detail.limit || 200} records.</span>
              )}
            </div>
          )}
        </div>

        <div className="max-h-[70dvh] overflow-y-auto px-4 py-4 sm:px-6">
          {detail.isLoading && (
            <div className="grid gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-slate-100 p-4">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="mt-2 h-3 w-64 max-w-full" />
                </div>
              ))}
            </div>
          )}

          {!detail.isLoading && detail.error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {detail.error}
            </div>
          )}

          {!detail.isLoading && !detail.error && rows.length === 0 && (
            <div className="py-12 text-center">
              <p className="font-semibold text-slate-700">No matching records today.</p>
              <p className="mt-1 text-sm text-slate-400">This total currently has no data to display.</p>
            </div>
          )}

          {!detail.isLoading && !detail.error && rows.length > 0 && (
            <>
              <div className="grid gap-3 md:hidden">
                {rows.map((row) => (
                  <div key={`${row.kind}-${row.id}`} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{row.fullName}</p>
                        <p className="mt-0.5 truncate text-xs text-slate-400">{row.contact || "—"}</p>
                      </div>
                      <Badge variant="outline">{row.detailLabel || formatStatus(row.status)}</Badge>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                      <div>
                        <p className="text-slate-400">Pass</p>
                        <p className="font-semibold text-slate-700">{row.passNumber || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Direction</p>
                        <p className="font-semibold text-slate-700">{formatTransaction(row.transactionType)}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Ship / Route</p>
                        <p className="font-semibold text-slate-700">{row.shipName || row.route || "—"}</p>
                      </div>
                      <div>
                        <p className="text-slate-400">Logged</p>
                        <p className="font-semibold text-slate-700">{formatDetailDate(row.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto rounded-xl border border-slate-200 md:block">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Passenger</th>
                      <th className="px-4 py-3">Contact</th>
                      <th className="px-4 py-3">Pass</th>
                      <th className="px-4 py-3">Direction</th>
                      <th className="px-4 py-3">Ship / Route</th>
                      <th className="px-4 py-3">Status / Type</th>
                      <th className="px-4 py-3">Logged</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={`${row.kind}-${row.id}`} className="border-t border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{row.fullName}</td>
                        <td className="px-4 py-3 text-slate-500">{row.contact || "—"}</td>
                        <td className="px-4 py-3 font-medium text-slate-700">{row.passNumber || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{formatTransaction(row.transactionType)}</td>
                        <td className="px-4 py-3 text-slate-600">
                          <p>{row.shipName || "—"}</p>
                          {row.route && <p className="text-xs text-slate-400">{row.route}</p>}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{row.detailLabel || formatStatus(row.status)}</Badge>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{formatDetailDate(row.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isPrintingReport, setIsPrintingReport] = useState(false);
  const [isImportingBarangay, setIsImportingBarangay] = useState(false);
  const [detail, setDetail] = useState({
    open: false,
    type: null,
    title: "",
    description: "",
    rows: [],
    total: 0,
    limit: 200,
    summary: null,
    isLoading: false,
    error: "",
  });
  const barangayFileInputRef = useRef(null);
  const { admin } = useAuth();
  const { showToast } = useToast();
  const canSeed = admin?.role === "SUPER_ADMIN" || admin?.role === "ADMIN";

  async function openDetail(type, title, description) {
    setDetail({
      open: true,
      type,
      title,
      description,
      rows: [],
      total: 0,
      limit: 200,
      summary: null,
      isLoading: true,
      error: "",
    });

    try {
      const res = await apiClient.get("/dashboard/details", { params: { type } });
      setDetail((current) =>
        current.type !== type
          ? current
          : {
              ...current,
              rows: res.data.rows || [],
              total: res.data.total || 0,
              limit: res.data.limit || 200,
              summary: res.data.summary || null,
              isLoading: false,
            }
      );
    } catch (err) {
      setDetail((current) =>
        current.type !== type
          ? current
          : {
              ...current,
              isLoading: false,
              error: err.response?.data?.message || "Unable to load the records for this total.",
            }
      );
    }
  }

  function handleBarangayImportClick() {
    barangayFileInputRef.current?.click();
  }

  function handleBarangayFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      setIsImportingBarangay(true);
      try {
        const res = await apiClient.post("/barangay-residents/import", { csvText: reader.result });
        showToast({
          title: "Barangay Masterlist imported",
          description: `${res.data.imported} resident record(s) loaded — replaced the previous list.`,
          variant: "success",
        });
      } catch (err) {
        showToast({
          title: "Import failed",
          description: err.response?.data?.message || "Please check the CSV format and try again.",
          variant: "error",
        });
      } finally {
        setIsImportingBarangay(false);
      }
    };
    reader.readAsText(file);
  }

  async function handlePrintExecutiveReport() {
    setIsPrintingReport(true);
    try {
      await downloadWithAuth(
        "/reports/executive-summary",
        `portgo-executive-summary-${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (err) {
      showToast({ title: "Report generation failed", variant: "error" });
    } finally {
      setIsPrintingReport(false);
    }
  }

  function loadStats() {
    return apiClient
      .get("/dashboard/stats")
      .then((res) => setStats(res.data))
      .finally(() => setIsLoading(false));
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function handleSeedDemo() {
    setIsSeeding(true);
    try {
      const res = await apiClient.post("/dev/seed-demo", { count: 100 });
      showToast({
        title: "Sample data seeded",
        description: `Added ${res.data.created} demo passenger logs spanning past weeks/months.`,
        variant: "success",
      });
      await loadStats();
    } catch (err) {
      showToast({
        title: "Seeding failed",
        description: err.response?.data?.message,
        variant: "error",
      });
    } finally {
      setIsSeeding(false);
    }
  }

  const touristTotal = stats ? stats.touristCount : 0;
  const touristVerifiedPct = touristTotal ? Math.round((stats.touristVerifiedCount / touristTotal) * 100) : 0;

  return (
    <div>
      <PortStatusBanner className="-mx-3 -mt-3 mb-4 rounded-none px-3 sm:-mx-5 sm:-mt-5 sm:mb-6 sm:px-5 lg:-mx-8 lg:-mt-8 lg:px-8" />

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-graphite">
            {getGreeting()}{admin?.fullName ? `, ${admin.fullName.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here&apos;s an overview of today&apos;s passenger activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <QuickSearch />
          <Button
            variant="outline"
            onClick={handlePrintExecutiveReport}
            disabled={isPrintingReport}
            title="Downloads a print-ready 1-page Week/Month/Year executive summary"
          >
            <Printer className="h-4 w-4" />
            {isPrintingReport ? "Generating..." : "Print Executive Report"}
          </Button>
          {canSeed && (
            <Button variant="outline" onClick={handleSeedDemo} disabled={isSeeding} title="Populate realistic sample logs for demo purposes">
              <Sparkles className="h-4 w-4" />
              {isSeeding ? "Seeding..." : "Seed Sample Passenger Logs"}
            </Button>
          )}
          {canSeed && (
            <>
              <Button
                variant="outline"
                onClick={downloadBarangayCsvTemplate}
                title="Download a sample CSV template for the Barangay Resident Masterlist"
              >
                <Download className="h-4 w-4" />
                Sample CSV Template
              </Button>
              <Button
                variant="outline"
                onClick={handleBarangayImportClick}
                disabled={isImportingBarangay}
                title="Upload an LGU Barangay Resident Masterlist CSV — replaces the current list"
              >
                <UploadCloud className="h-4 w-4" />
                {isImportingBarangay ? "Importing..." : "Upload Barangay CSV Masterlist"}
              </Button>
              <input
                ref={barangayFileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={handleBarangayFileSelected}
              />
            </>
          )}
        </div>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Passengers Today"
              value={stats.totalToday}
              icon={Users}
              accent
              changePct={stats.trend?.totalTodayChangePct}
              trendLabel="vs yesterday"
              onClick={() => openDetail("totalToday", "Total Passengers Today", "All passenger trip records created today.")}
            />
            <StatCard
              label="Today's Total Sign-In"
              value={stats.signInToday}
              icon={ArrowRightCircle}
              sublabel="Surigao → Dapa"
              accentColor="teal"
              onClick={() => openDetail("signInToday", "Today's Total Sign-In", "Passengers departing from Surigao to Dapa today.")}
            />
            <StatCard
              label="Today's Total Sign-Out"
              value={stats.signOutToday}
              icon={ArrowLeftCircle}
              sublabel="Dapa → Surigao"
              accentColor="blue"
              onClick={() => openDetail("signOutToday", "Today's Total Sign-Out", "Passengers arriving from Dapa to Surigao today.")}
            />
            <StatCard
              label="Locals vs Tourists Verified"
              value={`${stats.localCount} / ${stats.touristVerifiedCount}`}
              icon={touristTotal && stats.touristVerifiedCount > stats.localCount ? Plane : MapPin}
              sublabel={
                touristTotal
                  ? `${stats.touristVerifiedCount} of ${touristTotal} tourists verified (${touristVerifiedPct}%)`
                  : "No tourists registered yet"
              }
              accentColor="amber"
              onClick={() => openDetail("localsTouristsVerified", "Locals vs Tourists Verified", "Today's local passengers and foreign tourists who completed passport and face verification.")}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
            <StatCard
              label="Boarded Today"
              value={stats.boardedCount}
              icon={CheckCircle2}
              accentColor="green"
              onClick={() => openDetail("boardedCount", "Boarded Today", "Passengers marked as boarded today.")}
            />
            <StatCard
              label="Cancelled Today"
              value={stats.cancelledCount}
              icon={XCircle}
              accentColor="red"
              onClick={() => openDetail("cancelledCount", "Cancelled Today", "Bookings cancelled today.")}
            />
            <StatCard
              label="No-Shows Today"
              value={stats.noShowCount}
              icon={UserX}
              accentColor="amber"
              onClick={() => openDetail("noShowCount", "No-Shows Today", "Passengers marked as no-show today.")}
            />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Local vs. Tourist Ratio</CardTitle>
                <CardDescription>Passenger type distribution over the last 30 days.</CardDescription>
              </CardHeader>
              <CardContent>
                <LocalTouristChart
                  local={stats.localTouristRatio30d?.local ?? 0}
                  tourist={stats.localTouristRatio30d?.tourist ?? 0}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Peak Registration Hours</CardTitle>
                <CardDescription>Kiosk sign-ups by hour of day, last 7 days.</CardDescription>
              </CardHeader>
              <CardContent>
                <PeakHoursChart data={stats.peakHours || []} />
              </CardContent>
            </Card>
          </div>

          <div className="mt-5">
            <RecentActivityPanel />
          </div>
        </>
      )}

      <DashboardDetailDialog
        detail={detail}
        onOpenChange={(open) => setDetail((current) => ({ ...current, open }))}
      />
    </div>
  );
}
