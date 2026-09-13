import { useEffect, useState } from "react";
import { Users, ArrowRightCircle, ArrowLeftCircle, FileDown, FileText } from "lucide-react";
import { DateRangeSelector } from "../../components/admin/DateRangeSelector";
import { StatCard } from "../../components/admin/StatCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { Skeleton } from "../../components/ui/Skeleton";
import { PassengerTrendChart } from "../../components/admin/charts/PassengerTrendChart";
import { LocalTouristChart } from "../../components/admin/charts/LocalTouristChart";
import { VehicleSummaryChart } from "../../components/admin/charts/VehicleSummaryChart";
import { apiClient, downloadWithAuth } from "../../lib/apiClient";
import { useToast } from "../../components/ui/Toast";

const ROUTE_OPTIONS = [
  { value: "ALL", label: "All Routes" },
  { value: "SURIGAO_TO_DAPA", label: "Surigao → Dapa" },
  { value: "DAPA_TO_SURIGAO", label: "Dapa → Surigao" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function ReportsPage() {
  const [ships, setShips] = useState([]);
  const [dateFilter, setDateFilter] = useState({ range: "month", from: todayISO(), to: todayISO() });
  const [shipId, setShipId] = useState("");
  const [route, setRoute] = useState("");
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    apiClient.get("/ships?all=1").then((res) => setShips(res.data.ships));
  }, []);

  function buildParams() {
    const params = { range: dateFilter.range };
    if (dateFilter.range === "custom") {
      params.from = dateFilter.from;
      params.to = dateFilter.to;
    }
    if (shipId) params.shipId = shipId;
    if (route) params.route = route;
    return params;
  }

  useEffect(() => {
    setIsLoading(true);
    apiClient
      .get("/reports/summary", { params: buildParams() })
      .then((res) => setSummary(res.data))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter, shipId, route]);

  async function handleExport(format) {
    setExporting(format);
    try {
      const params = new URLSearchParams({ ...buildParams(), format }).toString();
      const ext = format === "pdf" ? "pdf" : "csv";
      await downloadWithAuth(`/reports/export?${params}`, `portgo-report-${todayISO()}.${ext}`);
    } catch (err) {
      showToast({ title: "Export failed", variant: "error" });
    } finally {
      setExporting(null);
    }
  }

  const shipOptions = [{ value: "ALL", label: "All Ships" }, ...ships.map((s) => ({ value: s.id, label: s.name }))];

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-graphite">Reports &amp; Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">
            Passenger trends, distribution, and official manifest exports.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleExport("csv")} disabled={exporting !== null}>
            <FileDown className="h-4 w-4" />
            {exporting === "csv" ? "Exporting..." : "Export CSV"}
          </Button>
          <Button onClick={() => handleExport("pdf")} disabled={exporting !== null}>
            <FileText className="h-4 w-4" />
            {exporting === "pdf" ? "Generating..." : "Export Official Report"}
          </Button>
        </div>
      </header>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <DateRangeSelector
          range={dateFilter.range}
          from={dateFilter.from}
          to={dateFilter.to}
          onChange={setDateFilter}
        />
        <div className="flex gap-2">
          <Select value={shipId || "ALL"} onValueChange={(v) => setShipId(v === "ALL" ? "" : v)} options={shipOptions} className="w-full sm:w-44" />
          <Select value={route || "ALL"} onValueChange={(v) => setRoute(v === "ALL" ? "" : v)} options={ROUTE_OPTIONS} className="w-full sm:w-44" />
        </div>
      </div>

      {isLoading || !summary ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="mt-4 h-8 w-16" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Total Passengers"
              value={summary.totalPassengers}
              icon={Users}
              accent
              changePct={summary.trend?.changePct}
              trendLabel="vs previous period"
            />
            <StatCard label="Sign-Ins" value={summary.signIns} icon={ArrowRightCircle} sublabel="To Dapa" />
            <StatCard label="Sign-Outs" value={summary.signOuts} icon={ArrowLeftCircle} sublabel="To Surigao" />
            <StatCard
              label="Local vs Tourist"
              value={`${summary.localCount} / ${summary.touristCount}`}
              icon={Users}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Passenger Volume Trend</CardTitle>
                <CardDescription>Daily passenger count across the selected period.</CardDescription>
              </CardHeader>
              <CardContent>
                <PassengerTrendChart data={summary.dailyTrend} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Local vs. Tourist</CardTitle>
                <CardDescription>Distribution of passenger types.</CardDescription>
              </CardHeader>
              <CardContent>
                <LocalTouristChart local={summary.localCount} tourist={summary.touristCount} />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Vehicle Transport Summary</CardTitle>
                <CardDescription>Vehicles accompanying passengers, by category.</CardDescription>
              </CardHeader>
              <CardContent>
                <VehicleSummaryChart breakdown={summary.vehicleBreakdown} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Booking Status</CardTitle>
                <CardDescription>Breakdown for this period.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  ["Active", summary.statusBreakdown.ACTIVE, "bg-slate-300"],
                  ["Boarded", summary.statusBreakdown.BOARDED, "bg-mint"],
                  ["Cancelled", summary.statusBreakdown.CANCELLED, "bg-red-400"],
                  ["No-Show", summary.statusBreakdown.NO_SHOW, "bg-amber-400"],
                  ["Rebooked", summary.statusBreakdown.REBOOKED, "bg-slate-500"],
                ].map(([label, value, color]) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-600">
                      <span className={`h-2 w-2 rounded-full ${color}`} />
                      {label}
                    </span>
                    <span className="font-semibold text-graphite">{value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
