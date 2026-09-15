import { useEffect, useMemo, useState } from "react";
import {
  ShieldQuestion,
  PhoneCall,
  Plus,
  Pencil,
  Trash2,
  Save,
  X,
  Ban,
  HeartHandshake,
  ListChecks,
} from "lucide-react";
import { apiClient } from "../../lib/apiClient";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Label } from "../../components/ui/Label";
import { Select } from "../../components/ui/Select";
import { Switch } from "../../components/ui/Switch";
import { Badge } from "../../components/ui/Badge";
import { Skeleton } from "../../components/ui/Skeleton";
import { useToast } from "../../components/ui/Toast";

const SECTION_OPTIONS = [
  { value: "PASSENGER_REMINDERS", label: "Passenger Reminders" },
  { value: "PROHIBITED_ITEMS", label: "Prohibited Items" },
  { value: "PRIORITY_ASSISTANCE", label: "Priority Lane & Assistance" },
];

const SECTION_META = {
  PASSENGER_REMINDERS: { label: "Passenger Reminders", icon: ListChecks, accent: "text-emerald-700" },
  PROHIBITED_ITEMS: { label: "Prohibited Items", icon: Ban, accent: "text-red-600" },
  PRIORITY_ASSISTANCE: { label: "Priority Lane & Assistance", icon: HeartHandshake, accent: "text-teal-700" },
};

const emptyGuideline = { section: "PASSENGER_REMINDERS", text: "", sortOrder: 0, active: true };
const emptyHotline = { label: "", number: "", sortOrder: 0, active: true };

function FieldShell({ label, children }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-2 h-4 w-2/3" />
    </div>
  );
}

