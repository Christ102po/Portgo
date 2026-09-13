import { useEffect, useMemo, useState } from "react";
import { Ticket, UserRound, Users, Plus, Trash2, Car, Printer, RotateCcw, BarChart3, FilePlus2, BadgeCheck, UserX } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Select } from "../../components/ui/Select";
import { Switch } from "../../components/ui/Switch";
import { Button } from "../../components/ui/Button";
import { Badge } from "../../components/ui/Badge";
import { BoardingPassCard } from "../../components/wizard/BoardingPassCard";
import { FamilyBoardingPassCard } from "../../components/wizard/FamilyBoardingPassCard";
import { PriorityCheckboxes } from "../../components/wizard/PriorityCheckboxes";
import { IdScannerUpload } from "../../components/wizard/IdScannerUpload";
import { PassengerSearchBar } from "../../components/PassengerSearchBar";
import { TicketingSalesReport } from "../../components/admin/TicketingSalesReport";
import { apiClient } from "../../lib/apiClient";
import { toTitleCase, formatPhonePH } from "../../lib/format";
import { cn } from "../../lib/cn";
import { LOW_CONFIDENCE_FIELD_CLASS } from "../../lib/idOcr";
import { useToast } from "../../components/ui/Toast";
import { ACCOMMODATION_CLASSES } from "../../lib/accommodationClass";
import { passengerTypeLabel } from "../../lib/verification";

const PASSENGER_TYPE_OPTIONS = [
  { value: "LOCAL_RESIDENT", label: "Local Resident" },
  { value: "LOCAL_TOURIST", label: "Local Tourist" },
  { value: "FOREIGN_TOURIST", label: "Foreign Tourist" },
];
const DOCUMENT_OPTIONS_BY_TYPE = {
  LOCAL_RESIDENT: [
    { value: "VALID_ID", label: "Valid ID" },
    { value: "BARANGAY_CLEARANCE", label: "Barangay Clearance" },
    { value: "STUDENT_ID", label: "Student ID" },
  ],
  LOCAL_TOURIST: [
    { value: "VALID_ID", label: "Valid ID" },
    { value: "STUDENT_ID", label: "Student ID" },
  ],
};
const TRANSACTION_TYPE_OPTIONS = [
  { value: "SIGN_IN", label: "Outbound · Departing" },
  { value: "SIGN_OUT", label: "Inbound · Arriving" },
];
const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
];
const VEHICLE_TYPE_OPTIONS = [
  { value: "MOTORCYCLE", label: "Motorcycle" },
  { value: "SEDAN_SUV", label: "Sedan / SUV" },
  { value: "TRUCK_CARGO", label: "Truck / Cargo" },
];

const EMPTY_MEMBER = {
  fullName: "",
  age: "",
  gender: "MALE",
  isSeniorCitizen: false,
  isPWD: false,
  isPregnant: false,
  needsWheelchair: false,
  isStudent: false,
  isInfant: false,
  isMedicalEmergency: false,
};

const INITIAL_FORM = {
  bookingMode: "INDIVIDUAL",
  rebookPassengerId: null,
  passengerType: "LOCAL_RESIDENT",
  transactionType: "SIGN_IN",
  fullName: "",
  contactNumber: "",
  email: "",
  gender: "MALE",
  age: "",
  address: "",
  passportNumber: "",
  idNumber: "",
  verificationDocumentType: null,
  verificationDocumentUrl: null,
  isDocumentVerified: false,
  isSeniorCitizen: false,
  isPWD: false,
  isPregnant: false,
  needsWheelchair: false,
  isStudent: false,
  isInfant: false,
  isMedicalEmergency: false,
  members: [],
  shipId: null,
  scheduleId: null,
  accommodationClass: null,
  hasVehicle: false,
  vehicleType: null,
  plateNumber: "",
};

