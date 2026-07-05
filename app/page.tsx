import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Bot,
  Check,
  ChevronDown,
  Clock3,
  Film,
  ImageIcon,
  LayoutGrid,
  Menu,
  MessageSquareText,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Star,
  WandSparkles,
  Zap,
} from "lucide-react"

import { BrandMark } from "@/components/brand-mark"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const features = [
  {
    title: "Текстовые запросы",
    description: "Опишите идею простыми словами — нейросеть сделает остальное.",
    icon: MessageSquareText,
  },
  {
    title: "Генерация изображений",
    description: "Создавайте реалистичные арты, иллюстрации и рекламные визуалы.",
    icon: ImageIcon,
  },
  {
    title: "Генерация видео",
    description: "Оживляйте идеи с плавным движением и кинематографичным светом.",
    icon: Film,
  },
  {
    title: "Шаблоны и стили",
    description: "Используйте готовые направления для любых задач и настроений.",
    icon: LayoutGrid,
  },
  {
    title: "Быстрый результат",
    description: "Получайте варианты за секунды и дорабатывайте их прямо в чате.",
    icon: Zap,
  },
  {
    title: "Простой интерфейс",
    description: "Все важные настройки под рукой — ничего не отвлекает от идеи.",
    icon: Bot,
  },
]

const examples = [
  {
    title: "Город будущего",
    subtitle: "Изображение",
    artClass:
      "bg-[radial-gradient(circle_at_50%_82%,rgba(251,146,60,.95),transparent_16%),radial-gradient(circle_at_78%_20%,rgba(217,70,239,.75),transparent_28%),linear-gradient(145deg,#281150_0%,#15437a_52%,#050816_100%)]",
  },
  {
    title: "Неоновый дрифт",
    subtitle: "Видео",
    artClass:
      "bg-[radial-gradient(ellipse_at_50%_75%,rgba(34,211,238,.65),transparent_30%),radial-gradient(circle_at_74%_24%,rgba(236,72,153,.78),transparent_26%),linear-gradient(145deg,#050816,#250d52)]",
  },
  {
    title: "Космическая миссия",
    subtitle: "Изображение",
    artClass:
      "bg-[radial-gradient(circle_at_72%_20%,rgba(226,232,240,.96),transparent_12%),radial-gradient(circle_at_32%_74%,rgba(99,102,241,.45),transparent_26%),linear-gradient(150deg,#111b3b_0%,#030617_65%,#252e56_100%)]",
  },
  {
    title: "Океан на рассвете",
    subtitle: "Видео",
    artClass:
      "bg-[radial-gradient(circle_at_50%_8%,rgba(253,186,116,.88),transparent_19%),radial-gradient(ellipse_at_50%_78%,rgba(34,211,238,.4),transparent_42%),linear-gradient(180deg,#223b75_0%,#0e7490_48%,#020617_100%)]",
  },
  {
    title: "Фэнтези-портрет",
    subtitle: "Изображение",
    artClass:
      "bg-[radial-gradient(circle_at_55%_40%,rgba(186,230,253,.58),transparent_18%),radial-gradient(circle_at_26%_72%,rgba(168,85,247,.58),transparent_28%),linear-gradient(145deg,#0b1637,#281142)]",
  },
]

const plans = [
  {
    name: "Free",
    price: "0 ₽",
    description: "Познакомьтесь с возможностями сервиса",
    features: ["20 генераций в день", "Изображения до 1024×1024", "Базовые стили"],
  },
  {
    name: "Creator",
    price: "990 ₽",
    description: "Для регулярного создания контента",
    features: ["Больше генераций", "Фото и видео", "Все стили и шаблоны"],
    popular: true,
  },
  {
    name: "Pro",
    price: "2 490 ₽",
    description: "Максимум возможностей для работы",
    features: ["Приоритетная очередь", "Высокое качество", "Расширенные лимиты"],
  },
]

