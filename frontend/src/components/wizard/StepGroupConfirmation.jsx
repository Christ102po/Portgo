import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { apiClient } from "../../lib/apiClient";
import { priorityFlags } from "../../lib/priority";
import { useToast } from "../ui/Toast";
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

function memberPayload(m) {
  return {
    fullName: m.fullName,
    age: m.age ? Number(m.age) : undefined,
    gender: m.gender,
    isSeniorCitizen: m.isSeniorCitizen,
    isPWD: m.isPWD,
    isPregnant: m.isPregnant,
    needsWheelchair: m.needsWheelchair,
    isStudent: m.isStudent,
    isInfant: m.isInfant,
  };
}

export function StepGroupConfirmation() {
  const { state, dispatch } = useWizard();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast } = useToast();
  const isTourist = state.passengerType === "FOREIGN_TOURIST";
  const allMembers = [{ fullName: state.fullName, age: state.age, gender: state.gender, ...state }, ...state.groupMembers];

  function buildPayload() {
    return {
      headContact: state.phone,
      phoneVerificationToken: state.groupPhoneVerificationToken,
      headEmail: state.email || undefined,
      gender: state.gender,
      address: state.address,
      passengerType: state.passengerType,
      passportNumber: isTourist ? state.passportNumber : undefined,
      idNumber: !isTourist ? state.idNumber || undefined : undefined,
      verificationDocumentType: state.verificationDocumentType || undefined,
      verificationDocumentUrl: state.verificationDocumentUrl || undefined,
      transactionType: state.transactionType,
      shipId: state.shipId,
      scheduleId: state.scheduleId,
      accommodationClass: state.accommodationClass,
      members: [
        memberPayload({
          fullName: state.fullName,
          age: state.age,
          gender: state.gender,
          isSeniorCitizen: state.isSeniorCitizen,
          isPWD: state.isPWD,
          isPregnant: state.isPregnant,
          needsWheelchair: state.needsWheelchair,
          isStudent: state.isStudent,
          isInfant: state.isInfant,
        }),
        ...state.groupMembers.map(memberPayload),
      ],
    };
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    const payload = buildPayload();

    if (!navigator.onLine) {
      showToast({
        title: "Internet connection required",
        description: "Group registration uses SMS OTP verification and must be submitted while online.",
        variant: "error",
      });
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await apiClient.post("/family-bookings", payload);
      dispatch({ type: "SET_RESULT", result: { ...res.data, isFamily: true } });
    } catch (err) {
      if (!err.response) {
        showToast({
          title: "Connection lost",
          description: "Reconnect to the internet and submit the group again while the phone verification is still valid.",
          variant: "error",
        });
        return;
      }
      if (err.response?.status === 401 && err.response?.data?.code === "PHONE_VERIFICATION_REQUIRED") {
        dispatch({
          type: "SET_FIELDS",
          fields: { isPhoneVerified: false, groupPhoneVerificationToken: "" },
        });
        showToast({
          title: "Phone verification required",
          description: err.response?.data?.message || "Please verify the primary contact number again.",
          variant: "error",
        });
        dispatch({ type: "GOTO_STEP", step: 3 });
        return;
      }
      if (err.response?.status === 409) {
        showToast({
          title: "Not enough seats for your group",
          description: err.response?.data?.message || "Please choose another schedule to continue.",
          variant: "error",
        });
        dispatch({ type: "SET_FIELD", field: "scheduleId", value: null });
        dispatch({ type: "GOTO_STEP", step: 4 });
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

  return (
    <div>
      <h2 className="section-title">Review &amp; Confirm Group</h2>
      <p className="mb-8 text-center text-sm text-slate-500">
        Please double-check your group&apos;s details before submitting.
      </p>

      <Card className="mx-auto max-w-2xl overflow-hidden border-emerald-100 shadow-[0_22px_50px_-32px_rgba(6,78,59,0.65)]">
        <div className="bg-gradient-to-r from-emerald-700 to-green-600 px-5 py-5 text-white sm:px-6">
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-100">Group ticket details</p>
          <p className="mt-1 text-lg font-black">Travelers & trip summary</p>
        </div>
        <CardContent className="pt-6">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Group Summary</span>
            <Badge variant="graphite">
              {passengerTypeLabel(state.passengerType)} &middot; {state.transactionType === "SIGN_IN" ? "Outbound · Departing" : "Inbound · Arriving"}
            </Badge>
          </div>
          <Row label="Primary Contact" value={state.fullName} />
          <Row label="Contact Number" value={state.phone} />
          <Row label="Address" value={state.address} />
          <Row label="Total Travelers" value={String(1 + state.groupMembers.length)} />
          {state.accommodationClass && (
            <Row label="Accommodation Class" value={accommodationClassLabel(state.accommodationClass)} />
          )}

          <div className="mt-3 border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Travelers</p>
            <div className="space-y-1.5">
              {allMembers.map((m, i) => {
                const flags = priorityFlags(m);
                return (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-900">
                      {m.fullName || "—"}
                      {m.age ? ` (${m.age})` : ""}
                      {i === 0 && <span className="ml-1.5 text-xs text-slate-400">Head</span>}
                    </span>
                    {flags.length > 0 && <span className="text-xs text-amber-600">{flags.join(", ")}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="mobile-action-bar">
        <Button
          variant="outline"
          size="lg"
          disabled={isSubmitting}
          onClick={() => dispatch({ type: "PREV_STEP" })}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button
          variant="kiosk"
          size="lg"
          className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl"
          disabled={isSubmitting}
          onClick={handleSubmit}
        >
          {isSubmitting ? "Submitting..." : "Confirm & Register Group"}
        </Button>
      </div>
    </div>
  );
}
