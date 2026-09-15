import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Anchor, Search, Ban, RefreshCw, Home } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { usePortAdvisory } from "../../hooks/usePortAdvisory";
import { StepIndicator } from "./StepIndicator";
import { StepPassengerType } from "./StepPassengerType";
import { StepTransactionType } from "./StepTransactionType";
import { StepPhoneVerification } from "./StepPhoneVerification";
import { StepPersonalInfo } from "./StepPersonalInfo";
import { StepSelfieCapture } from "./StepSelfieCapture";
import { StepTripDetails } from "./StepTripDetails";
import { StepConfirmation } from "./StepConfirmation";
import { StepSuccess } from "./StepSuccess";
import { KioskTerminalHeader } from "./KioskTerminalHeader";
import { IdleResetModal } from "./IdleResetModal";
import { ConnectivityBadge } from "../ConnectivityBadge";
import { FindTicketModal } from "./FindTicketModal";
import { QuickRebookModal } from "./QuickRebookModal";
import { PortConditionMiniCard } from "../PortConditionMiniCard";
import { PortStatusBanner } from "../PortStatusBanner";
import { DepartureTicker } from "./DepartureTicker";
import { PortGuidelinesModal } from "./PortGuidelinesModal";
import { Button } from "../ui/Button";
import { useIdleTimer } from "../../hooks/useIdleTimer";
import { useLanguage } from "../../hooks/useLanguage";
import { isAudioGuidanceEnabled, subscribeAudioGuidance } from "../../lib/audioGuidance";
import { speak } from "../../lib/speech";
import { getStepAnnouncement, SUCCESS_ANNOUNCEMENT } from "../../lib/stepAnnouncements";
import { cn } from "../../lib/cn";
import { useNavigate } from "react-router-dom";

