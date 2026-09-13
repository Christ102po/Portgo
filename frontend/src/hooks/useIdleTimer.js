import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_MS = 30000;
const WARNING_MS = 5000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll"];

export function useIdleTimer({ onIdle, active = true }) {
  const [isWarning, setIsWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(WARNING_MS / 1000);
  const idleTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const clearTimers = useCallback(() => {
    clearTimeout(idleTimeoutRef.current);
    clearInterval(countdownIntervalRef.current);
  }, []);

  const start = useCallback(() => {
    clearTimers();
    setIsWarning(false);
    setSecondsLeft(WARNING_MS / 1000);

    idleTimeoutRef.current = setTimeout(() => {
      let remaining = WARNING_MS / 1000;
      setIsWarning(true);
      setSecondsLeft(remaining);
      countdownIntervalRef.current = setInterval(() => {
        remaining -= 1;
        setSecondsLeft(remaining);
        if (remaining <= 0) {
          clearTimers();
          onIdleRef.current?.();
        }
      }, 1000);
    }, IDLE_MS - WARNING_MS);
  }, [clearTimers]);

  useEffect(() => {
    if (!active) {
      clearTimers();
      setIsWarning(false);
      return undefined;
    }

    start();
    const handleActivity = () => start();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, handleActivity));

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, handleActivity));
      clearTimers();
    };
  }, [active, start, clearTimers]);

  return { isWarning, secondsLeft, stayActive: start };
}
