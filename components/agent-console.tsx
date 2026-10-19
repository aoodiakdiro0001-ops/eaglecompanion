"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Brand } from "./brand";
import {
  AlertIcon,
  BatteryIcon,
  CheckIcon,
  ClockIcon,
  CloseIcon,
  DeviceIcon,
  MonitorIcon,
  ShareIcon,
  StopIcon,
  WifiIcon,
} from "./icons";
import { DEVICE_INFO_KEY, DEVICE_TOKEN_KEY } from "./agent-pair-form";

interface DeviceInfo {
  id: string;
  name: string;
  platform: string | null;
  screen_w: number | null;
  screen_h: number | null;
  last_seen_at: number | null;
  revoked_at: number | null;
}

interface BatteryState {
  level: number | null;
  charging: boolean | null;
}

interface ShareState {
  shareId: string;
  expiresAt: number;
}

type Status = "loading" | "ready" | "missing" | "revoked" | "error";

function readNetwork(): string {
  const nav = navigator as Navigator & {
    connection?: { type?: string; effectiveType?: string };
  };
  const connection = nav.connection;
  if (connection?.type && connection.type !== "unknown") return connection.type;
  if (connection?.effectiveType) return connection.effectiveType;
  return navigator.onLine ? "متصل" : "غير متصل";
}

