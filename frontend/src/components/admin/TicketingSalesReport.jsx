import { useEffect, useState } from "react";
import { Ticket, Wallet, Users, Download } from "lucide-react";
import { DateRangeSelector } from "./DateRangeSelector";
import { StatCard } from "./StatCard";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { PassengerTrendChart } from "./charts/PassengerTrendChart";
import { LocalTouristChart } from "./charts/LocalTouristChart";
import { ClassDistributionChart } from "./charts/ClassDistributionChart";
import { PeakHoursChart } from "./charts/PeakHoursChart";
import { apiClient, downloadWithAuth } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function TicketingSalesReport() {
  const [dateFilter, setDateFilter] = useState({ range: "month", from: todayISO(), to: todayISO() });
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const { showToast } = useToast();

  function buildParams() {
    const params = { range: dateFilter.range };
    if (dateFilter.range === "custom") {
      params.from = dateFilter.from;
      params.to = dateFilter.to;
    }
    return params;
  }

  useEffect(() => {
    setIsLoading(true);
    apiClient
      .get("/reports/summary", { params: buildParams() })
      .then((res) => setSummary(res.data))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFilter]);

  async function handleExport() {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ ...buildParams(), format: "csv" }).toString();
      await downloadWithAuth(`/reports/export?${params}`, `portgo-sales-report-${todayISO()}.csv`);
    } catch {
      showToast({ title: "Export failed", variant: "error" });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <DateRangeSelector range={dateFilter.range} from={dateFilter.from} to={dateFilter.to} onChange={setDateFilter} />
        <Button onClick={handleExport} disabled={isExporting || !summary}>
          <Download className="h-4 w-4" />
          {isExporting ? "Exporting..." : "Download Sales Report"}
        </Button>
      </div>

      {isLoading || !summary ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[110px] animate-pulse rounded-2xl border border-gray-100 bg-white shadow-sm" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Tickets Sold" value={summary.ticketsSold} icon={Ticket} accent />
            <StatCard
              label="Revenue (Estimated)"
              value={`₱${summary.revenue.toLocaleString()}`}
              icon={Wallet}
              accentColor="green"
              sublabel="Based on a standard per-class fare table"
            />
            <StatCard label="Local Passengers" value={summary.localCount} icon={Users} accentColor="blue" />
            <StatCard label="Tourist Passengers" value={summary.touristCount} icon={Users} accentColor="violet" />
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Booking Trend</CardTitle>
                <CardDescription>Daily ticket volume across the selected period.</CardDescription>
              </CardHeader>
              <CardContent>
                <PassengerTrendChart data={summary.dailyTrend} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Local vs. Tourist</CardTitle>
                <CardDescription>Passenger demographics.</CardDescription>
              </CardHeader>
              <CardContent>
                <LocalTouristChart local={summary.localCount} tourist={summary.touristCount} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Class Distribution</CardTitle>
                <CardDescription>Tickets sold by accommodation class.</CardDescription>
              </CardHeader>
              <CardContent>
                <ClassDistributionChart breakdown={summary.classDistribution} />
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Hourly Booking Trend</CardTitle>
                <CardDescription>What time of day passengers register, across the period.</CardDescription>
              </CardHeader>
              <CardContent>
                <PeakHoursChart data={summary.hourlyBookingTrend} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