const variants = {
  enter: { opacity: 0, x: 40 },
  center: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const LOCAL_STEPS = {
  1: StepPassengerType,
  2: StepTransactionType,
  3: StepPhoneVerification,
  4: StepPersonalInfo,
  5: StepTripDetails,
  6: StepConfirmation,
};

const TOURIST_STEPS = {
  1: StepPassengerType,
  2: StepTransactionType,
  3: StepSelfieCapture,
  4: StepPersonalInfo,
  5: StepTripDetails,
  6: StepConfirmation,
};

const TOTAL_STEPS = 6;


function SuspendedNotice({ reason }) {
  return (
    <div className="mx-auto w-full max-w-lg rounded-3xl border-2 border-red-200 bg-red-50 p-10 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
        <Ban className="h-7 w-7 text-red-600" />
      </div>
      <h2 className="text-xl font-bold text-red-700">Registrations Temporarily Suspended</h2>
      <p className="mt-2 text-sm text-red-600">
        {reason ||
          "All passenger trips are currently suspended due to Coast Guard Weather Advisory. New registrations are temporarily disabled."}
      </p>
      <p className="mt-3 text-xs text-red-500">
        Please wait for port officials to resume operations, or use &ldquo;Find My Pass&rdquo; above if you
        already have a confirmed booking.
      </p>
    </div>
  );
}

export function WizardShell() {
  const { state, dispatch } = useWizard();
  const advisory = usePortAdvisory();
  const isSuspended = !!advisory?.suspended;
  const isSuccess = !!state.result;
  const stepComponents = state.passengerType === "FOREIGN_TOURIST" ? TOURIST_STEPS : LOCAL_STEPS;
  const totalSteps = TOTAL_STEPS;
  const StepComponent = stepComponents[state.step];
  const SuccessComponent = StepSuccess;
  const navigate = useNavigate();
  // Passenger Information is laid out as a wide 2-column form and needs
  // more room than every other (narrow, single-column) step.
  const isWideStep = StepComponent === StepPersonalInfo;
  const [findTicketOpen, setFindTicketOpen] = useState(false);
  const [findTicketQuery, setFindTicketQuery] = useState("");
  const [quickRebookOpen, setQuickRebookOpen] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(() => isAudioGuidanceEnabled());
  const { t } = useLanguage();
  const isLanding = state.step === 1 && !isSuccess;
  const idleActive = state.step > 1 || isSuccess;

  useEffect(() => {
    const unsubscribe = subscribeAudioGuidance(() => setAudioEnabled(isAudioGuidanceEnabled()));
    return unsubscribe;
  }, []);

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get("ref");
    if (ref) {
      setFindTicketQuery(ref);
      setFindTicketOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!audioEnabled) return;
    if (isSuccess) {
      speak(SUCCESS_ANNOUNCEMENT);
      return;
    }
    if (isSuspended) return;
    const text = getStepAnnouncement({ step: state.step, passengerType: state.passengerType, isGroupMode: false });
    speak(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioEnabled, state.step, isSuccess]);
  const { isWarning, secondsLeft, stayActive } = useIdleTimer({
    active: idleActive,
    onIdle: () => { dispatch({ type: "RESET" }); navigate("/"); },
  });

  return (
    <div className="mobile-screen portgo-booking-shell">
      <div className="sticky top-0 z-30 print:hidden">
        <KioskTerminalHeader />
        <div className="flex items-center justify-between gap-2 border-b border-white/10 bg-[#0b5b43]/95 px-3 py-3 shadow-[0_10px_30px_-20px_rgba(15,23,42,0.9)] backdrop-blur-xl sm:px-8 sm:py-3.5">
          <div className="flex items-center gap-3.5">
            <div className="relative flex h-11 w-11 shrink-0 items-center justify-center sm:h-14 sm:w-14">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-300 via-emerald-400 to-green-600 shadow-[0_0_26px_-4px_rgba(45,212,191,0.75)]" />
              <div className="absolute inset-[3px] rounded-full border-2 border-dashed border-white/50" />
              <div className="absolute inset-[7px] rounded-full bg-[#073f32] ring-1 ring-white/20" />
              <Anchor className="relative h-5 w-5 text-emerald-200 sm:h-6 sm:w-6" />
            </div>
            <div className="leading-tight">
              <span className="block text-base font-black tracking-[-0.03em] text-white sm:text-xl">PORTGO</span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-emerald-200/80 sm:block">
                Official PPA Passenger Terminal
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => { dispatch({ type: "RESET" }); navigate("/"); }}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 text-xs font-bold text-white/80 transition hover:bg-white/10 hover:text-white sm:h-10 sm:px-3"
              title="Return to kiosk home"
            >
              <Home className="h-4 w-4" />
              <span className="hidden sm:inline">Kiosk Home</span>
            </button>
            <ConnectivityBadge />
            {!isSuccess && (
              <span className="hidden text-xs font-medium text-white/50 min-[420px]:inline">
                Step {state.step} of {totalSteps}
              </span>
            )}
          </div>
        </div>
        {isLanding && <DepartureTicker />}
      </div>

      {isLanding && <PortStatusBanner />}

      <div className={cn("portgo-content mx-auto flex w-full flex-col bg-transparent px-3 pb-5 pt-4 sm:px-5 sm:py-6", isWideStep ? "max-w-6xl" : "max-w-4xl")}>
        <header className="portgo-page-intro mb-4 text-center print:hidden sm:mb-6">
          <div className="mx-auto mb-3 inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.18em] text-emerald-700 sm:hidden">Passenger Services</div>
          <h1 className="text-2xl font-black tracking-[-0.035em] text-slate-950 sm:text-3xl">
            {t("pageTitle")}
          </h1>
          <p className="mx-auto mt-1.5 max-w-md text-sm font-medium leading-6 text-slate-500">
            {t("pageSubtitle")}
          </p>
          <PortConditionMiniCard className="mt-3 sm:mt-4" />
          {isLanding && (
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="outline"
                className="inline-flex h-auto items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                onClick={() => setFindTicketOpen(true)}
              >
                <Search className="h-3.5 w-3.5" />
                {t("findPass")}
              </Button>
              <Button
                variant="outline"
                className="inline-flex h-auto items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm hover:bg-emerald-100"
                onClick={() => setQuickRebookOpen(true)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Quick Re-Booking
              </Button>
            </div>
          )}
        </header>

        {!isSuccess && !isSuspended && (
          <div className="mb-4 sm:mb-6">
            <StepIndicator
              currentStep={state.step}
              passengerType={state.passengerType}
              totalSteps={totalSteps}
              isGroupMode={false}
            />
          </div>
        )}

        <div className="flex min-h-[42dvh] flex-1 items-start justify-center lg:min-h-[48dvh]">
          <div className={cn("w-full", !isSuccess && !isSuspended && "app-surface p-4 sm:p-6 md:p-7")}>
          {isSuspended && !isSuccess ? (
            <SuspendedNotice reason={advisory.suspendedReason} />
          ) : (
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  key="success"
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="w-full"
                >
                  <SuccessComponent />
                </motion.div>
              ) : (
                <motion.div
                  key={state.step}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.25 }}
                  className="w-full"
                >
                  <StepComponent />
                </motion.div>
              )}
            </AnimatePresence>
          )}
          </div>
        </div>
      </div>

      <FindTicketModal open={findTicketOpen} onOpenChange={setFindTicketOpen} initialQuery={findTicketQuery} />
      <QuickRebookModal open={quickRebookOpen} onOpenChange={setQuickRebookOpen} />
      <IdleResetModal open={isWarning} secondsLeft={secondsLeft} onStay={stayActive} />
      {isLanding && <PortGuidelinesModal />}
    </div>
  );
}
