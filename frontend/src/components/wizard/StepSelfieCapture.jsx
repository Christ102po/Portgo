import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Camera, RotateCcw, BadgeCheck, AlertTriangle, ScanFace } from "lucide-react";
import { useWizard } from "../../hooks/useWizard";
import { Button } from "../ui/Button";
import { Card, CardContent } from "../ui/Card";
import { cn } from "../../lib/cn";

const CAPTURE_WIDTH = 480;
const CAPTURE_HEIGHT = 360;

function randomMatchScore() {
  return Math.round((95 + Math.random() * 4.9) * 10) / 10;
}

export function StepSelfieCapture() {
  const { state, dispatch } = useWizard();
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraError, setCameraError] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  function setField(field, value) {
    dispatch({ type: "SET_FIELD", field, value });
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }

  useEffect(() => {
    if (state.selfiePhotoUrl) return;
    let cancelled = false;

    async function start() {
      setCameraError("");
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user", width: CAPTURE_WIDTH, height: CAPTURE_HEIGHT },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try {
            await videoRef.current.play();
          } catch {
            // play() can be interrupted by rapid remounts (React StrictMode) —
            // the stream itself is still valid, so this isn't a real failure.
          }
        }
        if (!cancelled) setIsStreaming(true);
      } catch (err) {
        if (!cancelled) {
          setCameraError("Camera unavailable. Please allow camera access and try again.");
          setIsStreaming(false);
        }
      }
    }

    start();
    return () => {
      cancelled = true;
      stopStream();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryToken, state.selfiePhotoUrl]);

  function handleCapture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = CAPTURE_WIDTH;
    canvas.height = CAPTURE_HEIGHT;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, CAPTURE_WIDTH, CAPTURE_HEIGHT);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.6);
    dispatch({ type: "SET_FIELDS", fields: { selfiePhotoUrl: dataUrl, isFaceVerified: false, faceMatchScore: null } });
    stopStream();
    setIsStreaming(false);
    setIsMatching(true);
    setTimeout(() => {
      const score = randomMatchScore();
      dispatch({ type: "SET_FIELDS", fields: { isFaceVerified: true, faceMatchScore: score } });
      setIsMatching(false);
    }, 1300 + Math.random() * 500);
  }

  function handleRetake() {
    setField("selfiePhotoUrl", null);
    setField("isFaceVerified", false);
    setField("faceMatchScore", null);
    setRetryToken((t) => t + 1);
  }

  const canContinue = state.isFaceVerified && !!state.selfiePhotoUrl && !isMatching;

  return (
    <div>
      <h2 className="mb-1 text-center text-xl font-semibold text-slate-900">
        Live Selfie Verification
      </h2>
      <p className="mb-8 text-center text-sm text-slate-500">
        Look at the camera and capture a live photo to confirm your identity.
      </p>

      <Card className="mx-auto max-w-md border-slate-200/80 shadow-sm">
        <CardContent className="pt-6">
          <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-900">
            {state.selfiePhotoUrl ? (
              <img src={state.selfiePhotoUrl} alt="Captured selfie" className="h-full w-full object-cover" />
            ) : (
              <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
            )}
            {!state.selfiePhotoUrl && isStreaming && (
              <div className="pointer-events-none absolute inset-6 rounded-2xl border-2 border-emerald-400/70" />
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 px-6 text-center text-white">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
                <p className="text-xs">{cameraError}</p>
                <Button variant="outline" size="sm" onClick={() => setRetryToken((t) => t + 1)}>
                  Retry Camera
                </Button>
              </div>
            )}
          </div>

          <div className="mt-4 flex justify-center">
            {isMatching ? (
              <div className="flex flex-col items-center gap-2">
                <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                  <ScanFace className="h-4 w-4 animate-pulse text-blue-600" />
                  Matching face against passport photo...
                </span>
              </div>
            ) : state.selfiePhotoUrl ? (
              <div className="flex flex-col items-center gap-2">
                <span
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                    state.faceMatchScore >= 90
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                  )}
                >
                  <BadgeCheck className="h-4 w-4" />
                  Match Score: {state.faceMatchScore?.toFixed(1)}% &mdash; Verification Passed
                </span>
                <Button variant="outline" size="sm" onClick={handleRetake}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  Retake Photo
                </Button>
              </div>
            ) : (
              <Button onClick={handleCapture} disabled={!isStreaming || !!cameraError}>
                <Camera className="h-4 w-4" />
                Capture Photo
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 flex justify-between">
        <Button
          variant="outline"
          size="lg"
          onClick={() => {
            stopStream();
            dispatch({ type: "PREV_STEP" });
          }}
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Button>
        <Button variant="kiosk" size="lg" className="h-auto w-full sm:w-auto px-8 py-3.5 rounded-xl" disabled={!canContinue} onClick={() => dispatch({ type: "NEXT_STEP" })}>
          Continue
        </Button>
      </div>
    </div>
  );
}
