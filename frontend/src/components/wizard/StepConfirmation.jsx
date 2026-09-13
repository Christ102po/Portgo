import { useEffect, useState } from "react";
import { ChevronLeft, QrCode } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { apiClient } from "../../lib/apiClient";
import { enqueue } from "../../lib/offlineQueue";
import { isNetworkAvailable } from "../../lib/offlineSimulation";
import { priorityFlags } from "../../lib/priority";
import { useToast } from "../ui/Toast";
import { routeLabel } from "../../lib/route";
import { passengerTypeLabel } from "../../lib/verification";
import { accommodationClassLabel } from "../../lib/accommodationClass";

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 py-2.5 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value || "—"}</span>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-400">
      {children}
    </p>
  );
}

export function StepConfirmation() {
  const { state, dispatch } = useWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ship, setShip] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const { showToast } = useToast();
  const isTourist = state.passengerType === "FOREIGN_TOURIST";

  useEffect(() => {
    if (!state.shipId || !state.scheduleId) return;
    Promise.all([
      apiClient.get("/ships", { params: { all: 1 } }),
      apiClient.get("/schedules", { params: { all: 1 } }),
    ]).then(([shipsRes, schedulesRes]) => {
      setShip(shipsRes.data.ships.find((s) => s.id === state.shipId) || null);
      setSchedule(schedulesRes.data.schedules.find((s) => s.id === state.scheduleId) || null);
    });
  }, [state.shipId, state.scheduleId]);

  function buildPayload() {
    return {
      fullName: state.fullName,
      passengerType: state.passengerType,
      transactionType: state.transactionType,
      shipId: state.shipId,
      scheduleId: state.scheduleId,
      email: state.email || undefined,
      isEmailVerified: state.isEmailVerified || undefined,
      accommodationClass: state.accommodationClass,
      isSeniorCitizen: state.isSeniorCitizen,
      isPWD: state.isPWD,
      isPregnant: state.isPregnant,
      needsWheelchair: state.needsWheelchair,
      isStudent: state.isStudent,
      isInfant: state.isInfant,
      isMedicalEmergency: state.isMedicalEmergency,
      ...(isTourist
        ? {
            passportNumber: state.passportNumber,
            nationality: state.nationality,
            isPassportVerified: state.isPassportVerified,
            isFaceVerified: state.isFaceVerified,
            faceMatchScore: state.faceMatchScore ?? undefined,
            selfiePhotoUrl: state.selfiePhotoUrl,
            contactNumber: state.touristPhone
              ? `${state.touristPhoneCountryCode} ${state.touristPhone}`
              : undefined,
          }
        : {
            contactNumber: state.phone,
            gender: state.gender,
            age: state.age ? Number(state.age) : undefined,
            address: state.address,
            emergencyContactName: state.emergencyContactName || undefined,
            emergencyContactPhone: state.emergencyContactPhone || undefined,
            idNumber: state.idNumber || undefined,
            // A Barangay Resident Masterlist match counts as Barangay
            // Clearance verification even though nothing was scanned.
            verificationDocumentType: state.isBarangayVerified
              ? "BARANGAY_CLEARANCE"
              : state.verificationDocumentType || undefined,
            verificationDocumentUrl: state.verificationDocumentUrl || undefined,
            isDocumentVerified: state.isBarangayVerified || state.isDocumentVerified,
          }),
    };
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    const payload = buildPayload();

    if (!isNetworkAvailable()) {
      const record = enqueue("/passengers", payload);
      dispatch({
        type: "SET_RESULT",
        result: { offline: true, localId: record.localId, passenger: payload, ship: null, schedule: null },
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await apiClient.post("/passengers", payload);
      dispatch({ type: "SET_RESULT", result: res.data });
    } catch (err) {
      if (!err.response) {
        // Network-level failure (request never reached the server) — fall back to offline queue.
        const record = enqueue("/passengers", payload);
        dispatch({
          type: "SET_RESULT",
          result: { offline: true, localId: record.localId, passenger: payload, ship: null, schedule: null },
        });
        return;
      }
      if (err.response?.status === 409 && err.response?.data?.code === "DUPLICATE_REGISTRATION") {
        showToast({
          title: "Duplicate Registration Detected",
          description:
            err.response?.data?.message ||
            "You already have an active pass for today's travel date. Use 'Find My Pass' to retrieve your QR code.",
          variant: "error",
        });
        return;
      }
      if (err.response?.status === 409) {
        showToast({
          title: "This schedule just filled up",
          description: err.response?.data?.message || "Please choose another schedule to continue.",
          variant: "error",
        });
        dispatch({ type: "SET_FIELD", field: "scheduleId", value: null });
        dispatch({ type: "GOTO_STEP", step: 5 });
        return;
      }
      showToast({
        title: "Submission failed",
        description: err.response?.data?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const category = state.isStudent
    ? "Student"
    : state.isSeniorCitizen
    ? "Senior Citizen"
    : state.isPWD
    ? "PWD"
    : "Regular";
  const specialAssistance = priorityFlags(state).filter((f) => ["Pregnant", "Wheelchair", "Infant"].includes(f));

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold text-slate-900">
        Review &amp; Confirm
      </h2>
      <p className="mb-6 text-center text-sm text-slate-500">
        Please double-check your details before submitting.
      </p>

      <Card className="mx-auto max-w-4xl border-slate-200/80 shadow-sm">
        <CardContent className="pt-6">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-4">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Summary
            </span>
            <Badge variant="graphite">
              {passengerTypeLabel(state.passengerType)} · {state.transactionType === "SIGN_IN" ? "Outbound · Departing" : "Inbound · Arriving"}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-x-10 gap-y-1 lg:grid-cols-2 lg:divide-x lg:divide-slate-100">
            {/* Left column: Passenger Details */}
            <div>
              <SectionLabel>Passenger Details</SectionLabel>
              <Row label="Full Name" value={state.fullName} />
              {state.email && <Row label="Email" value={state.email} />}

              {isTourist ? (
                <>
                  <Row label="Nationality" value={state.nationality} />
                  <Row label="Passport Number" value={state.passportNumber} />
                  <Row label="Passport Verified" value={state.isPassportVerified ? "Yes" : "No"} />
                  {state.touristPhone && (
                    <Row label="Contact Number" value={`${state.touristPhoneCountryCode} ${state.touristPhone}`} />
                  )}
                  <Row
                    label="Face Match Score"
                    value={state.faceMatchScore != null ? `${state.faceMatchScore.toFixed(1)}%` : "—"}
                  />
                </>
              ) : (
                <>
                  <Row label="Contact Number" value={state.phone} />
                  <Row label="Gender" value={state.gender} />
                  <Row label="Age" value={state.age} />
                  <Row label="Address" value={state.address} />
                  <Row label="ID Document Verified" value={state.isDocumentVerified ? "Yes" : "No — review manually"} />
                  {state.emergencyContactName && (
                    <Row
                      label="Emergency Contact"
                      value={`${state.emergencyContactName}${state.emergencyContactPhone ? ` (${state.emergencyContactPhone})` : ""}`}
                    />
                  )}
                </>
              )}
              {!isTourist && <Row label="Passenger Category" value={category} />}
              {specialAssistance.length > 0 && (
                <Row label="Special Assistance" value={specialAssistance.join(", ")} />
              )}
            </div>

            {/* Right column: Trip / Vessel Details */}
            <div className="lg:pl-10">
              <SectionLabel>Trip / Vessel Details</SectionLabel>
              <Row label="Vessel" value={ship?.name} />
              <Row label="Route" value={schedule ? routeLabel(schedule.route) : null} />
              <Row label="Departure Time" value={schedule?.departureTime} />
              <Row label="Accommodation Class" value={accommodationClassLabel(state.accommodationClass)} />

              <div className="mt-4 flex items-center gap-2 rounded-xl border-2 border-emerald-200 bg-emerald-50 px-3.5 py-2.5">
                <QrCode className="h-5 w-5 shrink-0 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  A scannable Digital Pass will be generated on submit
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          size="lg"
          disabled={isSubmitting}
          onClick={() => dispatch({ type: "PREV_STEP" })}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="kiosk" size="lg" className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl" disabled={isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? "Generating..." : "Generate Digital Pass"}
        </Button>
      </div>
    </div>
  );
}