export default function PortInformationPage() {
  const [guidelines, setGuidelines] = useState([]);
  const [hotlines, setHotlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [guidelineForm, setGuidelineForm] = useState(emptyGuideline);
  const [hotlineForm, setHotlineForm] = useState(emptyHotline);
  const [editingGuideline, setEditingGuideline] = useState(null);
  const [editingHotline, setEditingHotline] = useState(null);
  const { showToast } = useToast();

  async function load() {
    setLoading(true);
    try {
      const res = await apiClient.get("/port-information");
      setGuidelines(res.data.guidelines || []);
      setHotlines(res.data.hotlines || []);
    } catch (err) {
      showToast({
        title: "Unable to load port information",
        description: err.response?.data?.message || "Please try again.",
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const groupedGuidelines = useMemo(() => {
    const groups = Object.fromEntries(SECTION_OPTIONS.map((option) => [option.value, []]));
    guidelines.forEach((item) => {
      if (!groups[item.section]) groups[item.section] = [];
      groups[item.section].push(item);
    });
    return groups;
  }, [guidelines]);

  async function createGuideline(e) {
    e.preventDefault();
    if (!guidelineForm.text.trim()) return;
    setSaving(true);
    try {
      await apiClient.post("/port-information/guidelines", {
        ...guidelineForm,
        text: guidelineForm.text.trim(),
        sortOrder: Number(guidelineForm.sortOrder) || 0,
      });
      setGuidelineForm(emptyGuideline);
      showToast({ title: "Guideline published", variant: "success" });
      await load();
    } catch (err) {
      showToast({ title: "Unable to add guideline", description: err.response?.data?.message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveGuideline(item) {
    setSaving(true);
    try {
      await apiClient.put(`/port-information/guidelines/${item.id}`, {
        section: item.section,
        text: item.text.trim(),
        sortOrder: Number(item.sortOrder) || 0,
        active: !!item.active,
      });
      setEditingGuideline(null);
      showToast({ title: "Guideline updated", variant: "success" });
      await load();
    } catch (err) {
      showToast({ title: "Unable to update guideline", description: err.response?.data?.message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleGuideline(item) {
    try {
      await apiClient.put(`/port-information/guidelines/${item.id}`, { active: !item.active });
      showToast({ title: item.active ? "Guideline hidden from kiosk" : "Guideline published", variant: "success" });
      await load();
    } catch (err) {
      showToast({ title: "Unable to change guideline status", description: err.response?.data?.message, variant: "error" });
    }
  }

  async function deleteGuideline(item) {
    if (!window.confirm("Delete this guideline permanently?")) return;
    try {
      await apiClient.delete(`/port-information/guidelines/${item.id}`);
      showToast({ title: "Guideline deleted", variant: "info" });
      await load();
    } catch (err) {
      showToast({ title: "Unable to delete guideline", description: err.response?.data?.message, variant: "error" });
    }
  }

  async function createHotline(e) {
    e.preventDefault();
    if (!hotlineForm.label.trim() || !hotlineForm.number.trim()) return;
    setSaving(true);
    try {
      await apiClient.post("/port-information/hotlines", {
        ...hotlineForm,
        label: hotlineForm.label.trim(),
        number: hotlineForm.number.trim(),
        sortOrder: Number(hotlineForm.sortOrder) || 0,
      });
      setHotlineForm(emptyHotline);
      showToast({ title: "Emergency hotline published", variant: "success" });
      await load();
    } catch (err) {
      showToast({ title: "Unable to add hotline", description: err.response?.data?.message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function saveHotline(item) {
    setSaving(true);
    try {
      await apiClient.put(`/port-information/hotlines/${item.id}`, {
        label: item.label.trim(),
        number: item.number.trim(),
        sortOrder: Number(item.sortOrder) || 0,
        active: !!item.active,
      });
      setEditingHotline(null);
      showToast({ title: "Emergency hotline updated", variant: "success" });
      await load();
    } catch (err) {
      showToast({ title: "Unable to update hotline", description: err.response?.data?.message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function toggleHotline(item) {
    try {
      await apiClient.put(`/port-information/hotlines/${item.id}`, { active: !item.active });
      showToast({ title: item.active ? "Hotline hidden from kiosk" : "Hotline published", variant: "success" });
      await load();
    } catch (err) {
      showToast({ title: "Unable to change hotline status", description: err.response?.data?.message, variant: "error" });
    }
  }

  async function deleteHotline(item) {
    if (!window.confirm("Delete this emergency hotline permanently?")) return;
    try {
      await apiClient.delete(`/port-information/hotlines/${item.id}`);
      showToast({ title: "Emergency hotline deleted", variant: "info" });
      await load();
    } catch (err) {
      showToast({ title: "Unable to delete hotline", description: err.response?.data?.message, variant: "error" });
    }
  }

  return (
    <div className="space-y-6">
      <header>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
            <ShieldQuestion className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-graphite">Port Guidelines & Emergency Hotlines</h1>
            <p className="mt-1 text-sm text-slate-500">
              Control the safety information shown to passengers on the PORTGO kiosk. Only active items are displayed.
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)]">
        <section className="space-y-5">
          <form onSubmit={createGuideline} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-emerald-700" />
              <h2 className="font-bold text-graphite">Add Port Guideline</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)_100px]">
              <FieldShell label="Section">
                <Select
                  value={guidelineForm.section}
                  onValueChange={(section) => setGuidelineForm((v) => ({ ...v, section }))}
                  options={SECTION_OPTIONS}
                />
              </FieldShell>
              <FieldShell label="Guideline / Safety Rule">
                <textarea
                  value={guidelineForm.text}
                  onChange={(e) => setGuidelineForm((v) => ({ ...v, text: e.target.value }))}
                  rows={3}
                  required
                  placeholder="Enter the passenger reminder or safety rule..."
                  className="w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10"
                />
              </FieldShell>
              <FieldShell label="Order">
                <Input
                  type="number"
                  min="0"
                  value={guidelineForm.sortOrder}
                  onChange={(e) => setGuidelineForm((v) => ({ ...v, sortOrder: e.target.value }))}
                />
              </FieldShell>
            </div>
            <div className="mt-4 flex justify-end">
              <Button type="submit" disabled={saving || !guidelineForm.text.trim()}>
                <Plus className="h-4 w-4" /> Add Guideline
              </Button>
            </div>
          </form>

          {loading ? (
            <div className="grid gap-3"><LoadingCard /><LoadingCard /><LoadingCard /></div>
          ) : (
            SECTION_OPTIONS.map((section) => {
              const meta = SECTION_META[section.value];
              const Icon = meta.icon;
              const items = groupedGuidelines[section.value] || [];
              return (
                <div key={section.value} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${meta.accent}`} />
                    <h2 className="font-bold text-graphite">{meta.label}</h2>
                    <Badge variant="neutral">{items.length}</Badge>
                  </div>
                  <div className="space-y-3">
                    {items.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                        No items in this section yet.
                      </div>
                    )}
                    {items.map((item) => {
                      const editing = editingGuideline?.id === item.id;
                      const draft = editing ? editingGuideline : item;
                      return (
                        <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                          {editing ? (
                            <div className="space-y-3">
                              <Select
                                value={draft.section}
                                onValueChange={(sectionValue) => setEditingGuideline((v) => ({ ...v, section: sectionValue }))}
                                options={SECTION_OPTIONS}
                              />
                              <textarea
                                value={draft.text}
                                onChange={(e) => setEditingGuideline((v) => ({ ...v, text: e.target.value }))}
                                rows={3}
                                className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                              />
                              <div className="flex flex-wrap items-center gap-3">
                                <Input
                                  type="number"
                                  min="0"
                                  value={draft.sortOrder}
                                  onChange={(e) => setEditingGuideline((v) => ({ ...v, sortOrder: e.target.value }))}
                                  className="w-28"
                                />
                                <label className="flex items-center gap-2 text-sm text-slate-600">
                                  <Switch checked={draft.active} onCheckedChange={(active) => setEditingGuideline((v) => ({ ...v, active }))} />
                                  Published
                                </label>
                                <div className="ml-auto flex gap-2">
                                  <Button type="button" variant="outline" size="sm" onClick={() => setEditingGuideline(null)}>
                                    <X className="h-4 w-4" /> Cancel
                                  </Button>
                                  <Button type="button" size="sm" disabled={saving || !draft.text.trim()} onClick={() => saveGuideline(draft)}>
                                    <Save className="h-4 w-4" /> Save
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  <Badge variant={item.active ? "active" : "neutral"}>{item.active ? "Published" : "Hidden"}</Badge>
                                  <span className="text-xs text-slate-400">Order {item.sortOrder}</span>
                                </div>
                                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.text}</p>
                              </div>
                              <div className="flex shrink-0 gap-2">
                                <Button variant="outline" size="sm" onClick={() => toggleGuideline(item)}>
                                  {item.active ? "Hide" : "Publish"}
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setEditingGuideline({ ...item })} title="Edit">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => deleteGuideline(item)} title="Delete">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </section>

        <section className="space-y-5">
          <form onSubmit={createHotline} className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-red-600" />
              <h2 className="font-bold text-graphite">Add Emergency Hotline</h2>
            </div>
            <div className="space-y-4">
              <FieldShell label="Agency / Hotline Name">
                <Input
                  value={hotlineForm.label}
                  onChange={(e) => setHotlineForm((v) => ({ ...v, label: e.target.value }))}
                  placeholder="e.g. Philippine Coast Guard"
                  required
                />
              </FieldShell>
              <FieldShell label="Contact Number">
                <Input
                  value={hotlineForm.number}
                  onChange={(e) => setHotlineForm((v) => ({ ...v, number: e.target.value }))}
                  placeholder="e.g. 0917 123 4567"
                  required
                />
              </FieldShell>
              <div className="grid grid-cols-[110px_1fr] items-end gap-3">
                <FieldShell label="Order">
                  <Input
                    type="number"
                    min="0"
                    value={hotlineForm.sortOrder}
                    onChange={(e) => setHotlineForm((v) => ({ ...v, sortOrder: e.target.value }))}
                  />
                </FieldShell>
                <Button type="submit" disabled={saving || !hotlineForm.label.trim() || !hotlineForm.number.trim()}>
                  <Plus className="h-4 w-4" /> Add Hotline
                </Button>
              </div>
            </div>
          </form>

          <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <PhoneCall className="h-4 w-4 text-red-600" />
                <h2 className="font-bold text-graphite">Emergency Hotlines</h2>
              </div>
              <Badge variant="neutral">{hotlines.length}</Badge>
            </div>
            <div className="space-y-3">
              {loading && <><LoadingCard /><LoadingCard /></>}
              {!loading && hotlines.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-400">
                  No emergency hotlines published yet.
                </div>
              )}
              {!loading && hotlines.map((item) => {
                const editing = editingHotline?.id === item.id;
                const draft = editing ? editingHotline : item;
                return (
                  <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                    {editing ? (
                      <div className="space-y-3">
                        <Input value={draft.label} onChange={(e) => setEditingHotline((v) => ({ ...v, label: e.target.value }))} />
                        <Input value={draft.number} onChange={(e) => setEditingHotline((v) => ({ ...v, number: e.target.value }))} />
                        <div className="flex flex-wrap items-center gap-3">
                          <Input
                            type="number"
                            min="0"
                            value={draft.sortOrder}
                            onChange={(e) => setEditingHotline((v) => ({ ...v, sortOrder: e.target.value }))}
                            className="w-24"
                          />
                          <label className="flex items-center gap-2 text-sm text-slate-600">
                            <Switch checked={draft.active} onCheckedChange={(active) => setEditingHotline((v) => ({ ...v, active }))} />
                            Published
                          </label>
                          <div className="ml-auto flex gap-2">
                            <Button variant="outline" size="sm" type="button" onClick={() => setEditingHotline(null)}><X className="h-4 w-4" /></Button>
                            <Button size="sm" type="button" disabled={saving || !draft.label.trim() || !draft.number.trim()} onClick={() => saveHotline(draft)}><Save className="h-4 w-4" /></Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-slate-800">{item.label}</p>
                              <Badge variant={item.active ? "active" : "neutral"}>{item.active ? "Published" : "Hidden"}</Badge>
                            </div>
                            <p className="mt-1 font-mono text-base font-bold text-emerald-800">{item.number}</p>
                            <p className="mt-1 text-xs text-slate-400">Order {item.sortOrder}</p>
                          </div>
                          <div className="flex shrink-0 gap-1.5">
                            <Button variant="outline" size="sm" onClick={() => setEditingHotline({ ...item })}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => deleteHotline(item)}><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleHotline(item)}
                          className="mt-3 text-xs font-semibold text-slate-500 hover:text-emerald-700"
                        >
                          {item.active ? "Hide from kiosk" : "Publish on kiosk"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
