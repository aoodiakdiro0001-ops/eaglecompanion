import Link from "next/link";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-5 text-center">
      <Brand />
      <p className="mt-10 text-6xl font-black text-brand">404</p>
      <h1 className="mt-3 text-2xl font-bold">الصفحة غير موجودة</h1>
      <p className="mt-2 text-sm text-muted">
        قد يكون الرابط قديماً أو أن الجهاز لم يعد متاحاً في مساحتك.
      </p>
      <Link href="/app" className="btn-primary mt-6">
        العودة إلى اللوحة
      </Link>
    </main>
  );
}
