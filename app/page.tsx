import Link from "next/link";
import { Brand } from "@/components/brand";
import {
  AlertIcon,
  BatteryIcon,
  CheckIcon,
  ChevronLeftIcon,
  ClockIcon,
  CloseIcon,
  DeviceIcon,
  EyeIcon,
  HistoryIcon,
  LockIcon,
  ShareIcon,
  ShieldIcon,
  UsersIcon,
  WifiIcon,
} from "@/components/icons";

const features = [
  {
    icon: DeviceIcon,
    title: "حالة كل جهاز",
    body: "البطارية، نوع الشبكة، مقاس الشاشة، وآخر ظهور في لوحة واحدة واضحة.",
  },
  {
    icon: ShareIcon,
    title: "مشاركة شاشة بطلب",
    body: "لا تبدأ إلا بنقرة وتأكيد على الجهاز نفسه، مع شريط أحمر ظاهر وزر إيقاف.",
  },
  {
    icon: UsersIcon,
    title: "مساحات عمل",
    body: "مساحة شخصية، عائلية، أو لفريق صغير، بأدوار مالِك وعضو ومشاهد.",
  },
  {
    icon: HistoryIcon,
    title: "سجل تدقيق",
    body: "كل اقتران ومشاركة وإلغاء وصول يُسجَّل باسم الفاعل ووقته.",
  },
];

const exclusions = [
  "لا تشغيل خفي أو عمل في الخلفية دون إشعار",
  "لا قراءة للرسائل أو المكالمات أو جهات الاتصال",
  "لا كاميرا أو ميكروفون أو تسجيل صوت",
  "لا تحكم عن بعد أو تنفيذ أوامر",
  "لا دمج حمولات أو توليد APK مخادع",
  "لا تجاوز لصلاحيات أندرويد أو حماياتها",
];

const steps = [
  {
    title: "أنشئ مساحة",
    body: "سجّل حسابك لتحصل على مساحة شخصية جاهزة، ثم أنشئ مساحة للعائلة أو الفريق وادعُ من تثق به.",
  },
  {
    title: "اقرن جهازك",
    body: "ولّد كود اقتران قصير العمر، وافتح صفحة الاقتران على الجهاز. الكود يُستخدم مرة واحدة فقط.",
  },
  {
    title: "شارك عند الحاجة",
    body: "الجهاز يرسل حالته فقط. عند الحاجة لمشاركة الشاشة، يظهر طلب على الجهاز ولا يبدأ إلا بموافقتك.",
  },
];