const faq = [
  [
    "Какие модели используются для генерации?",
    "NeiroPeiro работает с подключёнными в проекте AI-моделями. Конкретный набор зависит от настроек вашего API.",
  ],
  [
    "Можно ли менять готовый результат?",
    "Да. Продолжайте диалог и попросите изменить стиль, свет, композицию или отдельные детали.",
  ],
  [
    "Нужны ли специальные навыки?",
    "Нет. Достаточно описать желаемый результат обычными словами.",
  ],
  [
    "Где хранятся мои генерации?",
    "История и результаты доступны в аккаунте и сохраняются в подключённом проекте Supabase.",
  ],
]

const stats = [
  [Star, "100+", "шаблонов и стилей"],
  [ImageIcon, "Фото", "высокое качество"],
  [Film, "Видео", "динамичные ролики"],
  [ShieldCheck, "OpenAI", "передовые модели"],
] as const

export default async function LandingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const primaryHref = user ? "/chat" : "/sign-up"
  const primaryLabel = user ? "Открыть чат" : "Начать бесплатно"

  return (
    <main className="relative isolate min-h-screen overflow-x-hidden bg-[#020516] text-white selection:bg-violet-500/40">
      <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_12%_3%,rgba(126,34,206,.2),transparent_26rem),radial-gradient(circle_at_88%_9%,rgba(14,165,233,.17),transparent_29rem)]" />
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:42px_42px]" />

      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#020516]/86 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
          <Link href="/" aria-label="NeiroPeiro AI — главная" className="shrink-0">
            <BrandMark className="[&>div]:h-9 [&>div]:w-9 [&>span]:text-[17px] sm:[&>div]:h-10 sm:[&>div]:w-10 sm:[&>span]:text-xl" />
          </Link>

          <nav className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
            <a href="#features" className="transition hover:text-white">Возможности</a>
            <a href="#examples" className="transition hover:text-white">Примеры</a>
            <a href="#pricing" className="transition hover:text-white">Тарифы</a>
            <a href="#faq" className="transition hover:text-white">FAQ</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            {!user && (
              <Link
                href="/sign-in"
                className="hidden rounded-xl border border-white/15 px-4 py-2.5 text-sm font-medium transition hover:border-white/30 hover:bg-white/5 sm:inline-flex"
              >
                Войти
              </Link>
            )}
            <Link
              href={primaryHref}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-500 px-3.5 py-2.5 text-[12px] font-semibold shadow-[0_0_25px_rgba(139,92,246,.28)] transition hover:brightness-110 sm:gap-2 sm:px-5 sm:text-sm"
            >
              {primaryLabel}
              <ArrowRight className="hidden h-4 w-4 sm:block" />
            </Link>

            <details className="group relative md:hidden">
              <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-slate-200 [&::-webkit-details-marker]:hidden">
                <Menu className="h-5 w-5" />
              </summary>
              <div className="absolute right-0 top-12 w-56 rounded-2xl border border-white/10 bg-[#080d28]/95 p-2 shadow-2xl backdrop-blur-xl">
                {[
                  ["Возможности", "#features"],
                  ["Примеры", "#examples"],
                  ["Тарифы", "#pricing"],
                  ["FAQ", "#faq"],
                ].map(([label, href]) => (
                  <a key={href} href={href} className="block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                    {label}
                  </a>
                ))}
                {!user && (
                  <Link href="/sign-in" className="mt-1 block rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white">
                    Войти
                  </Link>
                )}
              </div>
            </details>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 pb-10 pt-8 sm:px-6 sm:pb-16 sm:pt-14 lg:px-8 lg:pb-24 lg:pt-20">
        <div className="grid items-center gap-8 lg:grid-cols-[.92fr_1.08fr] lg:gap-14">
          <div className="relative z-10">
            <div className="mb-4 hidden items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/[0.08] px-3 py-1.5 text-xs font-medium text-fuchsia-200 sm:inline-flex">
              <Sparkles className="h-3.5 w-3.5" />
              AI для фото, видео и творчества
            </div>

            <div className="grid grid-cols-[1.08fr_.92fr] items-center gap-1 sm:block">
              <div>
                <h1 className="text-balance text-[2rem] font-semibold leading-[1.06] tracking-[-0.04em] min-[390px]:text-[2.25rem] sm:text-6xl lg:text-7xl">
                  Создавайте фото и видео с ИИ{" "}
                  <span className="brand-gradient-text">нового поколения</span>
                </h1>
                <p className="mt-4 max-w-xl text-[13px] leading-5 text-slate-300 min-[390px]:text-sm sm:mt-6 sm:text-lg sm:leading-8">
                  NeiroPeiro AI превращает текстовые идеи в изображения и видео. Просто опишите результат — всё остальное сделает нейросеть.
                </p>
              </div>

              <div className="relative h-44 sm:hidden">
                <div className="absolute inset-2 rounded-full border border-violet-400/25 shadow-[0_0_55px_rgba(139,92,246,.2)]" />
                <Image
                  src="/neiropeiro-mascot.png"
                  alt="Маскот NeiroPeiro AI"
                  fill
                  priority
                  sizes="42vw"
                  className="object-contain drop-shadow-[0_0_28px_rgba(139,92,246,.38)]"
                />
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2.5 sm:mt-8 sm:flex-row sm:gap-3">
              <Link
                href={primaryHref}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 via-violet-500 to-sky-500 px-5 py-3 text-sm font-semibold shadow-[0_0_32px_rgba(139,92,246,.3)] transition hover:-translate-y-0.5 hover:brightness-110 sm:rounded-2xl sm:px-6 sm:py-3.5 sm:text-base"
              >
                {primaryLabel}
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </Link>
              <a
                href="#examples"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/18 bg-white/[0.025] px-5 py-3 text-sm font-semibold transition hover:bg-white/[0.06] sm:rounded-2xl sm:px-6 sm:py-3.5 sm:text-base"
              >
                Смотреть примеры
                <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5" />
              </a>
            </div>

            <div className="mt-7 hidden flex-wrap items-center gap-4 text-sm text-slate-400 sm:flex">
              <div className="flex -space-x-2">
                {["AS", "MK", "EL", "IP"].map((name, index) => (
                  <div
                    key={name}
                    className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#030617] bg-gradient-to-br from-violet-500 to-sky-500 text-[10px] font-bold"
                    style={{ opacity: 1 - index * 0.08 }}
                  >
                    {name}
                  </div>
                ))}
              </div>
              <div>
                <div className="flex gap-0.5 text-amber-300">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Star key={index} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-1">Уже используют создатели контента</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-2xl sm:block">
            <div className="absolute left-[12%] top-[2%] h-64 w-64 rounded-full bg-fuchsia-500/20 blur-3xl" />
            <div className="absolute right-[4%] top-[18%] h-72 w-72 rounded-full bg-sky-500/18 blur-3xl" />

            <div className="brand-panel relative min-h-[520px] overflow-hidden rounded-[2rem] bg-[#070b25]/80 p-6 shadow-[0_30px_90px_rgba(0,0,0,.45)] lg:min-h-[560px] lg:p-8">
              <div className="absolute inset-x-8 top-6 h-72 rounded-full border border-violet-400/25" />
              <div className="absolute right-10 top-20 h-44 w-44 rounded-full border border-cyan-400/15" />

              <div className="relative mx-auto h-[330px] max-w-[440px] lg:h-[360px]">
                <Image
                  src="/neiropeiro-mascot.png"
                  alt="Маскот NeiroPeiro AI"
                  fill
                  priority
                  sizes="(max-width: 1024px) 70vw, 520px"
                  className="object-contain drop-shadow-[0_0_42px_rgba(139,92,246,.38)]"
                />
              </div>

              <PromptDemo primaryHref={primaryHref} />
            </div>
          </div>
        </div>

        <div className="mt-4 sm:hidden">
          <PromptDemo primaryHref={primaryHref} compact />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="brand-panel grid grid-cols-2 overflow-hidden rounded-2xl bg-white/[0.025] min-[430px]:grid-cols-4 sm:rounded-3xl">
          {stats.map(([Icon, title, text], index) => (
            <div
              key={title}
              className={`flex min-h-28 flex-col items-center justify-center gap-2 p-3 text-center min-[430px]:min-h-32 sm:min-h-0 sm:flex-row sm:justify-start sm:gap-4 sm:p-6 sm:text-left ${
                index % 2 !== 0 ? "border-l border-white/[0.08]" : ""
              } ${index >= 2 ? "border-t border-white/[0.08] min-[430px]:border-t-0" : ""} ${
                index > 0 ? "min-[430px]:border-l" : ""
              }`}
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300 sm:h-11 sm:w-11 sm:rounded-2xl">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold sm:text-base">{title}</p>
                <p className="mt-1 text-[11px] leading-4 text-slate-400 sm:text-sm">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <SectionHeading eyebrow="Возможности" title="Всё для вашей креативности" subtitle="Мощные инструменты в простом и понятном интерфейсе." />

        <div className="mt-8 grid grid-cols-2 gap-3 min-[520px]:grid-cols-3 sm:mt-12 sm:gap-4">
          {features.map(({ title, description, icon: Icon }) => (
            <article key={title} className="brand-panel nexusai-card-hover rounded-2xl bg-white/[0.025] p-4 sm:rounded-3xl sm:p-6">
              <div className="mx-auto grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500/18 to-sky-500/18 text-fuchsia-300 sm:mx-0 sm:h-12 sm:w-12 sm:rounded-2xl">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </div>
              <h3 className="mt-3 text-center text-[13px] font-semibold leading-5 sm:mt-5 sm:text-left sm:text-lg">{title}</h3>
              <p className="mt-1.5 text-center text-[11px] leading-4 text-slate-400 sm:mt-2 sm:text-left sm:text-base sm:leading-7">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="examples" className="border-y border-white/[0.08] bg-white/[0.018] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end sm:gap-5">
            <div>
              <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-sky-300 sm:text-left sm:text-sm">Примеры</p>
              <h2 className="mt-2 text-center text-2xl font-semibold tracking-tight sm:mt-3 sm:text-left sm:text-5xl">Примеры генераций</h2>
            </div>
            <div className="flex justify-center gap-2 sm:justify-end">
              {['Все', 'Изображения', 'Видео'].map((label, index) => (
                <span key={label} className={`rounded-full px-3 py-1 text-[11px] sm:text-xs ${index === 0 ? 'bg-gradient-to-r from-fuchsia-500 to-violet-500 text-white' : 'border border-white/10 bg-white/[0.03] text-slate-400'}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>

          <div className="-mx-4 mt-7 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-10 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
            {examples.map((example, index) => (
              <article
                key={example.title}
                className={`group relative min-h-44 min-w-[68vw] snap-center overflow-hidden rounded-2xl border border-white/10 sm:min-h-64 sm:min-w-0 sm:rounded-3xl ${example.artClass}`}
              >
                <div className="absolute inset-0 opacity-65 [background-image:linear-gradient(120deg,transparent_0_48%,rgba(255,255,255,.07)_49%_51%,transparent_52%_100%)] [background-size:28px_28px]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_30%,rgba(2,6,23,.92)_100%)]" />
                <div className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-xl border border-white/15 bg-black/25 backdrop-blur-md sm:left-5 sm:top-5 sm:h-11 sm:w-11 sm:rounded-2xl">
                  {example.subtitle === "Видео" ? <PlayCircle className="h-4 w-4 sm:h-5 sm:w-5" /> : <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
                </div>
                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-6">
                  <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-slate-300 sm:text-xs">{example.subtitle}</p>
                  <h3 className="mt-1 text-base font-semibold sm:mt-2 sm:text-xl">{example.title}</h3>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-5 text-center">
            <Link href={primaryHref} className="inline-flex items-center gap-2 text-sm font-semibold text-violet-300 hover:text-violet-200">
              Смотреть больше примеров
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <SectionHeading eyebrow="Тарифы" title="Простые и честные тарифы" subtitle="Начните бесплатно и подключите больше возможностей, когда они понадобятся." />

        <div className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:mt-12 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`brand-panel relative min-w-[82vw] snap-center rounded-2xl p-5 min-[500px]:min-w-[60vw] sm:min-w-0 sm:rounded-3xl sm:p-7 ${
                plan.popular
                  ? "border-violet-400/45 bg-violet-500/[0.07] shadow-[0_0_55px_rgba(124,58,237,.16)]"
                  : "bg-white/[0.025]"
              }`}
            >
              {plan.popular && (
                <span className="absolute right-4 top-4 rounded-full bg-gradient-to-r from-fuchsia-500 to-sky-500 px-2.5 py-1 text-[10px] font-semibold sm:right-5 sm:top-5 sm:px-3 sm:text-xs">
                  Популярный
                </span>
              )}
              <h3 className="text-lg font-semibold sm:text-xl">{plan.name}</h3>
              <p className="mt-2 min-h-10 text-xs leading-5 text-slate-400 sm:min-h-12 sm:text-sm sm:leading-6">{plan.description}</p>
              <p className="mt-5 text-3xl font-semibold tracking-tight sm:mt-6 sm:text-4xl">
                {plan.price}<span className="ml-1 text-xs font-normal text-slate-400 sm:text-sm">/ мес.</span>
              </p>
              <ul className="mt-5 space-y-2.5 sm:mt-6 sm:space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2.5 text-xs text-slate-300 sm:gap-3 sm:text-sm">
                    <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href={primaryHref}
                className={`mt-7 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold transition sm:mt-8 ${
                  plan.popular
                    ? "bg-gradient-to-r from-fuchsia-500 to-sky-500 hover:brightness-110"
                    : "border border-white/15 bg-white/[0.025] hover:bg-white/[0.06]"
                }`}
              >
                {plan.name === "Free" ? "Начать бесплатно" : "Выбрать план"}
              </Link>
            </article>
          ))}
        </div>
        <p className="mt-2 text-center text-[11px] text-slate-500 sm:mt-4 sm:text-xs">Можно отменить в любой момент. Без скрытых платежей.</p>
      </section>

      <section id="faq" className="mx-auto max-w-5xl px-4 pb-16 sm:px-6 sm:pb-24 lg:px-8">
        <SectionHeading eyebrow="FAQ" title="Часто задаваемые вопросы" />

        <div className="mt-8 space-y-2.5 sm:mt-10 sm:space-y-3">
          {faq.map(([question, answer]) => (
            <details key={question} className="group brand-panel rounded-xl bg-white/[0.025] px-4 py-3.5 open:bg-white/[0.04] sm:rounded-2xl sm:px-5 sm:py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium sm:text-base">
                {question}
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180 sm:h-5 sm:w-5" />
              </summary>
              <p className="pr-6 pt-3 text-xs leading-5 text-slate-400 sm:pr-8 sm:text-base sm:leading-7">{answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-8 sm:px-6 sm:pb-12 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-fuchsia-600 via-violet-600 to-sky-500 px-5 py-7 shadow-[0_30px_90px_rgba(76,29,149,.28)] sm:rounded-[2rem] sm:px-10 sm:py-10 lg:px-12">
          <div className="absolute -right-10 -top-20 h-72 w-72 rounded-full border border-white/20" />
          <div className="absolute bottom-[-4.5rem] right-[-1.5rem] h-52 w-52 sm:right-12 sm:h-60 sm:w-60">
            <Image src="/neiropeiro-mascot.png" alt="NeiroPeiro" fill sizes="240px" className="object-contain object-bottom opacity-95" />
          </div>
          <div className="relative max-w-[68%] sm:max-w-none lg:grid lg:grid-cols-[1fr_auto] lg:items-center lg:gap-8">
            <div>
              <h2 className="text-xl font-semibold tracking-tight min-[390px]:text-2xl sm:text-4xl">Готовы создавать без границ?</h2>
              <p className="mt-2 text-xs leading-5 text-white/80 sm:mt-3 sm:max-w-2xl sm:text-base sm:leading-7">Откройте NeiroPeiro AI, напишите первую идею и получите результат прямо в чате.</p>
            </div>
            <Link href={primaryHref} className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-950 transition hover:-translate-y-0.5 sm:mt-6 sm:rounded-2xl sm:px-6 sm:py-3.5 sm:text-base lg:mt-0">
              {primaryLabel}
              <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.08]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:grid-cols-2 sm:px-6 sm:py-10 lg:grid-cols-[1.5fr_1fr_1fr_1fr] lg:px-8">
          <div>
            <BrandMark className="[&>div]:h-9 [&>div]:w-9 [&>span]:text-lg" />
            <p className="mt-3 max-w-xs text-xs leading-5 text-slate-400 sm:mt-4 sm:text-sm sm:leading-6">Генерация изображений и видео в удобном AI-чате.</p>
          </div>
          <div>
            <p className="text-sm font-semibold sm:text-base">Продукт</p>
            <div className="mt-3 space-y-2 text-xs text-slate-400 sm:mt-4 sm:space-y-3 sm:text-sm">
              <a href="#features" className="block hover:text-white">Возможности</a>
              <a href="#examples" className="block hover:text-white">Примеры</a>
              <a href="#pricing" className="block hover:text-white">Тарифы</a>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold sm:text-base">Аккаунт</p>
            <div className="mt-3 space-y-2 text-xs text-slate-400 sm:mt-4 sm:space-y-3 sm:text-sm">
              <Link href="/sign-in" className="block hover:text-white">Войти</Link>
              <Link href="/sign-up" className="block hover:text-white">Регистрация</Link>
              <Link href="/chat" className="block hover:text-white">Открыть чат</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold sm:text-base">Надёжность</p>
            <div className="mt-3 space-y-2 text-xs text-slate-400 sm:mt-4 sm:space-y-3 sm:text-sm">
              <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Защищённый аккаунт</p>
              <p className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> История генераций</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/[0.08] px-4 py-4 text-center text-[10px] text-slate-500 sm:px-5 sm:py-5 sm:text-xs">© 2026 NeiroPeiro AI. Все права защищены.</div>
      </footer>
    </main>
  )
}

function PromptDemo({ primaryHref, compact = false }: { primaryHref: string; compact?: boolean }) {
  return (
    <div className={`brand-panel relative rounded-2xl bg-[#0a1131]/92 p-3.5 shadow-[0_18px_65px_rgba(0,0,0,.4)] sm:rounded-3xl sm:p-5 ${compact ? "" : "-mt-5"}`}>
      <div className="mb-2.5 flex items-center gap-2 text-xs font-medium text-fuchsia-200 sm:mb-3 sm:text-sm">
        <WandSparkles className="h-4 w-4" />
        Опишите, что хотите создать
      </div>
      <div className="rounded-xl border border-white/10 bg-[#05091d] p-3 text-xs leading-5 text-slate-300 sm:rounded-2xl sm:p-4 sm:text-sm sm:leading-6">
        Космический город на закате, летающие машины, неоновые огни, кинематографичный свет
      </div>
      <div className="mt-2.5 grid grid-cols-[1fr_auto] gap-2 sm:mt-3 sm:gap-3">
        <div className="flex min-w-0 gap-2">
          <span className="truncate rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-2 text-[10px] text-slate-300 sm:rounded-xl sm:px-3 sm:text-xs">Изображение</span>
          <span className="rounded-lg border border-white/10 bg-white/[0.035] px-2.5 py-2 text-[10px] text-slate-300 sm:rounded-xl sm:px-3 sm:text-xs">16:9</span>
        </div>
        <Link
          href={primaryHref}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-sky-500 px-3 py-2 text-[10px] font-semibold sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-sm"
        >
          Сгенерировать
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Link>
      </div>
    </div>
  )
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300 sm:text-sm">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:mt-3 sm:text-5xl">{title}</h2>
      {subtitle && <p className="mt-3 text-sm leading-6 text-slate-400 sm:mt-4 sm:text-lg">{subtitle}</p>}
    </div>
  )
}
