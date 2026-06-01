import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Camera, X, RotateCcw, Loader2, AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onCancel: () => void;
  onCapture: (blob: Blob) => Promise<void> | void;
  title?: string;
}

export function CameraCapture({ open, onCancel, onCapture, title }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setStarting(true);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Câmera não suportada neste navegador.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (e: any) {
      console.error(e);
      setError(
        "Acesso à câmera bloqueado neste ambiente. Por favor, abra a aplicação em uma nova aba ou no celular para registrar o ponto."
      );
    } finally {
      setStarting(false);
    }
  }, []);

  useEffect(() => {
    if (open && !preview) start();
    return () => stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const capturar = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    const url = canvas.toDataURL("image/jpeg", 0.85);
    setPreview(url);
    stop();
  };

  const refazer = () => {
    setPreview(null);
    start();
  };

  const confirmar = async () => {
    if (!canvasRef.current) return;
    setSubmitting(true);
    try {
      const blob: Blob = await new Promise((resolve, reject) =>
        canvasRef.current!.toBlob((b) => (b ? resolve(b) : reject(new Error("Falha ao gerar foto"))), "image/jpeg", 0.85)
      );
      await onCapture(blob);
      setPreview(null);
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  const fechar = () => {
    stop();
    setPreview(null);
    setError(null);
    onCancel();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
      <div className="flex items-center justify-between p-4 text-white">
        <h2 className="text-lg font-semibold">{title ?? "Registrar Ponto"}</h2>
        <button onClick={fechar} className="p-2 rounded-full hover:bg-white/10" aria-label="Fechar">
          <X className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-4">
        {error ? (
          <div className="max-w-md w-full bg-card text-card-foreground rounded-xl p-6 text-center space-y-4">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive" />
            <p className="text-sm">{error}</p>
            <Button onClick={fechar} variant="outline" className="w-full">Fechar</Button>
          </div>
        ) : preview ? (
          <img src={preview} alt="Pré-visualização" className="max-h-[70vh] rounded-2xl border-4 border-white/20" />
        ) : (
          <div className="relative w-full max-w-md aspect-square">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover rounded-2xl bg-black border-4 border-white/20"
            />
            {starting && (
              <div className="absolute inset-0 flex items-center justify-center text-white">
                <Loader2 className="w-10 h-10 animate-spin" />
              </div>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {!error && (
        <div className="p-6 flex items-center justify-center gap-4 text-white">
          {preview ? (
            <>
              <Button onClick={refazer} variant="outline" size="lg" disabled={submitting}>
                <RotateCcw className="w-5 h-5 mr-2" /> Refazer
              </Button>
              <Button onClick={confirmar} size="lg" disabled={submitting}>
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar e enviar"}
              </Button>
            </>
          ) : (
            <Button
              onClick={capturar}
              size="lg"
              disabled={starting}
              className="rounded-full w-20 h-20 p-0 bg-white text-black hover:bg-white/90"
            >
              <Camera className="w-8 h-8" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
