import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Anchor, QrCode, UserPlus, ShieldCheck, ChevronRight, ScanLine } from "lucide-react";
import { ConnectivityBadge } from "../components/ConnectivityBadge";

const cards = [
  {
    title: "Scan Existing QR",
    description: "Already registered? Scan your PORTGO QR code to open your registration and travel details.",
    icon: QrCode,
    action: "/scan-pass",
    eyebrow: "Already Registered",
  },
  {
    title: "Register New Member",
    description: "Register the primary passenger, optionally add accompanying members, and receive one QR code for the primary passenger.",
    icon: UserPlus,
    action: "/register",
    eyebrow: "New Registration",
  },
];

export default function KioskLandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_top_left,_rgba(52,211,153,0.24),_transparent_28%),linear-gradient(145deg,#052e24_0%,#064e3b_45%,#0b5b43_100%)] text-white">
      <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-8 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Anchor className="h-6 w-6 text-emerald-200" />
          </div>
          <div>
            <p className="text-lg font-black tracking-[-0.03em] sm:text-xl">PORTGO</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/75">Passenger Kiosk</p>
          </div>
        </div>
        <ConnectivityBadge />
      </header>

      <main className="mx-auto flex min-h-[calc(100dvh-78px)] w-full max-w-7xl flex-col justify-center px-4 py-8 sm:px-8 lg:px-12 lg:py-12">
        <div className="mx-auto w-full max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-[28px] bg-emerald-300/15 ring-1 ring-emerald-200/20 backdrop-blur">
            <ScanLine className="h-10 w-10 text-emerald-200" />
          </div>
          <p className="text-xs font-extrabold uppercase tracking-[0.24em] text-emerald-200">Welcome to PORTGO</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-5xl lg:text-6xl">What would you like to do?</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-6 text-emerald-50/75 sm:text-base">
            Use the kiosk to open an existing QR registration or create a new passenger registration. The interface is optimized for touch screens, tablets, laptops, and large kiosk displays.
          </p>
        </div>

        <div className="mx-auto mt-8 grid w-full max-w-5xl grid-cols-1 gap-4 sm:mt-10 lg:grid-cols-2 lg:gap-6">
          {cards.map((card, index) => {
            const Icon = card.icon;
            return (
              <motion.button
                key={card.title}
                type="button"
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.06 * index, duration: 0.3 }}
                onClick={() => navigate(card.action)}
                className="group relative min-h-[220px] overflow-hidden rounded-[30px] border border-white/12 bg-white/[0.075] p-6 text-left shadow-[0_24px_70px_-38px_rgba(0,0,0,0.75)] backdrop-blur-xl transition hover:-translate-y-1 hover:bg-white/[0.11] focus:outline-none focus:ring-4 focus:ring-emerald-300/25 sm:p-8 lg:min-h-[300px]"
              >
                <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-emerald-300/10 blur-2xl transition group-hover:bg-emerald-300/20" />
                <div className="relative flex h-full flex-col">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-300 text-[#063c2e] shadow-lg shadow-emerald-950/20 sm:h-20 sm:w-20">
                      <Icon className="h-8 w-8 sm:h-10 sm:w-10" />
                    </div>
                    <span className="rounded-full border border-white/10 bg-black/10 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-emerald-100/80">
                      {card.eyebrow}
                    </span>
                  </div>
                  <div className="mt-7 lg:mt-auto">
                    <h2 className="text-2xl font-black tracking-[-0.035em] sm:text-3xl">{card.title}</h2>
                    <p className="mt-2 max-w-md text-sm leading-6 text-emerald-50/70 sm:text-base">{card.description}</p>
                    <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-emerald-300 px-4 py-2.5 text-sm font-black text-[#063c2e] transition group-hover:gap-3">
                      Continue <ChevronRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        <div className="mx-auto mt-7 flex max-w-3xl items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/10 px-4 py-3 text-center text-xs text-emerald-50/65">
          <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-200" />
          Group members are recorded in the admin system, while only the primary passenger receives the shared boarding QR.
        </div>

        <div className="mt-6 text-center">
          <Link to="/admin/login" className="text-xs font-semibold text-emerald-100/45 underline-offset-4 hover:text-emerald-100 hover:underline">
            Staff / Administrator Login
          </Link>
        </div>
      </main>
    </div>
  );
}