function DevicePreview() {
  return (
    <div className="relative animate-rise">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-brand/10 blur-3xl" />
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
          <div>
            <p className="text-xs text-muted">مساحة العائلة</p>
            <p className="text-sm font-bold">نظرة عامة</p>
          </div>
          <span className="chip-success">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            3 أجهزة
          </span>
        </div>
        <div className="space-y-3 p-5">
          <div className="rounded-xl border border-line/80 bg-panel2/60 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand/10 text-brand">
                  <DeviceIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">هاتف سارة</p>
                  <p className="text-xs text-muted">Android · واي فاي</p>
                </div>
              </div>
              <span className="chip-success">متصل</span>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <BatteryIcon className="h-4 w-4 text-accent" /> 82%
              </span>
              <span className="flex items-center gap-1.5">
                <WifiIcon className="h-4 w-4" /> شبكة مستقرة
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4" /> الآن
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-line/80 bg-panel2/60 p-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent/10 text-accent">
                  <DeviceIcon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold">حاسوب المكتب</p>
                  <p className="text-xs text-muted">Windows · إيثرنت</p>
                </div>
              </div>
              <span className="chip-success">متصل</span>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted">
              <span className="flex items-center gap-1.5">
                <BatteryIcon className="h-4 w-4 text-accent" /> 100%
              </span>
              <span className="flex items-center gap-1.5">
                <WifiIcon className="h-4 w-4" /> كابل
              </span>
              <span className="flex items-center gap-1.5">
                <ClockIcon className="h-4 w-4" /> قبل دقيقة
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-brand/25 bg-brand/5 p-4">
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand/15 text-brand">
                <EyeIcon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">مشاركة شاشة نشطة</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  بدأت بموافقة صريحة على الجهاز. لا يتم حفظ أي إطار، وتنتهي تلقائياً بعد 10 دقائق.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <span className="chip-warn">تنتهي بعد 07:42</span>
                  <span className="chip">إطار مباشر</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-line/70 bg-panel2/40 px-5 py-3 text-[11px] text-muted">
          هذه معاينة توضيحية. لا توجد أي بيانات حقيقية.
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] grid-overlay opacity-60" />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
        <Brand />
        <nav className="hidden items-center gap-7 text-sm text-muted md:flex">
          <a className="transition hover:text-ink" href="#features">
            المزايا
          </a>
          <a className="transition hover:text-ink" href="#how">
            كيف يعمل
          </a>
          <a className="transition hover:text-ink" href="#principles">
            المبادئ
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login" className="btn-ghost btn-sm">
            دخول
          </Link>
          <Link href="/register" className="btn-primary btn-sm">
            ابدأ الآن
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-6xl px-5 pb-20 pt-8 md:pt-14">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="animate-rise">
            <span className="chip border-brand/30 bg-brand/10 text-brand">
              <LockIcon className="h-3.5 w-3.5" />
              بموافقة صريحة · بلا خفاء · بلا تجاوز
            </span>
            <h1 className="mt-5 text-4xl font-black leading-[1.15] text-ink md:text-6xl">
              أجهزتك تحت نظرك،
              <br />
              <span className="text-brand">بموافقتك أنت.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-muted md:text-lg">
              رفيق النسر لوحة شفافة لإدارة أجهزتك الشخصية والعائلية وأجهزة فريقك
              الصغير. تعرف على حالة كل جهاز، وتشارك الشاشة عند الحاجة فقط، بموافقة
              واضحة في كل مرة.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="btn-primary">
                أنشئ مساحتك مجاناً
                <ChevronLeftIcon className="h-4 w-4" />
              </Link>
              <Link href="/pair" className="btn-ghost">
                اقتران جهاز الآن
              </Link>
            </div>
            <ul className="mt-8 grid gap-3 text-sm text-muted sm:grid-cols-3">
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
                لا تسجيل للشاشة
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
                إلغاء وصول فوري
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
                سجل تدقيق كامل
              </li>
            </ul>
          </div>
          <DevicePreview />
        </div>
      </section>

      <section id="features" className="relative border-t border-line/60 bg-[#060b13]/60 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="max-w-2xl">
            <p className="eyebrow">المزايا</p>
            <h2 className="mt-3 text-2xl font-bold md:text-3xl">
              ما تحتاجه فعلاً، دون قدرات خفية
            </h2>
            <p className="mt-3 text-sm leading-7 text-muted">
              صُممت الأداة حول مبدأ واحد: أنت تعرف ما يحدث على أجهزتك، والجهاز
              يعرف ما يشاركه.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="card p-5">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand/10 text-brand ring-1 ring-brand/20">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 text-base font-bold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{feature.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="how" className="relative py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="eyebrow">كيف يعمل</p>
              <h2 className="mt-3 text-2xl font-bold md:text-3xl">
                ثلاث خطوات واضحة
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                لا خطوات مخفية ولا صلاحيات إضافية. كل ما يحدث موضّح أمامك.
              </p>
            </div>
            <ol className="space-y-4">
              {steps.map((step, index) => (
                <li key={step.title} className="card flex gap-4 p-5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand/10 text-sm font-bold text-brand ring-1 ring-brand/25">
                    {index + 1}
                  </span>
                  <div>
                    <h3 className="text-base font-bold">{step.title}</h3>
                    <p className="mt-1.5 text-sm leading-6 text-muted">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section
        id="principles"
        className="relative border-y border-line/60 bg-[#060b13]/60 py-20"
      >
        <div className="mx-auto max-w-6xl px-5">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="eyebrow text-danger/90">حدود صارمة</p>
              <h2 className="mt-3 text-2xl font-bold md:text-3xl">
                ما لا نفعله، ولن نفعله
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted">
                هذه ليست قيوداً تقنية نعتذر عنها، بل هي تعريف المنتج نفسه. أي طلب
                يتجاوزها مرفوض.
              </p>
            </div>
            <span className="chip-danger">
              <AlertIcon className="h-4 w-4" />
              لا أدوات تجسس
            </span>
          </div>
          <div className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exclusions.map((item) => (
              <div
                key={item}
                className="flex items-start gap-3 rounded-xl border border-danger/15 bg-danger/[0.04] p-4 text-sm text-muted"
              >
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
                  <CloseIcon className="h-3 w-3" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="relative py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="card relative overflow-hidden p-8 text-center md:p-12">
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(600px_240px_at_50%_0%,rgba(56,189,248,0.16),transparent)]" />
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand ring-1 ring-brand/25">
              <ShieldIcon className="h-6 w-6" />
            </span>
            <h2 className="mt-5 text-2xl font-bold md:text-3xl">
              ابدأ بمساحة واحدة، وأضف أجهزتك بموافقتك
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
              لا تحتاج إلى تثبيت تطبيق مخفي أو منح صلاحيات واسعة. افتح صفحة
              الاقتران من متصفح الجهاز وابدأ.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/register" className="btn-primary">
                إنشاء حساب
              </Link>
              <Link href="/login" className="btn-ghost">
                لدي حساب
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line/60 py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 text-xs text-muted">
          <Brand />
          <p>أداة إدارة أجهزة بموافقة صريحة. لا تُستخدم للمراقبة الخفية.</p>
          <div className="flex items-center gap-2">
            <LockIcon className="h-3.5 w-3.5" />
            <span>بياناتك تبقى في خادمك</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
