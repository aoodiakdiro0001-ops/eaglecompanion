"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EyeIcon, LockIcon, ShareIcon } from "./icons";

export interface ShareInfo {
  id: string;
  startedAt: number;
  expiresAt: number;
  lastFrameAt: number | null;
  framesCount: number;
  live: boolean;
}

interface LiveViewerProps {
  deviceId: string;
  initialShare: ShareInfo | null;
  revoked: boolean;
}

export function LiveViewer({
  deviceId,
  initialShare,
  revoked,
}: LiveViewerProps) {
  const [share, setShare] = useState<ShareInfo | null>(initialShare);
  const [frameUrl, setFrameUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const urlRef = useRef<string | null>(null);

  const clearFrame = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setFrameUrl(null);
  }, []);

  const applyFrame = useCallback((blob: Blob) => {
    const next = URL.createObjectURL(blob);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = next;
    setFrameUrl(next);
  }, []);

  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, []);

  useEffect(() => {
    if (revoked) {
      clearFrame();
      return;
    }
    let active = true;

    async function loadShare() {
      try {
        const response = await fetch(`/api/devices/${deviceId}/share`, {
          cache: "no-store",
        });
        if (!response.ok) return;
        const data = (await response.json()) as {
          sharing: boolean;
          share: Omit<ShareInfo, "live"> | null;
        };
        if (!active) return;
        setShare(data.share ? { ...data.share, live: data.sharing } : null);
        if (!data.sharing) clearFrame();
      } catch {
        // Transient network errors are ignored; the next poll retries.
      }
    }

    void loadShare();
    const timer = window.setInterval(loadShare, 3000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [deviceId, revoked, clearFrame]);

  const live = Boolean(share?.live) && !revoked;

  useEffect(() => {
    if (!live) clearFrame();
  }, [live, clearFrame]);

  useEffect(() => {
    if (!live) return;
    let active = true;

    async function loadFrame() {
      try {
        const response = await fetch(`/api/devices/${deviceId}/frame`, {
          cache: "no-store",
        });
        if (!active) return;
        if (response.status === 204) {
          clearFrame();
          return;
        }
        if (!response.ok) return;
        const blob = await response.blob();
        if (!active) return;
        applyFrame(blob);
        setError(null);
      } catch {
        if (active) setError("تعذر تحديث الإطار، ستحاول الصفحة مجدداً");
      }
    }

    void loadFrame();
    const timer = window.setInterval(loadFrame, 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [deviceId, live, applyFrame, clearFrame]);

  useEffect(() => {
    if (!live) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [live]);

  const remaining = share
    ? Math.max(0, Math.floor((share.expiresAt - now) / 1000))
    : 0;
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <section className="card overflow-hidden" aria-labelledby="live-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
            <EyeIcon className="h-5 w-5" />
          </span>
          <div>
            <h2 id="live-title" className="text-base font-bold">
              الشاشة المباشرة
            </h2>
            <p className="text-[11px] text-muted">
              بث لحظي بموافقة الجهاز، دون تسجيل أو حفظ.
            </p>
          </div>
        </div>
        {revoked ? (
          <span className="chip-danger">الجهاز ملغى</span>
        ) : live ? (
          <span className="chip-warn">
            <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-warn" />
            مباشر · {minutes}:{seconds}
          </span>
        ) : (
          <span className="chip">لا مشاركة نشطة</span>
        )}
      </div>

      <div className="p-4">
        {revoked ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-danger/25 bg-danger/5 px-6 py-14 text-center">
            <LockIcon className="h-8 w-8 text-danger" />
            <p className="mt-3 text-sm font-semibold text-danger">
              تم إلغاء وصول هذا الجهاز
            </p>
            <p className="mt-1 text-xs text-muted">
              لم يعد بإمكان الجهاز إرسال حالته أو بدء مشاركة جديدة.
            </p>
          </div>
        ) : live && frameUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-line bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={frameUrl}
              alt="بث شاشة الجهاز"
              className="mx-auto max-h-[520px] w-full object-contain"
            />
            <span className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold text-warn backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-warn" />
              بث مباشر
            </span>
            <span className="absolute bottom-3 left-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] text-white/80 backdrop-blur">
              إطار مؤقت · لا يُحفظ
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-line/70 bg-panel2/40 px-6 py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
              <ShareIcon className="h-7 w-7" />
            </span>
            <p className="mt-4 text-sm font-semibold">
              {share ? "بانتظار أول إطار" : "لا توجد مشاركة شاشة نشطة"}
            </p>
            <p className="mt-2 max-w-md text-xs leading-6 text-muted">
              المشاركة تبدأ من الجهاز نفسه: يضغط المستخدم على «مشاركة الشاشة»،
              يؤكد الطلب، ثم يمنح إذن المتصفح. لا يمكن بدؤها من لوحة التحكم.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span className="chip">
                <LockIcon className="h-3.5 w-3.5" />
                تنتهي تلقائياً بعد 10 دقائق
              </span>
              <span className="chip">
                <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                الإطار يُمحى بعد 5 ثوانٍ
              </span>
            </div>
          </div>
        )}

        {error ? (
          <p className="mt-3 text-center text-xs text-warn">{error}</p>
        ) : null}

        {share && !revoked ? (
          <p className="mt-3 text-center text-[11px] text-muted">
            عدد الإطارات المستلمة: {share.framesCount} · الحالة تُحدَّث كل 3 ثوانٍ
          </p>
        ) : null}
      </div>
    </section>
  );
}
