import { useEffect, useState } from "react";
import { ShieldCheck, Clock, Volume2, VolumeX, Globe } from "lucide-react";
import { SeaConditionBadge } from "../SeaConditionBadge";
import { cn } from "../../lib/cn";
import {
  isAudioGuidanceEnabled,
  setAudioGuidanceEnabled,
  subscribeAudioGuidance,
} from "../../lib/audioGuidance";
import { isSpeechAvailable, speak, stopSpeech } from "../../lib/speech";
import { useLanguage } from "../../hooks/useLanguage";
import { LANGUAGES } from "../../lib/i18n";
import { ApkDownloadButton } from "../ApkDownloadButton";

function LanguageSwitcher() {
  const { lang, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-1.5 py-1">
      <Globe className="h-3 w-3 text-white/40" />
      {LANGUAGES.map((l) => (
        <button
          key={l.code}
          type="button"
          onClick={() => setLanguage(l.code)}
          title={l.label}
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide transition-colors",
            lang === l.code ? "bg-emerald-300 text-emerald-950" : "text-white/50 hover:text-white/80"
          )}
        >
          {l.code}
        </button>
      ))}
    </div>
  );
}

function AudioGuidanceToggle() {
  const [enabled, setEnabled] = useState(() => isAudioGuidanceEnabled());
  const supported = isSpeechAvailable();

  useEffect(() => {
    const unsubscribe = subscribeAudioGuidance(() => setEnabled(isAudioGuidanceEnabled()));
    return unsubscribe;
  }, []);

  function toggle() {
    const next = !enabled;
    setAudioGuidanceEnabled(next);
    if (next) {
      speak("Audio guidance is now on. I will read each step aloud.");
    } else {
      stopSpeech();
    }
  }

  if (!supported) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? "Turn off audio guidance" : "Turn on audio guidance for elderly or PWD passengers"}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors",
        enabled ? "bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40" : "bg-white/5 text-white/50 hover:text-white/80"
      )}
    >
      {enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">Audio Guide</span>
    </button>
  );
}

function useLiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

export function KioskTerminalHeader() {
  const now = useLiveClock();
  const { t } = useLanguage();
  const dateStr = now.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });

  return (
    <div className="flex flex-col gap-2 border-b border-emerald-400/20 bg-[#073f32] px-4 py-2.5 text-white shadow-[0_1px_20px_-4px_rgba(15,23,42,0.35)] sm:px-8 min-[760px]:flex-row min-[760px]:items-center min-[760px]:justify-between print:hidden">
      <div className="flex min-w-0 items-center gap-2">
        <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" />
        <p className="truncate text-[11px] font-bold uppercase tracking-wider text-white sm:text-xs">
          <span className="hidden sm:inline">Philippine Ports Authority&nbsp;&bull;&nbsp;</span>
          {t("kioskTitle")}
        </p>
      </div>
      <div className="scrollbar-hide flex w-full shrink-0 items-center gap-2 overflow-x-auto pb-0.5 min-[760px]:w-auto min-[760px]:overflow-visible min-[760px]:pb-0">
        <div className="hidden shrink-0 items-center gap-1.5 font-mono text-[11px] font-semibold text-teal-300 min-[430px]:flex sm:text-xs">
          <Clock className="h-3.5 w-3.5" />
          <span>
            {dateStr} <span className="text-white/30">|</span> {timeStr}
          </span>
        </div>
        <span className="hidden text-white/20 sm:inline">&bull;</span>
        <SeaConditionBadge />
        <span className="hidden text-white/20 sm:inline">&bull;</span>
        <AudioGuidanceToggle />
        <span className="hidden text-white/20 sm:inline">&bull;</span>
        <LanguageSwitcher />
        <span className="hidden text-white/20 sm:inline">&bull;</span>
        <ApkDownloadButton dark compact />
      </div>
    </div>
  );
}
