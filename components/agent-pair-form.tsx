"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Brand } from "./brand";
import {
  AlertIcon,
  CheckIcon,
  CloseIcon,
  DeviceIcon,
  KeyIcon,
  LockIcon,
  ShareIcon,
} from "./icons";

export const DEVICE_TOKEN_KEY = "eagle_device_token";
export const DEVICE_INFO_KEY = "eagle_device_info";

function detectPlatform(userAgent: string): string {
  if (/Android/i.test(userAgent)) return "Android";
  if (/iPhone|iPad|iPod/i.test(userAgent)) return "iOS";
  if (/Windows/i.test(userAgent)) return "Windows";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "macOS";
  if (/Linux/i.test(userAgent)) return "Linux";
  return "متصفح";
}

export function AgentPairForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("متصفح");
  const [hasExisting, setHasExisting] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const existing = Boolean(window.localStorage.getItem(DEVICE_TOKEN_KEY));
    setHasExisting(existing);
    setShowForm(!existing);
    const detected = detectPlatform(navigator.userAgent);
    setPlatform(detected);
    setName((current) => current || `جهاز ${detected}`);
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/agent/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          name: name.trim(),
          platform,
          userAgent: navigator.userAgent,
          screenW: window.screen.width,
          screenH: window.screen.height,
        }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        token?: string;
        device?: unknown;
        error?: string;
      };
      if (!response.ok || !data.token) {
        setError(data.error ?? "تعذر إتمام الاقتران");
        return;
      }
      window.localStorage.setItem(DEVICE_TOKEN_KEY, data.token);
      window.localStorage.setItem(DEVICE_INFO_KEY, JSON.stringify(data.device));
      router.replace("/agent");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  }

  function forgetLocal() {
    window.localStorage.removeItem(DEVICE_TOKEN_KEY);
    window.localStorage.removeItem(DEVICE_INFO_KEY);
    setHasExisting(false);
    setShowForm(true);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="flex items-center justify-between">
        <Brand />
        <Link href="/" className="text-xs text-muted hover:text-ink">
          الرئيسية
        </Link>
      </header>

      <div className="mt-8">
        <span className="chip border-brand/30 bg-brand/10 text-brand">
          <DeviceIcon className="h-3.5 w-3.5" />
          وكيل الجهاز
        </span>
        <h1 className="mt-4 text-3xl font-black">اقتران هذا الجهاز</h1>
        <p className="mt-2 max-w-xl text-sm leading-7 text-muted">
          أدخل كود الاقتران الذي ولّدته من لوحة التحكم. سيتحول هذا المتصفح إلى
          وكيل يعرض حالة الجهاز فقط، ولا يشارك الشاشة إلا بطلبك وتأكيدك.
        </p>
      </div>

      {hasExisting && !showForm ? (
        <div className="card mt-6 p-5">
          <div className="flex items-center gap-2">
            <CheckIcon className="h-5 w-5 text-accent" />
            <h2 className="text-base font-bold">هذا المتصفح مقترن بالفعل</h2>
          </div>
          <p className="mt-2 text-sm leading-7 text-muted">
            يمكنك فتح لوحة الجهاز لمتابعة الحالة أو مشاركة الشاشة. إذا أردت
            اقتران جهاز آخر على المتصفح نفسه، امسح الاقتران محلياً أولاً.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/agent" className="btn-primary">
              فتح لوحة الجهاز
            </Link>
            <button type="button" className="btn-ghost" onClick={forgetLocal}>
              اقتران جهاز آخر
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <form className="card p-5" onSubmit={submit}>
            <div className="flex items-center gap-2">
              <KeyIcon className="h-4 w-4 text-brand" />
              <h2 className="text-base font-bold">بيانات الاقتران</h2>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label" htmlFor="pair-code">
                  كود الاقتران
                </label>
                <input
                  id="pair-code"
                  className="input text-center font-mono text-lg tracking-[0.2em]"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  placeholder="ABCD-EFGH"
                  dir="ltr"
                  required
                  minLength={4}
                  maxLength={32}
                  autoComplete="one-time-code"
                />
                <p className="mt-1.5 text-[11px] text-muted">
                  كود من 8 محارف، صالح 10 دقائق، ويُستخدم مرة واحدة.
                </p>
              </div>
              <div>
                <label className="label" htmlFor="device-name">
                  اسم الجهاز
                </label>
                <input
                  id="device-name"
                  className="input"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="مثال: هاتفي الشخصي"
                  required
                  minLength={1}
                  maxLength={60}
                />
              </div>
            </div>

            {error ? (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="btn-primary mt-5 w-full"
              disabled={busy}
            >
              {busy ? "جارٍ الاقتران..." : "اقتران الجهاز"}
            </button>

            {hasExisting ? (
              <button
                type="button"
                onClick={forgetLocal}
                className="btn-ghost mt-2 w-full"
              >
                <CloseIcon className="h-4 w-4" />
                إلغاء والعودة
              </button>
            ) : null}
          </form>

          <div className="space-y-4">
            <div className="card p-5">
              <div className="flex items-center gap-2">
                <ShareIcon className="h-4 w-4 text-brand" />
                <h2 className="text-sm font-bold">ما سيرسله هذا الجهاز</h2>
              </div>
              <ul className="mt-3 space-y-2 text-xs leading-6 text-muted">
                {[
                  "حالة الاتصال وآخر ظهور",
                  "مستوى البطارية وحالة الشحن",
                  "نوع الشبكة ومقاس الشاشة",
                  "اسم الجهاز والمنصة",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card border-danger/20 p-5">
              <div className="flex items-center gap-2">
                <LockIcon className="h-4 w-4 text-danger" />
                <h2 className="text-sm font-bold">ما لا يفعله إطلاقاً</h2>
              </div>
              <ul className="mt-3 space-y-2 text-xs leading-6 text-muted">
                {[
                  "لا رسائل أو مكالمات أو جهات اتصال",
                  "لا ملفات أو كاميرا أو ميكروفون",
                  "لا عمل خفي في الخلفية",
                  "لا تحكم عن بعد أو تنفيذ أوامر",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CloseIcon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-danger" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
