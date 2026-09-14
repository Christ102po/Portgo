import { useEffect, useState } from "react";
import { ChevronLeft, Percent, Check, UserSearch, Loader2, ShieldAlert } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { Card, CardContent } from "../ui/Card";
import { PriorityCheckboxes } from "./PriorityCheckboxes";
import { priorityFlags, ACCESSIBILITY_FLAG_OPTIONS } from "../../lib/priority";
import { toTitleCase, formatPhonePH } from "../../lib/format";
import { COUNTRY_CODES } from "../../lib/countryCodes";
import { isValidTouristPhone } from "../../lib/touristPhone";
import { INVALID_PH_PREFIX_MESSAGE } from "../../lib/phPrefixes";
import { apiClient } from "../../lib/apiClient";
import { cn } from "../../lib/cn";

const COUNTRY_CODE_OPTIONS = COUNTRY_CODES.map((c) => ({ value: c.code, label: c.label }));

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];

// Mutually exclusive — a passenger is one category at a time. "Regular"
// isn't a stored flag, it's just what's shown when none of the other three
// booleans are set.
const CATEGORY_OPTIONS = [
  { value: "STUDENT", label: "Student" },
  { value: "SENIOR", label: "Senior Citizen" },
  { value: "PWD", label: "PWD" },
  { value: "REGULAR", label: "Regular" },
];

function currentCategory(state) {
  if (state.isStudent) return "STUDENT";
  if (state.isSeniorCitizen) return "SENIOR";
  if (state.isPWD) return "PWD";
  return "REGULAR";
}

// Compact single-select pill row (not a boxed card) — matches the Special
// Assistance pills below it so both optional sections read as one
// lightweight strip.
function CategoryPills({ state, dispatch }) {
  const selected = currentCategory(state);

  function selectCategory(value) {
    dispatch({
      type: "SET_FIELDS",
      fields: {
        isStudent: value === "STUDENT",
        isSeniorCitizen: value === "SENIOR",
        isPWD: value === "PWD",
      },
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
        <Percent className="h-3.5 w-3.5" />
        Passenger Category:
      </span>
      {CATEGORY_OPTIONS.map((opt) => {
        const checked = selected === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => selectCategory(opt.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-150",
              checked ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
            )}
          >
            {opt.label}
          </button>
        );
      })}
      {selected !== "REGULAR" && (
        <span className="text-[11px] font-medium text-emerald-700">20% fare discount applied</span>
      )}
    </div>
  );
}

function residentAddress(resident) {
  return [resident.barangay, resident.municipality].filter(Boolean).join(", ");
}

