import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MapPin, Plane, Search } from "lucide-react";
import { StatCard } from "../../components/admin/StatCard";
import { RecentActivityPanel } from "../../components/admin/RecentActivityPanel";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../../components/ui/Card";
import { LocalTouristChart } from "../../components/admin/charts/LocalTouristChart";
import { PeakHoursChart } from "../../components/admin/charts/PeakHoursChart";
import { apiClient } from "../../lib/apiClient";
import { useAuth } from "../../hooks/useAuth";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
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
          setResults(res.data.rows || []);
          setIsOpen(true);
        })
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function openRecord(row) {
    const tourist = ["LOCAL_TOURIST", "FOREIGN_TOURIST"].includes(row?.passenger?.passengerType);
    navigate(tourist ? "/admin/tourist-records" : "/admin/local-passenger-records", {
      state: { presetSearch: row?.passenger?.fullName || query.trim() },
    });
    setIsOpen(false);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          className="pl-9"
          placeholder="Search passenger name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
        />
      </div>
      {isOpen && (
        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          {isSearching && <p className="px-4 py-3 text-sm text-slate-400">Searching...</p>}
          {!isSearching && results.length === 0 && <p className="px-4 py-3 text-sm text-slate-400">No matches found.</p>}
          {!isSearching && results.map((row) => {
            const tourist = ["LOCAL_TOURIST", "FOREIGN_TOURIST"].includes(row.passenger?.passengerType);
            return (
              <button key={row.id} type="button" onClick={() => openRecord(row)} className="flex w-full items-center justify-between gap-3 border-b border-slate-50 px-4 py-3 text-left last:border-0 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">{row.passenger?.fullName}</p>
                  <p className="truncate text-xs text-slate-400">{row.ship?.name || "No ship"}</p>
                </div>
                <Badge variant="outline">{tourist ? "Tourist" : "Local"}</Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const { admin } = useAuth();

  useEffect(() => {
    apiClient.get("/dashboard/stats").then((res) => setStats(res.data)).finally(() => setIsLoading(false));
  }, []);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-graphite">{getGreeting()}{admin?.fullName ? `, ${admin.fullName.split(" ")[0]}` : ""}</h1>
          <p className="mt-1 text-sm text-slate-500">Overview of Tourist and Local Passenger registrations.</p>
        </div>
        <QuickSearch />
      </header>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <StatCard label="Registrations Today" value={isLoading ? "—" : stats?.totalToday ?? 0} icon={Users} accent />
        <StatCard label="Tourists Today" value={isLoading ? "—" : stats?.touristCount ?? 0} icon={Plane} accentColor="violet" />
        <StatCard label="Local Passengers Today" value={isLoading ? "—" : stats?.localCount ?? 0} icon={MapPin} accentColor="green" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tourist vs. Local Passenger</CardTitle>
            <CardDescription>Registration distribution over the last 30 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <LocalTouristChart local={stats?.localTouristRatio30d?.local ?? 0} tourist={stats?.localTouristRatio30d?.tourist ?? 0} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Peak Registration Hours</CardTitle>
            <CardDescription>Passenger registrations by hour over the last 7 days.</CardDescription>
          </CardHeader>
          <CardContent>
            <PeakHoursChart data={stats?.peakHours || []} />
          </CardContent>
        </Card>
      </div>

      <div className="mt-5"><RecentActivityPanel /></div>
    </div>
  );
}
