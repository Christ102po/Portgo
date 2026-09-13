import { MoreHorizontal, CheckCircle2, XCircle, UserX, CalendarClock, FileText, Download, Printer, Inbox, Banknote, IdCard, Mail, BadgeCheck } from "lucide-react";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Skeleton } from "../ui/Skeleton";
import { PriorityTags } from "../PriorityTags";
import { priorityFlags } from "../../lib/priority";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "../ui/DropdownMenu";
import { tripStatusBadge, transactionBadge } from "../../lib/tripStatus";
import { passengerTypeBadge, isPassengerVerified } from "../../lib/verification";
import { accommodationClassLabel } from "../../lib/accommodationClass";

function formatDate(value) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-50 last:border-0">
      {Array.from({ length: 11 }).map((_, i) => (
        <td key={i} className="px-4 py-4">
          <Skeleton className="h-4 w-full max-w-[100px]" />
        </td>
      ))}
    </tr>
  );
}

const ACTIONABLE_STATUSES = ["ACTIVE"];

export function RecordsTable({
  rows,
  total = 0,
  isLoading,
  onExport,
  isExporting,
  onBoard,
  onCancel,
  onNoShow,
  onRebook,
  onViewManifest,
  onMarkRefundProcessed,
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 print:hidden">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Passenger Trip Records</h2>
          <p className="text-xs text-slate-400">
            {total} record{total === 1 ? "" : "s"} found
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            onClick={onExport}
            disabled={isExporting}
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" />
            Print
          </Button>
        </div>
      </div>
      <div className="max-h-[70vh] overflow-auto">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-600">
            <th className="px-4 py-4">Pass Number</th>
            <th className="px-4 py-4">Passenger</th>
            <th className="px-4 py-4">Type &amp; Verification</th>
            <th className="px-4 py-4">Class</th>
            <th className="px-4 py-4">Transaction</th>
            <th className="px-4 py-4">Ship</th>
            <th className="px-4 py-4 text-center">Departure</th>
            <th className="px-4 py-4">Priority</th>
            <th className="px-4 py-4 text-center">Status</th>
            <th className="px-4 py-4 text-center">Logged At</th>
            <th className="px-4 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td colSpan={11} className="px-4 py-16 text-center">
                <div className="mx-auto flex max-w-xs flex-col items-center gap-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
                    <Inbox className="h-6 w-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-700">No Traveler Records Yet</p>
                  <p className="text-xs text-slate-400">
                    Transactions will automatically appear here once passengers check in.
                  </p>
                </div>
              </td>
            </tr>
          )}
          {!isLoading &&
            rows.map((r) => {
              const badge = tripStatusBadge(r.status);
              const typeBadge = passengerTypeBadge(r.passenger);
              const txnBadge = transactionBadge(r.transactionType);
              const canAct = ACTIONABLE_STATUSES.includes(r.status);
              const flags = priorityFlags(r.passenger);
              return (
                <tr
                  key={r.id}
                  className="border-b border-slate-100 transition-colors last:border-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-4 font-semibold text-slate-900">{r.passNumber}</td>
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-800">{r.passenger.fullName}</p>
                    <p className="text-xs text-slate-400">
                      {r.passenger.contactNumber || r.passenger.passportNumber || "—"}
                    </p>
                    {r.passenger.email && (
                      <p className="flex items-center gap-1 text-xs text-slate-400" title={r.passenger.email}>
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="max-w-[180px] truncate">{r.passenger.email}</span>
                        {r.passenger.isEmailVerified && (
                          <BadgeCheck className="h-3 w-3 shrink-0 text-emerald-500" title="Email verified" />
                        )}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1.5">
                      <Badge variant={typeBadge.variant}>{typeBadge.label}</Badge>
                      {r.passenger.verificationDocumentUrl && (
                        <a
                          href={r.passenger.verificationDocumentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:text-blue-700"
                          title="View uploaded ID document"
                        >
                          <IdCard className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-800">
                    {r.accommodationClass ? accommodationClassLabel(r.accommodationClass) : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <Badge variant={txnBadge.variant}>{txnBadge.label}</Badge>
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-800">{r.ship.name}</td>
                  <td className="px-4 py-4 text-center text-sm text-slate-800">{r.schedule?.departureTime || "—"}</td>
                  <td className="px-4 py-4">{flags.length > 0 ? <PriorityTags flags={flags} /> : "—"}</td>
                  <td className="px-4 py-4 text-center">
                    {r.status === "BOARDED" ? (
                      <Badge variant="active">Boarded</Badge>
                    ) : r.status === "ACTIVE" ? (
                      isPassengerVerified(r.passenger) ? (
                        <Badge variant="active">Verified</Badge>
                      ) : (
                        <Badge variant="neutral">Registered</Badge>
                      )
                    ) : (
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    )}
                    {r.statusReason && (
                      <p className="mt-0.5 max-w-[160px] truncate text-[11px] text-slate-400" title={r.statusReason}>
                        {r.statusReason}
                      </p>
                    )}
                    {r.refundRequested && (
                      <div className="mt-1">
                        <Badge variant={r.refundProcessed ? "neutral" : "warning"}>
                          {r.refundProcessed ? "Refund Processed" : "Refund Pending"}
                        </Badge>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center text-xs text-slate-500">{formatDate(r.createdAt)}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                      onClick={() => onViewManifest(r)}
                      title="View / Print Manifest"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    {r.refundRequested && !r.refundProcessed && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        onClick={() => onMarkRefundProcessed(r)}
                        title="Mark PPA Refund Processed"
                      >
                        <Banknote className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          disabled={!canAct}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Booking Actions</DropdownMenuLabel>
                        <DropdownMenuItem onSelect={() => onBoard(r)}>
                          <CheckCircle2 className="h-4 w-4 text-mint-dark" />
                          Mark as Boarded
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onRebook(r)}>
                          <CalendarClock className="h-4 w-4 text-graphite" />
                          Rebook to Next Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => onNoShow(r)}>
                          <UserX className="h-4 w-4 text-amber-600" />
                          Mark as No-Show
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem danger onSelect={() => onCancel(r)}>
                          <XCircle className="h-4 w-4" />
                          Cancel Booking
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    </div>
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
