"use client";

import Link from "next/link";
import { AlertIcon } from "@/components/icons";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-5 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger ring-1 ring-danger/30">
        <AlertIcon className="h-7 w-7" />
      </span>
      <h1 className="mt-5 text-2xl font-bold">حدث خطأ غير متوقع</h1>
      <p className="mt-2 max-w-md text-sm leading-7 text-muted">
        تعذر إكمال الطلب. يمكنك المحاولة مجدداً، وإذا استمرت المشكلة فارجع إلى
        الصفحة الرئيسية.
      </p>
      {error.digest ? (
        <p className="mt-2 font-mono text-[11px] text-muted">
          المرجع: {error.digest}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={reset} className="btn-primary">
          إعادة المحاولة
        </button>
        <Link href="/app" className="btn-ghost">
          العودة إلى اللوحة
        </Link>
      </div>
    </main>
  );
}
