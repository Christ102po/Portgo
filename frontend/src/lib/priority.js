export const PRIORITY_FLAG_OPTIONS = [
  { field: "isSeniorCitizen", label: "Senior Citizen" },
  { field: "isPWD", label: "PWD" },
  { field: "isPregnant", label: "Pregnant" },
  { field: "needsWheelchair", label: "Wheelchair" },
  { field: "isStudent", label: "Student" },
  { field: "isInfant", label: "Infant" },
];

// Fields that make a fare eligible for the 20% discount (see backend fareTable.js) —
// surfaced as their own toggle during ID verification rather than buried in the
// general priority/accessibility checklist.
export const DISCOUNT_FLAG_OPTIONS = [
  { field: "isStudent", label: "Student" },
  { field: "isSeniorCitizen", label: "Senior Citizen" },
  { field: "isPWD", label: "PWD" },
];

// The remaining priority/accessibility flags shown later in the flow.
export const ACCESSIBILITY_FLAG_OPTIONS = PRIORITY_FLAG_OPTIONS.filter(
  (opt) => !DISCOUNT_FLAG_OPTIONS.some((d) => d.field === opt.field)
);

export function priorityFlags(passenger) {
  if (!passenger) return [];
  const flags = [];
  if (passenger.isMedicalEmergency) flags.push("Medical");
  if (passenger.isSeniorCitizen) flags.push("Senior");
  if (passenger.isPWD) flags.push("PWD");
  if (passenger.isPregnant) flags.push("Pregnant");
  if (passenger.needsWheelchair) flags.push("Wheelchair");
  if (passenger.isStudent) flags.push("Student");
  if (passenger.isInfant) flags.push("Infant");
  if (!passenger.isInfant && passenger.age != null && passenger.age !== "" && Number(passenger.age) < 18) {
    flags.push("Minor");
  }
  return flags;
}

export function hasPriorityFlags(passenger) {
  return priorityFlags(passenger).length > 0;
}
