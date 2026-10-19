"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CopyButton } from "./copy-button";
import {
  AlertIcon,
  CloseIcon,
  KeyIcon,
  LinkIcon,
  PlusIcon,
  RefreshIcon,
} from "./icons";

interface PairDeviceDialogProps {
  workspaceId: string;
  canManage: boolean;
}

interface CodeState {
  code: string;
  expiresAt: number;
}

export function PairDeviceDialog({
  workspaceId,
  canManage,
}: PairDeviceDialogProps) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState<CodeState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const generate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/devices/pairing-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = (await response.json().catch(() => ({}))) as {
        code?: string;
        expiresAt?: number;
        error?: string;
      };
      if (!response.ok || !data.code || !data.expiresAt) {
        setError(data.error ?? "تعذر توليد كود الاقتران");
        return;
      }
      setCode({ code: data.code, expiresAt: data.expiresAt });
      setNow(Date.now());
    } catch {
      setError("تعذر الاتصال بالخادم");
    } finally {
      setBusy(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    if (!open || !code) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open, code]);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const remaining = code
    ? Math.max(0, Math.floor((code.expiresAt - now) / 1000))
    : 0;
  const minutes = String(Math.floor(remaining / 60)).padStart(2, "0");
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <>
      <button
        type="button"
        className="btn-primary"
        onClick={() => {
          setOpen(true);
          if (canManage && !code) void generate();
        }}
        disabled={!canManage}
        title={canManage ? undefined : "إضافة الأجهزة متاحة للمالك والعضو فقط"}
      >
        <PlusIcon className="h-4 w-4" />
        إضافة جهاز
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pair-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-label="إغلاق"
          />
          <div className="card relative w-full max-w-lg animate-rise p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
                  <KeyIcon className="h-5 w-5" />
                </span>
                <div>
                  <h2 id="pair-title" className="text-lg font-bold">
                    اقتران جهاز جديد
                  </h2>
                  <p className="text-xs text-muted">
                    الكود يُستخدم مرة واحدة وينتهي بعد 10 دقائق.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-muted hover:bg-panel2"
                aria-label="إغلاق"
              >
                <CloseIcon className="h-5 w-5" />
              </button>
            </div>

            {!canManage ? (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
                <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                دورك الحالي مشاهد فقط. إضافة الأجهزة متاحة للمالك والعضو.
              </div>
            ) : (
              <>
                <ol className="mt-5 space-y-2 text-sm text-muted">
                  <li className="flex gap-2">
                    <span className="font-bold text-brand">1.</span>
                    افتح صفحة الاقتران على الجهاز الذي تريد إدارته.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-brand">2.</span>
                    أدخل الكود واسم الجهاز هناك.
                  </li>
                  <li className="flex gap-2">
                    <span className="font-bold text-brand">3.</span>
                    سيرسل الجهاز حالته فقط، ولن يشارك الشاشة إلا بطلبك وتأكيدك.
                  </li>
                </ol>

                <div className="mt-5 rounded-2xl border border-brand/25 bg-brand/5 p-5 text-center">
                  <p className="text-xs text-muted">كود الاقتران</p>
                  {code ? (
                    <>
                      <p className="mt-2 font-mono text-3xl font-black tracking-[0.2em] text-brand" dir="ltr">
                        {code.code}
                      </p>
                      <p className="mt-2 text-xs text-muted">
                        {remaining > 0 ? (
                          <>
                            ينتهي بعد{" "}
                            <span className="font-mono text-ink" dir="ltr">
                              {minutes}:{seconds}
                            </span>
                          </>
                        ) : (
                          "انتهت صلاحية الكود، ولّد كوداً جديداً"
                        )}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        <CopyButton value={code.code} label="نسخ الكود" />
                        <button
                          type="button"
                          className="btn-ghost btn-sm"
                          onClick={() => void generate()}
                          disabled={busy}
                        >
                          <RefreshIcon className="h-4 w-4" />
                          كود جديد
                        </button>
                      </div>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="btn-primary mt-3"
                      onClick={() => void generate()}
                      disabled={busy}
                    >
                      <RefreshIcon className="h-4 w-4" />
                      {busy ? "جارٍ التوليد..." : "توليد الكود"}
                    </button>
                  )}
                </div>

                {error ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger">
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </div>
                ) : null}

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <Link
                    href="/pair"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold text-brand hover:text-[#7dd3fc]"
                  >
                    <LinkIcon className="h-4 w-4" />
                    افتح صفحة الاقتران
                  </Link>
                  <span className="text-muted">
                    لا يُطلب من الجهاز أي صلاحية خفية.
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