export default function TicketingDeskPage() {
  const [view, setView] = useState("entry");
  const [form, setForm] = useState(INITIAL_FORM);
  const [ships, setShips] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [lowConfidenceFields, setLowConfidenceFields] = useState([]);
  const { showToast } = useToast();
  const isLowConfidence = (field) => lowConfidenceFields.includes(field);

  useEffect(() => {
    apiClient.get("/ships").then((res) => setShips(res.data.ships));
    apiClient.get("/schedules").then((res) => setSchedules(res.data.schedules));
  }, []);

  function set(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const isFamily = form.bookingMode === "FAMILY";
  const isTourist = form.passengerType === "FOREIGN_TOURIST";
  const documentOptions = DOCUMENT_OPTIONS_BY_TYPE[form.passengerType] || DOCUMENT_OPTIONS_BY_TYPE.LOCAL_RESIDENT;

  const filteredSchedules = useMemo(
    () => (form.shipId ? schedules.filter((s) => s.shipId === form.shipId) : schedules),
    [schedules, form.shipId]
  );
  const selectedSchedule = filteredSchedules.find((s) => s.id === form.scheduleId) || null;

  function handleScanned({ imageUrl, fields }) {
    const documentType = form.verificationDocumentType || documentOptions[0].value;
    setForm((prev) => ({
      ...prev,
      verificationDocumentUrl: imageUrl,
      verificationDocumentType: documentType,
      isDocumentVerified: !!fields?.fullName,
      fullName: fields?.fullName || prev.fullName,
      gender: fields?.gender || prev.gender,
      age: fields?.age != null ? String(fields.age) : prev.age,
      idNumber: fields?.idNumber || prev.idNumber,
    }));
    setLowConfidenceFields(fields?.lowConfidenceFields || []);
  }

  function handleClearScan() {
    set("verificationDocumentUrl", null);
    set("isDocumentVerified", false);
    setLowConfidenceFields([]);
  }

  function handleSelectExistingPassenger(p) {
    setForm((prev) => ({
      ...prev,
      bookingMode: "INDIVIDUAL",
      rebookPassengerId: p.id,
      passengerType: p.passengerType,
      fullName: p.fullName,
      contactNumber: p.contactNumber || "",
      gender: p.gender || "MALE",
      age: p.age != null ? String(p.age) : "",
      address: p.address || "",
      email: p.email || "",
      passportNumber: p.passportNumber || "",
      idNumber: p.idNumber || "",
      verificationDocumentType: p.verificationDocumentType || null,
      verificationDocumentUrl: null,
      isDocumentVerified: p.isDocumentVerified,
      members: [],
    }));
    setLowConfidenceFields([]);
    showToast({ title: "Profile loaded", description: `${p.fullName}'s saved details were auto-filled.`, variant: "success" });
  }

  function handleClearRebook() {
    setForm((prev) => ({ ...INITIAL_FORM, bookingMode: prev.bookingMode, transactionType: prev.transactionType }));
    setLowConfidenceFields([]);
  }

  function updateMember(index, patch) {
    set("members", form.members.map((m, i) => (i === index ? { ...m, ...patch } : m)));
  }
  function addMember() {
    set("members", [...form.members, { ...EMPTY_MEMBER }]);
  }
  function removeMember(index) {
    set("members", form.members.filter((_, i) => i !== index));
  }

  const scheduleOptions = filteredSchedules.map((s) => ({
    value: s.id,
    label: `${s.departureTime} — ${s.route === "SURIGAO_TO_DAPA" ? "Surigao → Dapa" : "Dapa → Surigao"}${
      s.isFull ? " (FULL)" : ` (${s.seatsLeft} left)`
    }`,
    disabled: s.isFull,
  }));

  const isRebooking = !!form.rebookPassengerId;
  const headValid =
    form.fullName.trim() &&
    form.contactNumber.trim() &&
    form.address.trim() &&
    form.age !== "" &&
    (!isTourist || form.passportNumber.trim()) &&
    (isTourist || isRebooking || !!form.verificationDocumentUrl);
  const membersValid =
    !isFamily || (form.members.length >= 1 && form.members.every((m) => m.fullName.trim() && m.age !== ""));
  const tripValid =
    form.shipId &&
    form.scheduleId &&
    selectedSchedule &&
    !selectedSchedule.isFull &&
    !!form.accommodationClass &&
    (isFamily || !form.hasVehicle || (form.vehicleType && form.plateNumber.trim()));
  const canSubmit = headValid && membersValid && tripValid && !isSubmitting;

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      if (isFamily) {
        const payload = {
          headContact: form.contactNumber,
          headEmail: form.email || undefined,
          gender: form.gender,
          address: form.address,
          passengerType: form.passengerType,
          passportNumber: isTourist ? form.passportNumber : undefined,
          idNumber: !isTourist ? form.idNumber || undefined : undefined,
          verificationDocumentType: form.verificationDocumentType || undefined,
          verificationDocumentUrl: form.verificationDocumentUrl || undefined,
          transactionType: form.transactionType,
          shipId: form.shipId,
          scheduleId: form.scheduleId,
          accommodationClass: form.accommodationClass,
          members: [
            {
              fullName: form.fullName,
              age: Number(form.age),
              gender: form.gender,
              isSeniorCitizen: form.isSeniorCitizen,
              isPWD: form.isPWD,
              isPregnant: form.isPregnant,
              needsWheelchair: form.needsWheelchair,
              isStudent: form.isStudent,
              isInfant: form.isInfant,
              isMedicalEmergency: form.isMedicalEmergency,
            },
            ...form.members.map((m) => ({
              fullName: m.fullName,
              age: Number(m.age),
              gender: m.gender,
              isSeniorCitizen: m.isSeniorCitizen,
              isPWD: m.isPWD,
              isPregnant: m.isPregnant,
              needsWheelchair: m.needsWheelchair,
              isStudent: m.isStudent,
              isInfant: m.isInfant,
              isMedicalEmergency: m.isMedicalEmergency,
            })),
          ],
        };
        const res = await apiClient.post("/family-bookings", payload);
        setResult({ ...res.data, isFamily: true });
      } else if (isRebooking) {
        const payload = {
          transactionType: form.transactionType,
          shipId: form.shipId,
          scheduleId: form.scheduleId,
          accommodationClass: form.accommodationClass,
          hasVehicle: form.hasVehicle,
          vehicleType: form.hasVehicle ? form.vehicleType : undefined,
          plateNumber: form.hasVehicle ? form.plateNumber : undefined,
        };
        const res = await apiClient.post(`/passengers/${form.rebookPassengerId}/rebook`, payload);
        setResult({ ...res.data, isFamily: false });
      } else {
        const payload = {
          fullName: form.fullName,
          contactNumber: form.contactNumber,
          email: form.email || undefined,
          gender: form.gender,
          address: form.address,
          passengerType: form.passengerType,
          passportNumber: isTourist ? form.passportNumber : undefined,
          idNumber: !isTourist ? form.idNumber || undefined : undefined,
          verificationDocumentType: form.verificationDocumentType || undefined,
          verificationDocumentUrl: form.verificationDocumentUrl || undefined,
          isDocumentVerified: form.isDocumentVerified,
          age: Number(form.age),
          transactionType: form.transactionType,
          shipId: form.shipId,
          scheduleId: form.scheduleId,
          accommodationClass: form.accommodationClass,
          isSeniorCitizen: form.isSeniorCitizen,
          isPWD: form.isPWD,
          isPregnant: form.isPregnant,
          needsWheelchair: form.needsWheelchair,
          isStudent: form.isStudent,
          isInfant: form.isInfant,
          isMedicalEmergency: form.isMedicalEmergency,
          hasVehicle: form.hasVehicle,
          vehicleType: form.hasVehicle ? form.vehicleType : undefined,
          plateNumber: form.hasVehicle ? form.plateNumber : undefined,
        };
        const res = await apiClient.post("/passengers", payload);
        setResult({ ...res.data, isFamily: false });
      }
      showToast({ title: "Passenger logged", description: "Confirmation ready to print.", variant: "success" });
    } catch (err) {
      showToast({
        title: "Logging failed",
        description: err.response?.data?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNewBooking() {
    setResult(null);
    setForm(INITIAL_FORM);
    setLowConfidenceFields([]);
  }

  if (result) {
    return (
      <div>
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-graphite">
              <Ticket className="h-6 w-6" />
              Passenger Logged
            </h1>
            <p className="mt-1 text-sm text-slate-500">Print the confirmation for the passenger.</p>
          </div>
          <div className="flex gap-2 print:hidden">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button onClick={handleNewBooking}>
              <RotateCcw className="h-4 w-4" />
              New Entry
            </Button>
          </div>
        </header>
        {result.isFamily ? (
          <FamilyBoardingPassCard
            familyBooking={result.familyBooking}
            trips={result.trips}
            ship={result.ship}
            schedule={result.schedule}
            qrCodeDataUrl={result.masterQrCodeDataUrl}
            masterCode={result.masterCode}
          />
        ) : (
          <BoardingPassCard
            passenger={result.passenger}
            trip={result.trip}
            ship={result.ship}
            schedule={result.schedule}
            qrCodeDataUrl={result.qrCodeDataUrl}
            passNumber={result.passNumber}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-graphite">
            <Ticket className="h-6 w-6" />
            Ticketing Desk
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {view === "entry"
              ? "Assist walk-in passengers by logging their details directly into the system."
              : "Ticket sales, revenue, and passenger demographics for this ticketing desk."}
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-soft">
          {[
            { value: "entry", label: "New Entry", icon: FilePlus2 },
            { value: "reports", label: "Sales Reports", icon: BarChart3 },
          ].map((opt) => {
            const Icon = opt.icon;
            const selected = view === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setView(opt.value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all duration-150",
                  selected ? "bg-graphite text-mint shadow-soft" : "text-slate-500 hover:text-graphite"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </header>

      {view === "reports" ? (
        <TicketingSalesReport />
      ) : (
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Passenger Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isRebooking && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Search Existing Passenger — Quick Re-Booking
                </p>
                <PassengerSearchBar onSelect={handleSelectExistingPassenger} />
              </div>
            )}

            {isRebooking && (
              <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Re-booking {form.fullName}</p>
                    <p className="text-xs text-emerald-700">
                      Using saved profile ({passengerTypeLabel(form.passengerType)}) — just pick a trip below.
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleClearRebook}>
                  <UserX className="h-3.5 w-3.5" />
                  New Passenger
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[
                { value: "INDIVIDUAL", label: "Individual", icon: UserRound },
                { value: "FAMILY", label: "Family / Group", icon: Users },
              ].map((opt) => {
                const Icon = opt.icon;
                const selected = form.bookingMode === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isRebooking}
                    onClick={() => {
                      if (opt.value === "FAMILY") set("rebookPassengerId", null);
                      set("bookingMode", opt.value);
                    }}
                    className={cn(
                      "flex items-center justify-center gap-2 rounded-xl border-2 px-3.5 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      selected ? "border-graphite bg-mint/20 text-graphite" : "border-slate-200 text-slate-500"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {opt.label}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Passenger Type</Label>
                <Select
                  value={form.passengerType}
                  onValueChange={(v) => set("passengerType", v)}
                  options={PASSENGER_TYPE_OPTIONS}
                  disabled={isRebooking}
                />
              </div>
              <div>
                <Label>Transaction</Label>
                <Select value={form.transactionType} onValueChange={(v) => set("transactionType", v)} options={TRANSACTION_TYPE_OPTIONS} />
              </div>
            </div>

            {!isTourist && !isRebooking && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  ID Verification <span className="text-red-500">*</span>
                </p>
                <IdScannerUpload
                  label="Upload or Scan ID"
                  documentType={form.verificationDocumentType}
                  documentTypeOptions={documentOptions}
                  onDocumentTypeChange={(v) => set("verificationDocumentType", v)}
                  imageUrl={form.verificationDocumentUrl}
                  onScanned={handleScanned}
                  onClear={handleClearScan}
                />
              </div>
            )}

            {lowConfidenceFields.length > 0 && (
              <p className="text-[11px] font-medium text-amber-600">
                Fields highlighted in yellow had a low-confidence OCR read — please verify them.
              </p>
            )}
            <div>
              <Label>{isFamily ? "Head of Family — Full Name" : "Full Name"}</Label>
              <Input
                value={form.fullName}
                onChange={(e) => set("fullName", toTitleCase(e.target.value))}
                placeholder="Juan Dela Cruz"
                disabled={isRebooking}
                className={isLowConfidence("fullName") ? LOW_CONFIDENCE_FIELD_CLASS : undefined}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Contact Number</Label>
                <Input
                  value={form.contactNumber}
                  onChange={(e) => set("contactNumber", formatPhonePH(e.target.value))}
                  placeholder="0917-123-4567"
                  disabled={isRebooking}
                />
              </div>
              <div>
                <Label>Gender</Label>
                <Select
                  value={form.gender}
                  onValueChange={(v) => set("gender", v)}
                  options={GENDER_OPTIONS}
                  disabled={isRebooking}
                  className={isLowConfidence("gender") ? LOW_CONFIDENCE_FIELD_CLASS : undefined}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Age</Label>
                <Input
                  type="number"
                  min="0"
                  max="130"
                  value={form.age}
                  onChange={(e) => set("age", e.target.value)}
                  disabled={isRebooking}
                  className={isLowConfidence("age") ? LOW_CONFIDENCE_FIELD_CLASS : undefined}
                />
              </div>
              {isTourist ? (
                <div>
                  <Label>Passport Number</Label>
                  <Input value={form.passportNumber} onChange={(e) => set("passportNumber", e.target.value)} disabled={isRebooking} />
                </div>
              ) : (
                <div>
                  <Label>ID Number</Label>
                  <Input
                    value={form.idNumber}
                    onChange={(e) => set("idNumber", e.target.value)}
                    placeholder="Auto-filled from scan, or enter manually"
                    disabled={isRebooking}
                    className={isLowConfidence("idNumber") ? LOW_CONFIDENCE_FIELD_CLASS : undefined}
                  />
                </div>
              )}
            </div>
            <div>
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Barangay, City/Municipality" disabled={isRebooking} />
            </div>
            <div>
              <Label>Email Address (Optional)</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="passenger@email.com"
                disabled={isRebooking}
              />
            </div>

            <div className="border-t border-slate-100 pt-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {isFamily ? "Head Classification" : "Passenger Classification"}
              </p>
              <PriorityCheckboxes values={form} onChange={(next) => setForm((prev) => ({ ...prev, ...next }))} />
            </div>

            {isFamily && (
              <div className="border-t border-slate-100 pt-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Family Members</p>
                  <Button type="button" variant="outline" size="sm" onClick={addMember}>
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {form.members.map((m, i) => {
                    const isChild = m.age !== "" && Number(m.age) <= 5;
                    return (
                      <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-2">
                        <div className="flex items-center gap-2">
                          <Input
                            className="flex-1"
                            placeholder="Full name"
                            value={m.fullName}
                            onChange={(e) => updateMember(i, { fullName: toTitleCase(e.target.value) })}
                          />
                          <Input
                            className="w-16"
                            type="number"
                            placeholder="Age"
                            value={m.age}
                            onChange={(e) => updateMember(i, { age: e.target.value })}
                          />
                          <Select
                            className="w-24"
                            value={m.gender}
                            onValueChange={(v) => updateMember(i, { gender: v })}
                            options={GENDER_OPTIONS}
                          />
                          {isChild && <Badge variant="active">Minor</Badge>}
                          <button type="button" onClick={() => removeMember(i)} className="text-slate-400 hover:text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <PriorityCheckboxes compact values={m} onChange={(next) => updateMember(i, next)} />
                      </div>
                    );
                  })}
                  {form.members.length === 0 && (
                    <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">
                      Add at least one more traveler.
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Trip Selection</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label>Ship</Label>
                <Select
                  value={form.shipId}
                  onValueChange={(v) => {
                    set("shipId", v);
                    set("scheduleId", null);
                    set("accommodationClass", null);
                  }}
                  options={ships.map((s) => ({ value: s.id, label: s.name }))}
                  placeholder="Select ship"
                />
              </div>
              <div>
                <Label>Schedule</Label>
                <Select
                  value={form.scheduleId}
                  onValueChange={(v) => {
                    set("scheduleId", v);
                    set("accommodationClass", null);
                  }}
                  options={scheduleOptions}
                  placeholder="Select schedule"
                  disabled={!form.shipId}
                />
              </div>
            </div>

            {selectedSchedule && (
              <div>
                <Label>
                  Type of Accommodation / Seat Class <span className="text-red-500">*</span>
                </Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {ACCOMMODATION_CLASSES.map((meta) => {
                    const avail = selectedSchedule.classAvailability?.find((c) => c.className === meta.value);
                    const isFull = !!avail?.isFull;
                    const selected = form.accommodationClass === meta.value;
                    return (
                      <button
                        key={meta.value}
                        type="button"
                        disabled={isFull}
                        onClick={() => set("accommodationClass", meta.value)}
                        className={cn(
                          "flex flex-col items-start gap-0.5 rounded-lg border-2 px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                          selected ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-white hover:border-slate-300"
                        )}
                      >
                        <span className="text-xs font-semibold text-slate-900">{meta.label}</span>
                        <span className="text-[11px] text-slate-500">{meta.subtitle}</span>
                        {avail?.capacity != null && (
                          <span className={cn("text-[11px] font-medium", isFull ? "text-red-600" : "text-slate-500")}>
                            {isFull ? "Full" : `${avail.seatsLeft} of ${avail.capacity} left`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Boarding is first-come, first-served within the chosen class.
                </p>
              </div>
            )}

            {!isFamily && (
              <>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-surface px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-graphite" />
                    <span className="text-sm font-medium text-ink">Travelling with a vehicle?</span>
                  </div>
                  <Switch checked={form.hasVehicle} onCheckedChange={(checked) => set("hasVehicle", checked)} />
                </div>
                {form.hasVehicle && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <Label>Vehicle Type</Label>
                      <Select value={form.vehicleType} onValueChange={(v) => set("vehicleType", v)} options={VEHICLE_TYPE_OPTIONS} placeholder="Select" />
                    </div>
                    <div>
                      <Label>Plate Number</Label>
                      <Input value={form.plateNumber} onChange={(e) => set("plateNumber", e.target.value)} placeholder="ABC-1234" />
                    </div>
                  </div>
                )}
              </>
            )}

            <Button size="lg" className="w-full" disabled={!canSubmit} onClick={handleSubmit}>
              {isSubmitting ? "Processing..." : "Confirm & Log Passenger"}
            </Button>
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  );
}
