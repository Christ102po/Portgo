import { useRef, useState } from "react";
import { ScanLine, UploadCloud, BadgeCheck, RotateCcw, AlertTriangle, IdCard } from "lucide-react";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { Select } from "../ui/Select";
import { Badge } from "../ui/Badge";
import { scanIdImage, ID_TYPE } from "../../lib/idOcr";
import { validatePassportPhoto } from "../../lib/imageValidation";
import { useToast } from "../ui/Toast";

/**
 * Reusable ID document scanner: upload/capture a photo, run it through
 * client-side OCR (Tesseract.js), and hand the caller back best-effort
 * extracted fields plus the image data URL to store as the verification
 * document. The caller owns the actual form fields so the operator can
 * always correct whatever OCR got wrong.
 */
export function IdScannerUpload({
  label = "Upload or Scan ID",
  documentType,
  documentTypeOptions,
  onDocumentTypeChange,
  imageUrl,
  onScanned,
  onClear,
}) {
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState("");
  const [extractedOk, setExtractedOk] = useState(false);
  const [lowConfidence, setLowConfidence] = useState(false);
  const [detectedType, setDetectedType] = useState(null);
  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result;
      setError("");
      setExtractedOk(false);
      setLowConfidence(false);
      setDetectedType(null);
      setIsScanning(true);

      const validation = await validatePassportPhoto(dataUrl);
      if (!validation.valid) {
        setIsScanning(false);
        setError(validation.message);
        showToast({ title: "Invalid Document Photo", description: validation.message, variant: "error" });
        onScanned?.({ imageUrl: dataUrl, fields: null });
        return;
      }

      try {
        const fields = await scanIdImage(dataUrl);
        setExtractedOk(true);
        setLowConfidence((fields.lowConfidenceFields?.length || 0) > 0);
        setDetectedType(fields.idType && fields.idType !== ID_TYPE.UNKNOWN ? fields.idTypeLabel : null);
        onScanned?.({ imageUrl: dataUrl, fields });
      } catch (err) {
        setError("Could not read this document automatically. You can still enter details manually.");
        onScanned?.({ imageUrl: dataUrl, fields: null });
      } finally {
        setIsScanning(false);
      }
    };
    reader.readAsDataURL(file);
  }

  function handleRescan() {
    setError("");
    setExtractedOk(false);
    setLowConfidence(false);
    setDetectedType(null);
    onClear?.();
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      {documentTypeOptions && documentTypeOptions.length > 1 && (
        <div className="mb-3">
          <Label className="text-xs">Document Type</Label>
          <Select value={documentType} onValueChange={onDocumentTypeChange} options={documentTypeOptions} />
        </div>
      )}

      {!imageUrl && (
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-6 py-8 text-center transition-colors hover:border-blue-400 hover:bg-blue-50/40"
        >
          <UploadCloud className="h-7 w-7 text-slate-400" />
          <span className="text-sm font-semibold text-slate-700">{label}</span>
          <span className="text-xs text-slate-400">JPG or PNG &middot; client-side OCR auto-fill</span>
        </button>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />

      {imageUrl && (
        <div className="relative overflow-hidden rounded-xl border border-slate-200">
          <img src={imageUrl} alt="ID document preview" className="h-40 w-full object-cover" />
          {isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/80 text-white">
              <ScanLine className="h-6 w-6 animate-pulse" />
              <p className="text-xs font-semibold uppercase tracking-wide">Reading document...</p>
            </div>
          )}
        </div>
      )}

      {imageUrl && !isScanning && error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border-2 border-amber-200 bg-amber-50 px-3 py-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          <span className="text-xs font-semibold text-amber-700">{error}</span>
        </div>
      )}
      {imageUrl && !isScanning && extractedOk && detectedType && !error && (
        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-xs text-slate-500">Detected:</span>
          <Badge variant="outline" className="inline-flex items-center gap-1">
            <IdCard className="h-3 w-3" />
            {detectedType}
          </Badge>
        </div>
      )}
      {imageUrl && !isScanning && extractedOk && !error && (
        lowConfidence ? (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            Low-confidence scan — fields highlighted in yellow need a closer look
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
            <BadgeCheck className="h-4 w-4" />
            Details extracted — please review and correct below
          </div>
        )
      )}

      {imageUrl && !isScanning && (
        <Button variant="outline" size="sm" onClick={handleRescan} className="mt-3 w-full">
          <RotateCcw className="h-3.5 w-3.5" />
          Upload a Different Photo
        </Button>
      )}
    </div>
  );
}
