import { useEffect, useRef, useState } from "react";
import { BadgeCheck, ChevronLeft, Phone, Plus, Trash2, UsersRound, XCircle } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { PriorityCheckboxes } from "./PriorityCheckboxes";
import { PriorityTags } from "../PriorityTags";
import { OtpModal } from "./OtpModal";
import { apiClient } from "../../lib/apiClient";
import { useToast } from "../ui/Toast";
import { priorityFlags } from "../../lib/priority";
import { toTitleCase, formatPhonePH, isValidPhonePH, phoneDigits } from "../../lib/format";
import { hasPhMobileFormat, isValidPhMobilePrefix, INVALID_PH_PREFIX_MESSAGE } from "../../lib/phPrefixes";

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
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
};

export function StepGroupMembers() {
  const { state, dispatch } = useWizard();
  const [isSending, setIsSending] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [codeSent, setCodeSent] = useState(false);
  const lastAutoPhoneRef = useRef("");
  const { showToast } = useToast();
  const isTourist = state.passengerType === "FOREIGN_TOURIST";

  const digits = phoneDigits(state.phone);
  const hasBasicFormat = hasPhMobileFormat(digits);
  const hasInvalidPrefix = hasBasicFormat && !isValidPhMobilePrefix(digits);
  const phoneIsValid = isValidPhonePH(state.phone);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((current) => Math.max(0, current - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  function setField(field, value) {
    dispatch({ type: "SET_FIELD", field, value });
  }

  function updateMember(index, patch) {
    const next = state.groupMembers.map((m, i) => (i === index ? { ...m, ...patch } : m));
    setField("groupMembers", next);
  }

  function addMember() {
    setField("groupMembers", [...state.groupMembers, { ...EMPTY_MEMBER }]);
  }

  function removeMember(index) {
    setField(
      "groupMembers",
      state.groupMembers.filter((_, i) => i !== index)
    );
  }

  async function handleSendCode() {
    if (!phoneIsValid || cooldown > 0 || isSending) return;
    setIsSending(true);
    try {
      const res = await apiClient.post("/otp/send", { phone: state.phone });
      setCodeSent(true);
      setModalOpen(true);
      setCooldown(60);
      showToast({
        title: "Code sent",
        description: res.data.message || "Check the primary contact's phone for the verification code.",
        variant: "info",
      });
    } catch (err) {
      setCodeSent(false);
      const fieldMessage = err.response?.data?.details?.fieldErrors?.phone?.[0];
      showToast({
        title: "Failed to send code",
        description: fieldMessage || err.response?.data?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setIsSending(false);
    }
  }

  // Automatically send the OTP once a complete valid PH mobile number is entered.
  // This replaces the old Send OTP button and is guarded so a render cannot
  // trigger duplicate SMS messages.
  useEffect(() => {
    const normalized = phoneDigits(state.phone);

    if (!phoneIsValid) {
      lastAutoPhoneRef.current = "";
      setCodeSent(false);
      return;
    }
    if (state.isPhoneVerified || isSending || cooldown > 0) return;
    if (lastAutoPhoneRef.current === normalized) return;

    const timer = window.setTimeout(() => {
      lastAutoPhoneRef.current = normalized;
      handleSendCode();
    }, 450);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phone, phoneIsValid, state.isPhoneVerified, isSending, cooldown]);

  const headValid =
    state.fullName.trim() &&
    phoneIsValid &&
    state.isPhoneVerified &&
    state.groupPhoneVerificationToken &&
    state.gender &&
    state.address.trim() &&
    (!isTourist || state.passportNumber.trim());
  const membersValid =
    state.groupMembers.length >= 1 && state.groupMembers.every((m) => m.fullName.trim() && m.age !== "");
  const canContinue = headValid && membersValid;

  return (
    <div>
      <h2 className="section-title">Group / Dependents</h2>
      <p className="mb-6 text-center text-sm text-slate-500 sm:mb-8">
        Enter the primary contact&apos;s details, verify their phone by SMS, then add each traveler in the group.
      </p>

      <Card className="mx-auto max-w-2xl overflow-hidden border-emerald-100 shadow-[0_22px_50px_-32px_rgba(6,78,59,0.65)]">
        <div className="bg-gradient-to-r from-emerald-700 to-green-600 px-5 py-5 text-white sm:px-6"><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-100">Group registration</p><p className="mt-1 text-lg font-black">Primary contact & travelers</p></div>
        <CardContent className="space-y-4 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Primary Contact / Head of Group
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <Label htmlFor="groupHeadName">Full Name</Label>
              <Input
                id="groupHeadName"
                placeholder="Juan Dela Cruz"
                value={state.fullName}
                onChange={(e) => setField("fullName", toTitleCase(e.target.value))}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="groupHeadContact">Contact Number</Label>
              <div className="relative min-w-0">
                <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-600" />
                <Input
                  id="groupHeadContact"
                  className="h-14 rounded-2xl border-emerald-100 bg-emerald-50/45 pl-10 text-base font-bold tracking-wide focus:border-emerald-500 focus:bg-white"
                  placeholder="0917-123-4567"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={13}
                  value={state.phone}
                  onChange={(e) => setField("phone", formatPhonePH(e.target.value))}
                />
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">
                OTP sends automatically as soon as the contact number is complete and valid.
              </p>

              {state.phone && !phoneIsValid && hasInvalidPrefix && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border-2 border-red-200 bg-red-50 px-3 py-2">
                  <XCircle className="h-4 w-4 shrink-0 text-red-600" />
                  <p className="text-xs font-semibold text-red-700">{INVALID_PH_PREFIX_MESSAGE}</p>
                </div>
              )}
              {state.phone && !phoneIsValid && !hasInvalidPrefix && (
                <p className="mt-2 text-xs text-red-600">Enter a valid PH mobile number (e.g. 0917-123-4567)</p>
              )}
              {isSending && (
                <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-semibold text-emerald-800">
                  <Phone className="h-4 w-4 animate-pulse" />
                  Number complete — sending the OTP automatically...
                </div>
              )}
              {!isSending && codeSent && !state.isPhoneVerified && (
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="mt-2 flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-3 text-left text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-100"
                >
                  <span>Code sent to {state.phone}. Tap to enter the OTP.</span>
                  <span className="text-xs text-emerald-600">Open</span>
                </button>
              )}
              {state.isPhoneVerified && state.groupPhoneVerificationToken && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700 ring-1 ring-emerald-200">
                  <BadgeCheck className="h-4 w-4" />
                  Primary contact phone verified by SMS.
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="groupHeadAge">Age (Optional)</Label>
              <Input
                id="groupHeadAge"
                type="number"
                min="0"
                max="130"
                value={state.age}
                onChange={(e) => setField("age", e.target.value)}
              />
            </div>
            <div>
              <Label>Gender</Label>
              <Select
                value={state.gender}
                onValueChange={(v) => setField("gender", v)}
                options={GENDER_OPTIONS}
                placeholder="Select gender"
              />
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="groupHeadEmail">Email Address (Optional)</Label>
              <Input
                id="groupHeadEmail"
                type="email"
                value={state.email}
                onChange={(e) => setField("email", e.target.value)}
              />
            </div>
            {isTourist && (
              <div className="md:col-span-2">
                <Label htmlFor="groupHeadPassport">Passport Number</Label>
                <Input
                  id="groupHeadPassport"
                  value={state.passportNumber}
                  onChange={(e) => setField("passportNumber", e.target.value.toUpperCase())}
                />
              </div>
            )}
            <div className="md:col-span-2">
              <Label htmlFor="groupHeadAddress">Address</Label>
              <Input
                id="groupHeadAddress"
                placeholder="Barangay, City/Municipality"
                value={state.address}
                onChange={(e) => setField("address", e.target.value)}
              />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Head Classification (Optional)
            </p>
            <PriorityCheckboxes
              theme="light"
              values={state}
              onChange={(next) => dispatch({ type: "SET_FIELDS", fields: next })}
            />
            {priorityFlags(state).length > 0 && (
              <div className="mt-2">
                <PriorityTags flags={priorityFlags(state)} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="flex min-w-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <UsersRound className="h-3.5 w-3.5 shrink-0" />
                Additional Travelers
              </p>
              <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={addMember}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            <div className="space-y-3">
              {state.groupMembers.map((m, i) => {
                const isChild = m.age !== "" && Number(m.age) <= 5;
                return (
                  <div key={i} className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_80px_140px_auto] sm:items-center">
                      <Input
                        className="min-w-0"
                        placeholder="Full name"
                        value={m.fullName}
                        onChange={(e) => updateMember(i, { fullName: toTitleCase(e.target.value) })}
                      />
                      <Input
                        type="number"
                        min="0"
                        max="130"
                        placeholder="Age"
                        value={m.age}
                        onChange={(e) => updateMember(i, { age: e.target.value })}
                      />
                      <Select
                        value={m.gender}
                        onValueChange={(v) => updateMember(i, { gender: v })}
                        options={GENDER_OPTIONS}
                      />
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        {isChild && <Badge variant="active">Minor</Badge>}
                        <button
                          type="button"
                          onClick={() => removeMember(i)}
                          className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                          aria-label={`Remove traveler ${i + 1}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <PriorityCheckboxes theme="light" compact values={m} onChange={(next) => updateMember(i, next)} />
                    {priorityFlags(m).length > 0 && <PriorityTags flags={priorityFlags(m)} />}
                  </div>
                );
              })}
              {state.groupMembers.length === 0 && (
                <p className="rounded-lg border border-dashed border-slate-200 px-3 py-3 text-center text-xs text-slate-400">
                  Add at least one more traveler to register as a group.
                </p>
              )}
            </div>
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
          className="h-auto w-full rounded-xl px-8 py-3.5 sm:w-auto"
          disabled={!canContinue}
          onClick={() => dispatch({ type: "NEXT_STEP" })}
        >
          Continue
        </Button>
      </div>

      <OtpModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        phone={state.phone}
        defaultEmail={state.email}
        cooldown={cooldown}
        onResend={handleSendCode}
        allowEmailFallback={false}
        onVerified={({ verificationToken } = {}) => {
          setCodeSent(false);
          dispatch({
            type: "SET_FIELDS",
            fields: {
              isPhoneVerified: true,
              groupPhoneVerificationToken: verificationToken || "",
            },
          });
        }}
      />
    </div>
  );
}
