"use client";

import { useEffect, useRef, useState } from "react";
import { ScanLine, X } from "lucide-react";
import { Button } from "@bach/ui/components/button";

const FORMATS = ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"];

/**
 * Camera barcode scanner for phone/tablet POS — the USB/BT wedge scanner
 * stays the primary path on the counter. Uses the native BarcodeDetector
 * where the browser has it (Android Chrome), otherwise falls back to ZXing
 * (iPhone/iPad Safari). Stays open for continuous scanning; the same code
 * is ignored for a beat so one garment doesn't ring up twice.
 */
export function CameraScanner({ onDetect }: { onDetect: (code: string) => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [lastCode, setLastCode] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let zxingStop: (() => void) | null = null;
    let cancelled = false;

    const handle = (code: string) => {
      const now = Date.now();
      if (code === lastRef.current.code && now - lastRef.current.at < 1500) return;
      lastRef.current = { code, at: now };
      setLastCode(code);
      navigator.vibrate?.(60);
      onDetect(code);
    };

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
      } catch {
        setError("ما قدرنا نفتح الكاميرا — تأكد إنك عاطي إذن الكاميرا للمتصفح.");
        return;
      }
      if (cancelled || !videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play().catch(() => undefined);

      const Detector = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect(v: HTMLVideoElement): Promise<Array<{ rawValue: string }>> } }).BarcodeDetector;
      if (Detector) {
        const detector = new Detector({ formats: FORMATS });
        const tick = async () => {
          if (cancelled || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes[0]?.rawValue) handle(codes[0].rawValue);
          } catch {
            /* frame not ready — keep looping */
          }
          raf = window.setTimeout(tick, 180) as unknown as number;
        };
        void tick();
      } else {
        // Safari (iPhone/iPad) has no BarcodeDetector — ZXing reads the frames.
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        const reader = new BrowserMultiFormatReader();
        const controls = await reader
          .decodeFromVideoElement(videoRef.current, (result) => {
            if (result) handle(result.getText());
          })
          .catch(() => {
            setError("هالمتصفح ما بيدعم مسح الكاميرا.");
            return null;
          });
        zxingStop = controls ? () => controls.stop() : null;
      }
    }

    void start();
    return () => {
      cancelled = true;
      if (raf) clearTimeout(raf);
      zxingStop?.();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open, onDetect]);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="h-12 w-12 shrink-0 p-0"
        aria-label="مسح بالكاميرا"
        onClick={() => {
          setError("");
          setLastCode("");
          setOpen(true);
        }}
      >
        <ScanLine className="h-5 w-5" aria-hidden />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
          <div className="flex items-center justify-between p-4 text-white">
            <p className="text-sm font-medium">وجّه الكاميرا على الباركود</p>
            <button
              type="button"
              aria-label="سكّر الماسح"
              className="grid h-10 w-10 place-items-center rounded-full bg-white/10"
              onClick={() => setOpen(false)}
            >
              <X className="h-5 w-5" aria-hidden />
            </button>
          </div>
          <div className="relative mx-auto w-full max-w-lg flex-1 overflow-hidden px-4 pb-6">
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} playsInline muted className="h-full w-full rounded-2xl object-cover" />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-10 top-1/2 h-28 -translate-y-1/2 rounded-xl border-2 border-white/70"
            />
            {error && (
              <p className="absolute inset-x-4 bottom-10 rounded-lg bg-black/70 px-4 py-3 text-center text-sm text-white">
                {error}
              </p>
            )}
            {!error && lastCode && (
              <p className="absolute inset-x-4 bottom-10 rounded-lg bg-black/70 px-4 py-2 text-center text-sm text-white">
                انمسح: <span className="font-mono">{lastCode}</span> — كمّل مسح أو سكّر
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
