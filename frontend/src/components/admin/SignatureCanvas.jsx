import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { Button } from "../ui/Button";

export function SignatureCanvas({ onChange }) {
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const hasInkRef = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  function getContext() {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext("2d");
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * ratio;
    canvas.height = canvas.clientHeight * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.strokeStyle = "#18251D";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function pointerPos(e) {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function handlePointerDown(e) {
    e.preventDefault();
    drawingRef.current = true;
    const ctx = getContext();
    const { x, y } = pointerPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(e) {
    if (!drawingRef.current) return;
    const ctx = getContext();
    const { x, y } = pointerPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInkRef.current) {
      hasInkRef.current = true;
      setHasInk(true);
    }
  }

  function handlePointerUp() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (hasInkRef.current) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasInkRef.current = false;
    setHasInk(false);
    onChange(null);
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white">
        <canvas
          ref={canvasRef}
          className="h-40 w-full touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        {!hasInk && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-300">
            Sign here
          </p>
        )}
      </div>
      <div className="mt-2 flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={handleClear} disabled={!hasInk}>
          <Eraser className="h-3.5 w-3.5" />
          Clear
        </Button>
      </div>
    </div>
  );
}
