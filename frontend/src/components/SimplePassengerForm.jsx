import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Anchor, CheckCircle2, Download, Ship, UserRound } from "lucide-react";
import { apiClient } from "../lib/apiClient";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { sweetError } from "../lib/sweetAlert";

const INITIAL_FORM = {
  fullName: "",
  age: "",
  gender: "",
  address: "",
  shipId: "",
};

export function SimplePassengerForm({ registrationType, title, subtitle }) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [ships, setShips] = useState([]);
  const [loadingShips, setLoadingShips] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    apiClient
      .get("/ships")
      .then((res) => setShips(res.data.ships || []))
      .catch(() => sweetError("Unable to load ships", "Please refresh the page or ask port staff for assistance."))
      .finally(() => setLoadingShips(false));
  }, []);

  const setField = (name, value) => setForm((current) => ({ ...current, [name]: value }));

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const res = await apiClient.post("/passengers/simple", {
        ...form,
        age: Number(form.age),
        registrationType,
      });
      setResult(res.data);
      setForm(INITIAL_FORM);
    } catch (err) {
      sweetError("Registration failed", err.response?.data?.message || "Passenger information could not be saved.");
    } finally {
      setSubmitting(false);
    }
  }

  function downloadQr() {
    if (!result?.qrCodeDataUrl) return;
    const link = document.createElement("a");
    link.href = result.qrCodeDataUrl;
    link.download = `${result.passNumber || "portgo-pass"}.png`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  if (result) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-emerald-50 via-white to-emerald-100/60 px-4 py-8 sm:py-12">
        <div className="mx-auto max-w-lg rounded-[30px] border border-emerald-100 bg-white p-6 text-center shadow-xl shadow-emerald-950/10 sm:p-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
            <CheckCircle2 className="h-9 w-9" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-slate-900">Registration Complete</h1>
          <p className="mt-2 text-sm text-slate-500">Your PORTGO passenger record has been saved successfully.</p>

          <div className="mx-auto mt-6 w-fit rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <img src={result.qrCodeDataUrl} alt="PORTGO passenger QR code" className="h-56 w-56" />
          </div>
          <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">Pass Number</p>
          <p className="mt-1 text-lg font-black text-emerald-800">{result.passNumber}</p>
          <p className="mt-1 text-sm font-semibold text-slate-700">{result.trip?.ship?.name}</p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Button type="button" onClick={downloadQr} className="h-12 rounded-xl">
              <Download className="mr-2 h-4 w-4" /> Save QR
            </Button>
            <Button type="button" variant="outline" onClick={() => setResult(null)} className="h-12 rounded-xl">
              Register Another
            </Button>
          </div>
          <Link to="/" className="mt-5 inline-block text-sm font-semibold text-emerald-700 hover:underline">
            Go to Scanner
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-emerald-50 via-white to-emerald-100/60 px-4 py-6 sm:py-10">
      <div className="mx-auto max-w-xl">
        <div className="mb-5 flex items-center justify-center gap-3 text-emerald-900">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-800 text-white">
            <Anchor className="h-6 w-6" />
          </div>
          <div>
            <p className="text-lg font-black leading-none">PORTGO</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700/70">Passenger Registration</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[30px] border border-emerald-100 bg-white p-5 shadow-xl shadow-emerald-950/10 sm:p-8">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <UserRound className="h-7 w-7" />
            </div>
            <h1 className="mt-4 text-2xl font-black tracking-[-0.03em] text-slate-900 sm:text-3xl">{title}</h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{subtitle}</p>
          </div>

          <div className="mt-7 space-y-5">
            <div>
              <Label htmlFor="fullName">Full Name</Label>
              <Input id="fullName" value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} required className="mt-1.5 h-12" placeholder="Enter complete name" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <Label htmlFor="age">Age</Label>
                <Input id="age" type="number" min="0" max="130" value={form.age} onChange={(e) => setField("age", e.target.value)} required className="mt-1.5 h-12" placeholder="Age" />
              </div>
              <div>
                <Label htmlFor="gender">Gender</Label>
                <select id="gender" value={form.gender} onChange={(e) => setField("gender", e.target.value)} required className="mt-1.5 h-12 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20">
                  <option value="">Select gender</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="address">Address</Label>
              <textarea id="address" value={form.address} onChange={(e) => setField("address", e.target.value)} required rows={3} className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20" placeholder="Enter complete address" />
            </div>

            <div>
              <Label htmlFor="shipId">Ship Boarded</Label>
              <div className="relative mt-1.5">
                <Ship className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select id="shipId" value={form.shipId} onChange={(e) => setField("shipId", e.target.value)} required disabled={loadingShips} className="h-12 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:bg-slate-50">
                  <option value="">{loadingShips ? "Loading ships..." : "Select ship"}</option>
                  {ships.map((ship) => <option key={ship.id} value={ship.id}>{ship.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={submitting || loadingShips || ships.length === 0} className="mt-7 h-12 w-full rounded-xl text-sm font-black">
            {submitting ? "Saving Registration..." : "Submit Registration"}
          </Button>

          {ships.length === 0 && !loadingShips && (
            <p className="mt-3 text-center text-xs font-semibold text-amber-700">No active ships are currently available.</p>
          )}
        </form>
      </div>
    </div>
  );
}