export function AgentConsole() {
  const [status, setStatus] = useState<Status>("loading");
  const [device, setDevice] = useState<DeviceInfo | null>(null);
  const [lastBeat, setLastBeat] = useState<number | null>(null);
  const [battery, setBattery] = useState<BatteryState>({
    level: null,
    charging: null,
  });
  const [network, setNetwork] = useState("—");
  const [screenSize, setScreenSize] = useState("—");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [sharing, setSharing] = useState<ShareState | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const tokenRef = useRef<string | null>(null);
  const batteryRef = useRef<BatteryState>({ level: null, charging: null });
  const streamRef = useRef<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameTimerRef = useRef<number | null>(null);
  const expiryTimerRef = useRef<number | null>(null);
  const sharingRef = useRef<ShareState | null>(null);
  const postingRef = useRef(false);
  const stoppingRef = useRef(false);
  const stopRef = useRef<(notifyServer: boolean) => Promise<void>>(
    async () => undefined,
  );

  const heartbeat = useCallback(async (initial: boolean) => {
    const token = tokenRef.current;
    if (!token) return;
    const payload = {
      batteryLevel: batteryRef.current.level,
      charging: batteryRef.current.charging,
      networkType: readNetwork(),
      screenW: window.screen.width,
      screenH: window.screen.height,
    };
    setNetwork(payload.networkType);
    try {
      const response = await fetch("/api/agent/heartbeat", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      if (response.status === 401) {
        setStatus("revoked");
        setError("تم إلغاء وصول هذا الجهاز من لوحة التحكم.");
        return;
      }
      if (!response.ok) {
        if (initial) setError("تعذر تحديث حالة الجهاز");
        return;
      }
      const data = (await response.json()) as { device?: DeviceInfo };
      if (data.device) {
        setDevice(data.device);
        window.localStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(data.device));
      }
      setLastBeat(Date.now());
      setStatus((current) =>
        current === "revoked" ? current : "ready",
      );
      if (initial) setError(null);
    } catch {
      if (initial) {
        setError("تعذر الاتصال بالخادم. تحقق من الشبكة.");
        setStatus("error");
      }
    }
  }, []);

  const sendFrame = useCallback(async (shareId: string) => {
    const token = tokenRef.current;
    const video = videoRef.current;
    if (!token || !video || video.videoWidth === 0 || postingRef.current) return;
    postingRef.current = true;
    try {
      const canvas =
        canvasRef.current ?? (canvasRef.current = document.createElement("canvas"));
      const scale = Math.min(1, 960 / video.videoWidth);
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) return;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = canvas.toDataURL("image/jpeg", 0.6);
      const response = await fetch("/api/agent/frames", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ shareId, image }),
      });
      if (response.status === 401) {
        setStatus("revoked");
        setError("تم إلغاء وصول هذا الجهاز.");
        void stopRef.current(false);
      } else if (response.status === 409) {
        setShareError("انتهت جلسة المشاركة. ابدأ مشاركة جديدة عند الحاجة.");
        void stopRef.current(false);
      }
    } catch {
      // Keep trying on the next tick; transient network errors are expected.
    } finally {
      postingRef.current = false;
    }
  }, []);

  const stopSharing = useCallback(async (notifyServer: boolean) => {
    if (stoppingRef.current) return;
    stoppingRef.current = true;
    try {
      if (frameTimerRef.current) {
        window.clearInterval(frameTimerRef.current);
        frameTimerRef.current = null;
      }
      if (expiryTimerRef.current) {
        window.clearTimeout(expiryTimerRef.current);
        expiryTimerRef.current = null;
      }
      const current = sharingRef.current;
      const stream = streamRef.current;
      stream?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current = null;
      }
      sharingRef.current = null;
      setSharing(null);
      const token = tokenRef.current;
      if (notifyServer && current && token) {
        await fetch("/api/agent/share/stop", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => undefined);
      }
    } finally {
      stoppingRef.current = false;
    }
  }, []);

  useEffect(() => {
    stopRef.current = stopSharing;
  }, [stopSharing]);

  useEffect(() => {
    if (status === "revoked") void stopSharing(false);
  }, [status, stopSharing]);

  useEffect(() => {
    const token = window.localStorage.getItem(DEVICE_TOKEN_KEY);
    if (!token) {
      setStatus("missing");
      return;
    }
    tokenRef.current = token;
    setSupported(
      typeof navigator.mediaDevices?.getDisplayMedia === "function",
    );
    setScreenSize(`${window.screen.width}×${window.screen.height}`);

    const raw = window.localStorage.getItem(DEVICE_INFO_KEY);
    if (raw) {
      try {
        setDevice(JSON.parse(raw) as DeviceInfo);
      } catch {
        // Ignore malformed cached metadata.
      }
    }

    const nav = navigator as Navigator & {
      getBattery?: () => Promise<{
        level: number;
        charging: boolean;
        addEventListener: (type: string, listener: () => void) => void;
      }>;
    };
    nav
      .getBattery?.()
      .then((manager) => {
        const update = () => {
          const next = {
            level: Math.round(manager.level * 100),
            charging: manager.charging,
          };
          batteryRef.current = next;
          setBattery(next);
        };
        manager.addEventListener("levelchange", update);
        manager.addEventListener("chargingchange", update);
        update();
      })
      .catch(() => undefined);

    const onOnline = () => {
      void heartbeat(false);
    };
    window.addEventListener("online", onOnline);
    void heartbeat(true);
    const timer = window.setInterval(() => void heartbeat(false), 15000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.clearInterval(timer);
      void stopSharing(false);
    };
  }, [heartbeat, stopSharing]);

  useEffect(() => {
    if (!sharing) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [sharing]);

  async function beginShare() {
    setConfirming(false);
    setShareError(null);
    setShareBusy(true);
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 5 },
        audio: false,
      });
      streamRef.current = stream;

      const token = tokenRef.current;
      if (!token) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStatus("missing");
        return;
      }

      const response = await fetch("/api/agent/share/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await response.json().catch(() => ({}))) as {
        shareId?: string;
        expiresAt?: number;
        error?: string;
      };
      if (!response.ok || !data.shareId || !data.expiresAt) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setShareError(data.error ?? "تعذر بدء جلسة المشاركة");
        return;
      }

      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.srcObject = stream;
      await video.play();
      videoRef.current = video;

      const state = { shareId: data.shareId, expiresAt: data.expiresAt };
      sharingRef.current = state;
      setSharing(state);
      setNow(Date.now());

      const track = stream.getVideoTracks()[0];
      track?.addEventListener("ended", () => {
        void stopSharing(true);
      });

      frameTimerRef.current = window.setInterval(() => {
        void sendFrame(state.shareId);
      }, 1000);
      void sendFrame(state.shareId);

      expiryTimerRef.current = window.setTimeout(
        () => void stopSharing(true),
        Math.max(0, data.expiresAt - Date.now()),
      );
    } catch {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setShareError(
        "لم يتم منح إذن مشاركة الشاشة، أو أن المتصفح لا يدعم هذه الميزة.",
      );
    } finally {
      setShareBusy(false);
    }
  }

  function forgetDevice() {
    void stopSharing(true);
    window.localStorage.removeItem(DEVICE_TOKEN_KEY);
    window.localStorage.removeItem(DEVICE_INFO_KEY);
    window.location.href = "/pair";
  }

  const remaining = sharing
    ? Math.max(0, Math.floor((sharing.expiresAt - now) / 1000))
    : 0;
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  if (status === "missing") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Brand />
        <div className="card mt-8 p-6 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/20">
            <DeviceIcon className="h-7 w-7" />
          </span>
          <h1 className="mt-4 text-xl font-bold">هذا المتصفح غير مقترن</h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-7 text-muted">
            افتح صفحة الاقتران وأدخل الكود الذي ولّدته من لوحة التحكم.
          </p>
          <Link href="/pair" className="btn-primary mt-5">
            الانتقال إلى الاقتران
          </Link>
        </div>
      </div>
    );
  }

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <Brand />
        <div className="card mt-8 space-y-3 p-6">
          <div className="skeleton h-6 w-40" />
          <div className="skeleton h-4 w-64" />
          <div className="skeleton h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className={`mx-auto max-w-3xl px-4 py-6 ${sharing ? "pt-24" : ""}`}>
      {sharing ? (
        <div className="fixed inset-x-0 top-0 z-50 border-b border-white/20 bg-danger px-4 py-3 text-white shadow-lg">
          <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold">
              <span className="h-2 w-2 animate-pulseSoft rounded-full bg-white" />
              مشاركة الشاشة نشطة — يراها أعضاء مساحتك
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm" dir="ltr">
                {minutes}:{seconds}
              </span>
              <button
                type="button"
                onClick={() => void stopSharing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-danger"
              >
                <StopIcon className="h-3.5 w-3.5" />
                إيقاف المشاركة
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <header className="flex items-center justify-between">
        <Brand />
        <span className="chip">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          وكيل الجهاز
        </span>
      </header>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black">
            {device?.name ?? "جهازك"}
          </h1>
          <p className="mt-1 text-xs text-muted">
            هذه الصفحة هي واجهة الجهاز. إغلاقها يوقف النبضات ومشاركة الشاشة.
          </p>
        </div>
        <span className={status === "revoked" ? "chip-danger" : "chip-success"}>
          {status === "revoked" ? "تم إلغاء الوصول" : "نشط"}
        </span>
      </div>

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
          <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            {error}
            {status === "revoked" ? (
              <Link
                href="/pair"
                className="ms-2 font-semibold underline underline-offset-2"
              >
                اقتران جديد
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="card p-4">
          <div className="flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1.5">
              <BatteryIcon className="h-4 w-4" />
              البطارية
            </span>
            <span className="font-semibold text-ink">
              {battery.level === null ? "غير متاحة" : `${battery.level}%`}
              {battery.charging ? " · تشحن" : ""}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line/70">
            <div
              className={`h-full rounded-full ${
                battery.level !== null && battery.level <= 20
                  ? "bg-danger"
                  : "bg-accent"
              }`}
              style={{ width: `${battery.level ?? 0}%` }}
            />
          </div>
        </div>
        <div className="card flex items-center justify-between p-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <WifiIcon className="h-4 w-4" />
            الشبكة
          </span>
          <span className="font-semibold text-ink">{network}</span>
        </div>
        <div className="card flex items-center justify-between p-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <MonitorIcon className="h-4 w-4" />
            الشاشة
          </span>
          <span className="font-semibold text-ink" dir="ltr">
            {device?.screen_w && device?.screen_h
              ? `${device.screen_w}×${device.screen_h}`
              : screenSize}
          </span>
        </div>
        <div className="card flex items-center justify-between p-4 text-xs text-muted">
          <span className="flex items-center gap-1.5">
            <ClockIcon className="h-4 w-4" />
            آخر نبضة
          </span>
          <span className="font-semibold text-ink">
            {lastBeat
              ? new Intl.DateTimeFormat("ar", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }).format(new Date(lastBeat))
              : "—"}
          </span>
        </div>
      </section>

      <section className="card mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShareIcon className="h-4 w-4 text-brand" />
            <h2 className="text-base font-bold">مشاركة الشاشة</h2>
          </div>
          {sharing ? (
            <span className="chip-warn">
              <span className="h-1.5 w-1.5 animate-pulseSoft rounded-full bg-warn" />
              نشطة
            </span>
          ) : (
            <span className="chip">غير نشطة</span>
          )}
        </div>

        <div className="p-5">
          {status === "revoked" ? (
            <div className="rounded-xl border border-danger/25 bg-danger/5 p-4 text-center text-sm text-muted">
              تم إلغاء هذا الجهاز من لوحة التحكم. أعد الاقتران بكود جديد.
            </div>
          ) : sharing ? (
            <div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
              <p className="text-sm font-bold text-danger">
                الشاشة تُبث الآن إلى مساحتك
              </p>
              <p className="mt-1 text-xs leading-6 text-muted">
                المتصفح يعرض أيضاً مؤشر المشاركة. يمكنك الإيقاف من هنا أو من
                شريط المتصفح. تنتهي الجلسة تلقائياً بعد 10 دقائق.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="chip-warn" dir="ltr">
                  {minutes}:{seconds}
                </span>
                <button
                  type="button"
                  className="btn-danger btn-sm"
                  onClick={() => void stopSharing(true)}
                >
                  <StopIcon className="h-3.5 w-3.5" />
                  إيقاف المشاركة
                </button>
              </div>
            </div>
          ) : !supported ? (
            <div className="rounded-xl border border-warn/25 bg-warn/5 p-4">
              <p className="flex items-start gap-2 text-sm font-semibold text-warn">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                هذا المتصفح لا يدعم مشاركة الشاشة
              </p>
              <p className="mt-2 text-xs leading-6 text-muted">
                يمكنك متابعة حالة الجهاز بشكل طبيعي. لمشاركة الشاشة استخدم
                متصفحاً على حاسوب يدعم <span dir="ltr">getDisplayMedia</span>.
                لا توجد أي طريقة بديلة للالتقاط من دون إذن المتصفح.
              </p>
            </div>
          ) : confirming ? (
            <div className="rounded-xl border border-warn/30 bg-warn/5 p-4">
              <p className="text-sm font-bold text-warn">
                تأكيد مشاركة الشاشة
              </p>
              <p className="mt-1 text-xs leading-6 text-muted">
                ستطلب منك نافذة المتصفح اختيار الشاشة أو النافذة. أغلق أي محتوى
                حساس قبل المتابعة. الإطارات تُرسل بمعدل إطار واحد في الثانية ولا
                تُحفظ على الخادم.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  onClick={() => void beginShare()}
                  disabled={shareBusy}
                >
                  <CheckIcon className="h-4 w-4" />
                  {shareBusy ? "جارٍ البدء..." : "متابعة ومشاركة"}
                </button>
                <button
                  type="button"
                  className="btn-ghost btn-sm"
                  onClick={() => setConfirming(false)}
                  disabled={shareBusy}
                >
                  <CloseIcon className="h-4 w-4" />
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm leading-7 text-muted">
                لن تبدأ المشاركة تلقائياً. عند الضغط على الزر ستظهر نافذة
                المتصفح لاختيار الشاشة، ثم يظهر شريط أحمر ثابت حتى الإيقاف.
              </p>
              <button
                type="button"
                className="btn-primary mt-4"
                onClick={() => setConfirming(true)}
                disabled={shareBusy}
              >
                <ShareIcon className="h-4 w-4" />
                مشاركة الشاشة
              </button>
            </>
          )}

          {shareError ? (
            <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-xs text-danger">
              <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
              {shareError}
            </div>
          ) : null}
        </div>
      </section>

      <section className="card mt-5 p-5">
        <h2 className="text-sm font-bold">حدود هذه الصفحة</h2>
        <ul className="mt-3 grid gap-2 text-xs leading-6 text-muted sm:grid-cols-2">
          {[
            "ترسل حالة الجهاز فقط كل 15 ثانية.",
            "لا تقرأ الرسائل أو المكالمات أو الملفات.",
            "لا تشغّل الكاميرا أو الميكروفون.",
            "لا تعمل بعد إغلاق الصفحة.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
              {item}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={() => void heartbeat(false)}
          >
            تحديث الحالة الآن
          </button>
          <button
            type="button"
            className="btn-ghost btn-sm"
            onClick={forgetDevice}
          >
            نسيان هذا الجهاز محلياً
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-6 text-muted">
          «نسيان الجهاز» يمسح الرمز من هذا المتصفح فقط. لإلغاء الوصول نهائياً
          استخدم زر إلغاء الجهاز في لوحة التحكم.
        </p>
      </section>
    </div>
  );
}
