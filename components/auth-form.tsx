"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Brand } from "@/components/brand";
import {
  AlertIcon,
  CheckIcon,
  EyeIcon,
  LockIcon,
  ShieldIcon,
} from "@/components/icons";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const isRegister = mode === "register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (isRegister && password !== confirm) {
      setError("كلمتا المرور غير متطابقتين");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isRegister ? { name, email, password } : { email, password },
        ),
      });
      const data = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!response.ok) {
        setError(data.error ?? "تعذر إتمام العملية، حاول مرة أخرى");
        return;
      }
      router.replace("/app");
      router.refresh();
    } catch {
      setError("تعذر الاتصال بالخادم، تحقق من الشبكة");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] grid-overlay opacity-50" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-2 lg:gap-16">
        <section className="hidden lg:block">
          <Brand />
          <h1 className="mt-10 text-4xl font-black leading-tight">
            مساحة واحدة،
            <br />
            <span className="text-brand">وكل أجهزتك بموافقتك.</span>
          </h1>
          <p className="mt-5 max-w-md text-sm leading-8 text-muted">
            سجّل حسابك لتحصل على مساحة شخصية. لا نطلب أي صلاحيات على جهازك عند
            التسجيل، ولا نراقب أي شيء تلقائياً.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-muted">
            {[
              "اقتران بكود قصير العمر يُستخدم مرة واحدة",
              "مشاركة شاشة لا تبدأ إلا بتأكيدك على الجهاز",
              "إلغاء وصول فوري وسجل تدقيق كامل",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                  <CheckIcon className="h-3 w-3" />
                </span>
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-10 flex items-center gap-3 rounded-2xl border border-line/70 bg-panel2/40 p-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand">
              <ShieldIcon className="h-5 w-5" />
            </span>
            <p className="text-xs leading-6 text-muted">
              لا أدوات تجسس، ولا تشغيل خفي، ولا قراءة لرسائلك أو مكالماتك. هذه
              حدود المنتج وليست إعدادات اختيارية.
            </p>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Brand />
            <Link href="/" className="text-xs text-muted hover:text-ink">
              الرئيسية
            </Link>
          </div>
          <div className="card p-6 md:p-8">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/10 text-brand">
                <LockIcon className="h-4 w-4" />
              </span>
              جلسة مشفّرة بكوكي آمن
            </div>
            <h2 className="mt-4 text-2xl font-bold">
              {isRegister ? "أنشئ حسابك" : "أهلاً بعودتك"}
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              {isRegister
                ? "مساحتك الشخصية جاهزة فور التسجيل."
                : "سجّل الدخول للوصول إلى مساحاتك وأجهزتك."}
            </p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              {isRegister ? (
                <div>
                  <label className="label" htmlFor="name">
                    الاسم
                  </label>
                  <input
                    id="name"
                    className="input"
                    autoComplete="name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="مثال: سارة"
                    required
                    minLength={2}
                    maxLength={60}
                  />
                </div>
              ) : null}

              <div>
                <label className="label" htmlFor="email">
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  type="email"
                  inputMode="email"
                  className="input"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
              />
              </div>

              <div>
                <label className="label" htmlFor="password">
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="input pl-11"
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={isRegister ? "8 محارف على الأقل" : "كلمة المرور"}
                    required
                    minLength={isRegister ? 8 : 1}
                    maxLength={128}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted transition hover:text-ink"
                    aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {isRegister ? (
                <div>
                  <label className="label" htmlFor="confirm">
                    تأكيد كلمة المرور
                  </label>
                  <input
                    id="confirm"
                    type={showPassword ? "text" : "password"}
                    className="input"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(event) => setConfirm(event.target.value)}
                    placeholder="أعد كتابة كلمة المرور"
                    required
                    minLength={8}
                    maxLength={128}
                  />
                </div>
              ) : null}

              {error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
                >
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  {error}
                </div>
              ) : null}

              <button type="submit" className="btn-primary w-full" disabled={busy}>
                {busy
                  ? "جارٍ التنفيذ..."
                  : isRegister
                    ? "إنشاء الحساب"
                    : "تسجيل الدخول"}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-muted">
              {isRegister ? "لديك حساب بالفعل؟ " : "ليس لديك حساب؟ "}
              <Link
                href={isRegister ? "/login" : "/register"}
                className="font-semibold text-brand hover:text-[#7dd3fc]"
              >
                {isRegister ? "تسجيل الدخول" : "إنشاء حساب"}
              </Link>
            </p>
          </div>
          <p className="mt-5 text-center text-[11px] leading-5 text-muted/80">
            بالمتابعة أنت توافق على استخدام الأداة على أجهزة تملكها أو لديك إذن
            صريح لإدارتها فقط.
          </p>
        </section>
      </div>
    </main>
  );
}
