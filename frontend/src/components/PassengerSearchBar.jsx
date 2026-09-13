import { useState } from "react";
import { Search, X, ShieldCheck, UserRound, RefreshCw } from "lucide-react";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { apiClient } from "../lib/apiClient";
import { passengerTypeLabel } from "../lib/verification";
import { getQueue } from "../lib/offlineQueue";
import { normalizePhone } from "../lib/phoneMatch";

// Registrations submitted while offline sit in localStorage (see
// offlineQueue.js) until connectivity returns and OfflineSyncManager pushes
// them to the server — they don't exist in the DB yet, so the backend
// search can't see them. Scan that queue too so a passenger registered
// moments ago on this device is still found immediately.
function searchOfflineQueue(query) {
  const normalizedQuery = normalizePhone(query);
  return getQueue()
    .filter((record) => record.endpoint === "/passengers")
    .map((record) => record.payload)
    .filter((p) => {
      if (normalizedQuery.length >= 7 && p.contactNumber && normalizePhone(p.contactNumber) === normalizedQuery) {
        return true;
      }
      return (
        (p.contactNumber && p.contactNumber.includes(query)) ||
        (p.passportNumber && p.passportNumber.includes(query)) ||
        (p.idNumber && p.idNumber.includes(query))
      );
    })
    .map((p) => ({ ...p, id: null, isOfflinePending: true, lastTrip: null }));
}

/**
 * Search bar for finding an existing passenger profile by phone number,
 * passport number, or ID number — for quick re-booking without re-entering
 * the passenger's saved details from scratch.
 */
export function PassengerSearchBar({ onSelect, placeholder = "Search by phone number or ID number" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e) {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 3) {
      setError("Enter at least 3 characters to search.");
      return;
    }
    setIsSearching(true);
    setError("");
    const trimmed = query.trim();
    const offlineMatches = searchOfflineQueue(trimmed);
    try {
      const res = await apiClient.get("/passengers/search", { params: { query: trimmed } });
      // A record already synced to the DB supersedes its still-queued
      // offline copy — dedupe by normalized contact number.
      const dbNumbers = new Set(res.data.passengers.map((p) => normalizePhone(p.contactNumber)).filter(Boolean));
      const pendingOnly = offlineMatches.filter((p) => !dbNumbers.has(normalizePhone(p.contactNumber)));
      setResults([...res.data.passengers, ...pendingOnly]);
    } catch (err) {
      // Backend unreachable (genuinely offline) — the offline queue is all
      // we can search, so surface it instead of just failing outright.
      if (!err.response && offlineMatches.length > 0) {
        setResults(offlineMatches);
      } else {
        setError(err.response?.data?.message || "Search failed. Please try again.");
        setResults(null);
      }
    } finally {
      setIsSearching(false);
    }
  }

  function clear() {
    setQuery("");
    setResults(null);
    setError("");
  }

  function handleSelect(passenger) {
    onSelect(passenger);
    clear();
  }

  return (
    <div>
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            className="pl-9"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Button type="submit" variant="outline" disabled={isSearching || !query.trim()}>
          {isSearching ? "Searching..." : "Search"}
        </Button>
        {(query || results) && (
          <Button type="button" variant="ghost" onClick={clear} title="Clear search">
            <X className="h-4 w-4" />
          </Button>
        )}
      </form>

      {error && <p className="mt-2 text-xs font-medium text-red-600">{error}</p>}

      {results && results.length === 0 && !error && (
        <p className="mt-2 text-xs text-slate-400">No existing passenger found for that number. They'll need to register as new.</p>
      )}

      {results && results.length > 0 && (
        <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-soft">
          {results.map((p, idx) => {
            // Still sitting in the offline queue, not yet synced to the
            // server — visible so staff know it exists, but not selectable
            // for rebooking yet (there's no real record id to rebook until
            // OfflineSyncManager pushes it through).
            if (p.isOfflinePending) {
              return (
                <div
                  key={p.localId || idx}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left opacity-80"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{p.fullName}</p>
                    <p className="truncate text-xs text-slate-400">
                      {p.contactNumber || p.passportNumber || p.idNumber || "—"}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 gap-1 border-amber-300 text-amber-700">
                    <RefreshCw className="h-3 w-3" />
                    Pending Sync
                  </Badge>
                </div>
              );
            }
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelect(p)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-slate-50"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <UserRound className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{p.fullName}</p>
                  <p className="truncate text-xs text-slate-400">
                    {p.contactNumber || p.passportNumber || p.idNumber || "—"}
                    {p.lastTrip && ` · Last: ${p.lastTrip.shipName} (${p.lastTrip.passNumber})`}
                  </p>
                </div>
                <Badge variant="outline" className="shrink-0">
                  {passengerTypeLabel(p.passengerType)}
                </Badge>
                <Badge variant="outline" className="shrink-0 gap-1 border-emerald-300 text-emerald-700">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified
                </Badge>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
