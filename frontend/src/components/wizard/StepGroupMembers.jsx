import { ChevronLeft, Plus, Trash2, UsersRound } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { PriorityCheckboxes } from "./PriorityCheckboxes";
import { PriorityTags } from "../PriorityTags";
import { priorityFlags } from "../../lib/priority";
import { toTitleCase, formatPhonePH } from "../../lib/format";

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
  const isTourist = state.passengerType === "FOREIGN_TOURIST";

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

  const headValid =
    state.fullName.trim() &&
    state.phone.trim() &&
    state.gender &&
    state.address.trim() &&
    (!isTourist || state.passportNumber.trim());
  const membersValid =
    state.groupMembers.length >= 1 && state.groupMembers.every((m) => m.fullName.trim() && m.age !== "");
  const canContinue = headValid && membersValid;

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold text-slate-900">Group / Dependents</h2>
      <p className="mb-8 text-center text-sm text-slate-500">
        Enter the primary contact&apos;s details, then add each traveler in your group.
      </p>

      <Card className="mx-auto max-w-xl border-slate-200/80 shadow-sm">
        <CardContent className="space-y-4 pt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Primary Contact / Head of Group
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="groupHeadName">Full Name</Label>
              <Input
                id="groupHeadName"
                placeholder="Juan Dela Cruz"
                value={state.fullName}
                onChange={(e) => setField("fullName", toTitleCase(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="groupHeadContact">Contact Number</Label>
              <Input
                id="groupHeadContact"
                placeholder="0917-123-4567"
                inputMode="numeric"
                maxLength={13}
                value={state.phone}
                onChange={(e) => setField("phone", formatPhonePH(e.target.value))}
              />
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
            <div>
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
            <PriorityCheckboxes theme="light" values={state} onChange={(next) => dispatch({ type: "SET_FIELDS", fields: next })} />
            {priorityFlags(state).length > 0 && (
              <div className="mt-2">
                <PriorityTags flags={priorityFlags(state)} />
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <UsersRound className="h-3.5 w-3.5" />
                Additional Travelers
              </p>
              <Button type="button" variant="outline" size="sm" onClick={addMember}>
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </div>
            <div className="space-y-2">
              {state.groupMembers.map((m, i) => {
                const isChild = m.age !== "" && Number(m.age) <= 5;
                return (
                  <div key={i} className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
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
                      <button
                        type="button"
                        onClick={() => removeMember(i)}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
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

      <div className="mt-8 flex justify-between">
        <Button variant="outline" size="lg" onClick={() => dispatch({ type: "PREV_STEP" })}>
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="kiosk" size="lg" className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl" disabled={!canContinue} onClick={() => dispatch({ type: "NEXT_STEP" })}>
          Continue
        </Button>
      </div>
    </div>
  );
}