// Full Name field with live Barangay Resident Masterlist autocomplete —
// Local Resident only. Selecting a suggestion auto-fills Gender/Age/Address
// and marks the passenger as Barangay Registry Verified; editing the name
// away from that match clears the verified flag again.
function BarangayNameField({ state, dispatch }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const query = state.fullName.trim();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const timeout = setTimeout(() => {
      apiClient
        .get("/barangay-residents/search", { params: { query } })
        .then((res) => {
          if (!cancelled) setSuggestions(res.data.residents);
        })
        .catch(() => {
          if (!cancelled) setSuggestions([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.fullName]);

  function handleNameChange(value) {
    dispatch({
      type: "SET_FIELDS",
      fields: { fullName: toTitleCase(value), isBarangayVerified: false },
    });
  }

  function selectResident(resident) {
    dispatch({
      type: "SET_FIELDS",
      fields: {
        fullName: resident.fullName,
        gender: resident.gender || state.gender,
        age: resident.age != null ? String(resident.age) : state.age,
        address: residentAddress(resident) || state.address,
        isBarangayVerified: true,
      },
    });
    setSuggestions([]);
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="fullName">Full Name</Label>
        {state.isBarangayVerified && (
          <Badge variant="active" className="gap-1 py-0.5 text-[10px] shadow-sm">
            <Check className="h-3 w-3" />
            Verified Resident
          </Badge>
        )}
      </div>
      <div className="relative">
        <Input
          id="fullName"
          placeholder="Juan Dela Cruz"
          value={state.fullName}
          autoComplete="off"
          onChange={(e) => handleNameChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        />
        {isSearching && (
          <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-slate-400" />
        )}
      </div>

      {!state.isBarangayVerified && (
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-slate-400">
          <UserSearch className="h-3 w-3" />
          Start typing to search the Barangay Resident Masterlist
        </p>
      )}

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card">
          {suggestions.map((r) => (
            <button
              key={r.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectResident(r)}
              className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left text-sm transition-colors hover:bg-emerald-50"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-800">{r.fullName}</p>
                <p className="truncate text-xs text-slate-400">{residentAddress(r)}</p>
              </div>
              <span className="shrink-0 text-xs text-slate-400">
                {r.gender ? r.gender[0] : "—"} / {r.age ?? "—"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }) {
  return <p className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">{children}</p>;
}

// Direct manual-entry Passenger Information form — no ID scanning/OCR
// anywhere in this flow. Every field is a plain controlled input bound to
// wizard state, so nothing here ever resets or overwrites what the
// passenger has typed. Laid out as a wide 2-column grid (Primary Details /
// Contact Details) so the whole form fits one kiosk screen without
// scrolling.
export function StepPersonalInfo() {
  const { state, dispatch } = useWizard();
  const flags = priorityFlags(state);
  const isTourist = state.passengerType === "FOREIGN_TOURIST";
  const touristPhoneValid = isValidTouristPhone(state.touristPhoneCountryCode, state.touristPhone);

  function setField(field, value) {
    dispatch({ type: "SET_FIELD", field, value });
  }

  // Smart auto-check: age >= 60 automatically switches Passenger Category
  // to Senior Citizen (clearing Student/PWD, since the category is single-
  // select), and clears it again if the age is corrected below 60 — so
  // staff/passengers don't have to remember to toggle it separately.
  function handleAgeChange(value) {
    const fields = { age: value };
    const numericAge = Number(value);
    if (value.trim() && !Number.isNaN(numericAge)) {
      const isSenior = numericAge >= 60;
      fields.isSeniorCitizen = isSenior;
      if (isSenior) {
        fields.isStudent = false;
        fields.isPWD = false;
      }
    }
    dispatch({ type: "SET_FIELDS", fields });
  }

  const canContinue = isTourist
    ? state.fullName.trim() && state.nationality.trim() && state.passportNumber.trim() && touristPhoneValid
    : state.isPhoneVerified &&
      state.fullName.trim() &&
      state.gender &&
      state.age.trim() &&
      Number(state.age) > 0 &&
      state.address.trim();

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold text-slate-900">Passenger Information</h2>
      <p className="mb-6 text-center text-sm text-slate-500">
        Please fill in your details — no ID scan needed.
      </p>

      <Card className="mx-auto max-w-5xl border-slate-200/80 shadow-sm">
        <CardContent className="grid grid-cols-1 gap-x-10 gap-y-5 p-4 sm:p-6 lg:grid-cols-2 lg:divide-x lg:divide-slate-100">
          {/* Left column: Primary Details */}
          <div className="space-y-4">
            <SectionLabel>Primary Details</SectionLabel>

            {state.passengerType === "LOCAL_RESIDENT" ? (
              <BarangayNameField state={state} dispatch={dispatch} />
            ) : (
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  placeholder="Juan Dela Cruz"
                  value={state.fullName}
                  onChange={(e) => setField("fullName", toTitleCase(e.target.value))}
                />
              </div>
            )}

            {!isTourist && (
              <>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <Label>Gender</Label>
                    <Select
                      value={state.gender}
                      onValueChange={(v) => setField("gender", v)}
                      options={GENDER_OPTIONS}
                      placeholder="Select gender"
                    />
                  </div>
                  <div>
                    <Label htmlFor="age">Age</Label>
                    <Input
                      id="age"
                      type="number"
                      min="0"
                      max="130"
                      placeholder="35"
                      value={state.age}
                      onChange={(e) => handleAgeChange(e.target.value)}
                    />
                    {Number(state.age) >= 60 && (
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                        <Check className="h-3 w-3" />
                        Senior Citizen discount auto-applied
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="address">Address / Barangay</Label>
                  <Input
                    id="address"
                    placeholder="Barangay, City/Municipality"
                    value={state.address}
                    onChange={(e) => setField("address", e.target.value)}
                  />
                </div>
              </>
            )}

            {isTourist && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="nationality">Nationality</Label>
                  <Input
                    id="nationality"
                    placeholder="American"
                    value={state.nationality}
                    onChange={(e) => setField("nationality", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="passportNumber">Passport Number</Label>
                  <Input
                    id="passportNumber"
                    placeholder="P1234567"
                    value={state.passportNumber}
                    onChange={(e) => setField("passportNumber", e.target.value.toUpperCase())}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right column: Contact Details */}
          <div className="space-y-4 lg:pl-10">
            <SectionLabel>Contact Details</SectionLabel>

            {isTourist && (
              <div>
                <Label htmlFor="touristPhone">Mobile Number (Optional)</Label>
                <div className="flex gap-2">
                  <Select
                    className="w-32 shrink-0"
                    value={state.touristPhoneCountryCode}
                    onValueChange={(v) => setField("touristPhoneCountryCode", v)}
                    options={COUNTRY_CODE_OPTIONS}
                  />
                  <Input
                    id="touristPhone"
                    inputMode="tel"
                    placeholder={state.touristPhoneCountryCode === "+63" ? "917 123 4567" : "phone number"}
                    value={state.touristPhone}
                    onChange={(e) => setField("touristPhone", e.target.value)}
                  />
                </div>
                {state.touristPhone && !touristPhoneValid && (
                  <p className="mt-2 text-xs font-semibold text-red-600">
                    {state.touristPhoneCountryCode === "+63" ? INVALID_PH_PREFIX_MESSAGE : "Enter a valid phone number for the selected country."}
                  </p>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <Label htmlFor="email">Email Address (Optional)</Label>
                {state.isEmailVerified && state.email && (
                  <Badge variant="active" className="gap-1">
                    <Check className="h-3 w-3" /> Verified
                  </Badge>
                )}
              </div>
              <Input
                id="email"
                type="email"
                placeholder="juan.delacruz@email.com"
                value={state.email}
                readOnly={state.isEmailVerified}
                onChange={(e) => setField("email", e.target.value)}
              />
              <p className="mt-1 text-xs text-slate-400">
                {state.isEmailVerified && state.email
                  ? "Verified during phone/email verification. Your confirmation and pass will be sent here."
                  : "We'll send your confirmation and verification pass here."}
              </p>
            </div>

            {!isTourist && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="emergencyName">Emergency Contact</Label>
                  <Input
                    id="emergencyName"
                    placeholder="Ana Dela Cruz"
                    value={state.emergencyContactName}
                    onChange={(e) => setField("emergencyContactName", toTitleCase(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="emergencyPhone">Contact Number</Label>
                  <Input
                    id="emergencyPhone"
                    placeholder="0917-123-4567"
                    inputMode="numeric"
                    maxLength={13}
                    value={state.emergencyContactPhone}
                    onChange={(e) => setField("emergencyContactPhone", formatPhonePH(e.target.value))}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Compact optional pill strip — spans both columns */}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-slate-100 pt-4 lg:col-span-2">
            {!isTourist && <CategoryPills state={state} dispatch={dispatch} />}
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                <ShieldAlert className="h-3.5 w-3.5" />
                Special Assistance:
              </span>
              <PriorityCheckboxes
                theme="light"
                compact
                values={state}
                options={ACCESSIBILITY_FLAG_OPTIONS}
                onChange={(next) => dispatch({ type: "SET_FIELDS", fields: next })}
              />
            </div>
            {flags.length > 0 && (
              <span className="text-[11px] font-medium text-blue-700">
                {flags.length} priority flag{flags.length === 1 ? "" : "s"} noted for boarding staff
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mobile-action-bar">
        <Button variant="outline" size="lg" onClick={() => dispatch({ type: "PREV_STEP" })}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          variant="kiosk"
          size="lg"
          className={cn(
            "h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl",
            canContinue && "animate-[continuePulse_1.8s_ease-in-out_infinite]"
          )}
          disabled={!canContinue}
          onClick={() => dispatch({ type: "NEXT_STEP" })}
        >
          Continue
        </Button>
      </div>
      {canContinue && (
        <style>{`
          @keyframes continuePulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.45); }
            50% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
          }
        `}</style>
      )}
    </div>
  );
}
