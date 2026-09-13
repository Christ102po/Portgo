import { useEffect, useState } from "react";
import { Search, Printer, Download, ChevronLeft, TicketX } from "lucide-react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../ui/Dialog";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { BoardingPassCard } from "./BoardingPassCard";
import { apiClient } from "../../lib/apiClient";
import { formatPhonePH } from "../../lib/format";
import { routeLabel } from "../../lib/route";
import { passengerStatusBadge } from "../../lib/tripStatus";
import { downloadBoardingPass } from "../../lib/downloadPass";
import { useToast } from "../ui/Toast";

function normalizeQuery(raw) {
  const trimmed = raw.trim();
  if (/^pg[- ]?/i.test(trimmed)) return trimmed.toUpperCase();
  if (/^\d/.test(trimmed)) return formatPhonePH(trimmed);
  return trimmed.toUpperCase();
}

export function FindTicketModal({ open, onOpenChange, initialQuery }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState("");
  const { showToast } = useToast();

  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults(null);
      setSelected(null);
      setError("");
    } else if (initialQuery) {
      setQuery(initialQuery);
      runSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (results && results.length === 1) {
      setSelected(results[0]);
    }
  }, [results]);

  async function runSearch(raw) {
    if (!raw.trim()) return;
    setIsSearching(true);
    setError("");
    setResults(null);
    setSelected(null);
    try {
      const res = await apiClient.get("/passengers/lookup", { params: { query: normalizeQuery(raw) } });
      setResults(res.data.trips);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsSearching(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    runSearch(query);
  }

  function reset() {
    setResults(null);
    setSelected(null);
  }

  async function handleDownload() {
    setIsDownloading(true);
    try {
      await downloadBoardingPass(selected);
    } catch {
      showToast({ title: "Download failed", description: "Please try again.", variant: "error" });
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogTitle className="flex items-center gap-2 print:hidden">
          <Search className="h-5 w-5 text-graphite" />
          Find My Verification Pass
        </DialogTitle>
        <DialogDescription className="print:hidden">
          Lost your QR code or your phone battery died? Enter your Mobile Number (Local), Passport
          Number (Tourist), or booking ID to retrieve and reprint your pass.
        </DialogDescription>

        {!selected && (
          <form onSubmit={handleSearch} className="mt-5 flex gap-2 print:hidden">
            <Input
              autoFocus
              placeholder="Mobile no., passport no., or PG-20260814-XXXXX"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button type="submit" disabled={isSearching || !query.trim()}>
              {isSearching ? "Searching..." : "Find"}
            </Button>
          </form>
        )}

        {error && <p className="mt-3 text-sm text-red-600 print:hidden">{error}</p>}

        {results && results.length === 0 && (
          <div className="mt-6 flex flex-col items-center gap-2 py-6 text-center print:hidden">
            <TicketX className="h-8 w-8 text-slate-300" />
            <p className="text-sm font-medium text-ink">No booking found</p>
            <p className="text-xs text-slate-400">
              Double-check your phone number or booking ID and try again.
            </p>
          </div>
        )}

        {results && results.length > 1 && !selected && (
          <div className="mt-5 max-h-80 space-y-2 overflow-y-auto print:hidden">
            {results.map((r) => {
              const badge = passengerStatusBadge(r.trip.status);
              return (
                <button
                  key={r.trip.id}
                  onClick={() => setSelected(r)}
                  className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-left transition-colors hover:border-graphite hover:bg-surface"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold text-graphite">{r.passNumber}</p>
                    <p className="text-xs text-slate-500">
                      {r.ship.name} &middot; {routeLabel(r.schedule.route)} &middot; {r.schedule.departureTime}
                    </p>
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="mt-4">
            {results && results.length > 1 && (
              <button
                onClick={reset}
                className="mb-3 flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-graphite print:hidden"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Back to results
              </button>
            )}
            <BoardingPassCard
              passenger={selected.passenger}
              trip={selected.trip}
              ship={selected.ship}
              schedule={selected.schedule}
              qrCodeDataUrl={selected.qrCodeDataUrl}
              passNumber={selected.passNumber}
            />
            <div className="mt-4 flex flex-wrap justify-center gap-2.5 print:hidden">
              <Button variant="outline" onClick={() => window.print()}>
                <Printer className="h-4 w-4" />
                Print Pass
              </Button>
              <Button variant="outline" onClick={handleDownload} disabled={isDownloading}>
                <Download className="h-4 w-4" />
                {isDownloading ? "Preparing..." : "Download Pass"}
              </Button>
              <Button variant="ghost" onClick={reset}>
                Search Again
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
