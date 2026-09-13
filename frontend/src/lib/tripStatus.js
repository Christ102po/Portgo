export const TRIP_STATUS_BADGE = {
  ACTIVE: { variant: "outline", label: "Active" },
  BOARDED: { variant: "active", label: "Boarded" },
  CANCELLED: { variant: "danger", label: "Cancelled" },
  NO_SHOW: { variant: "warning", label: "No-Show" },
  REBOOKED: { variant: "neutral", label: "Rebooked" },
  COMPLETED: { variant: "graphite", label: "Completed" },
};

export function tripStatusBadge(status) {
  return TRIP_STATUS_BADGE[status] || { variant: "neutral", label: status };
}

// Passenger-facing wording differs from the admin table (e.g. "Confirmed" instead of "Active").
export const PASSENGER_STATUS_BADGE = {
  ACTIVE: { variant: "active", label: "Confirmed" },
  BOARDED: { variant: "active", label: "Boarded" },
  CANCELLED: { variant: "danger", label: "Cancelled" },
  NO_SHOW: { variant: "warning", label: "No-Show" },
  REBOOKED: { variant: "neutral", label: "Rebooked" },
  COMPLETED: { variant: "graphite", label: "Completed" },
};

export function passengerStatusBadge(status) {
  return PASSENGER_STATUS_BADGE[status] || { variant: "neutral", label: status };
}

// SIGN_IN = outbound/departing, SIGN_OUT = inbound/arriving (enum names are historical).
export function transactionBadge(transactionType) {
  return transactionType === "SIGN_IN"
    ? { label: "Outbound · Departing", variant: "outline" }
    : { label: "Inbound · Arriving", variant: "outline" };
}
