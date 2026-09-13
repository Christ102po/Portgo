export const ACCOMMODATION_CLASSES = [
  { value: "ECONOMY", label: "Economy Class", subtitle: "Standard / Non-Aircon" },
  { value: "TOURIST_AIRCON", label: "Tourist Class", subtitle: "Aircon Cabin" },
  { value: "BUSINESS", label: "Business Class", subtitle: "VIP / Premium Aircon" },
];

export function accommodationClassLabel(value) {
  return ACCOMMODATION_CLASSES.find((c) => c.value === value)?.label || value;
}

export function accommodationClassSubtitle(value) {
  return ACCOMMODATION_CLASSES.find((c) => c.value === value)?.subtitle || "";
}
