"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Check, CreditCard, Sparkles, Zap, Crown } from "lucide-react"
import { cn } from "@/lib/utils"

const plans = [
  {
    name: "Free",
    description: "Для знакомства с NeiroPeiro",
    monthlyPrice: 0,
    yearlyPrice: 0,
    icon: Sparkles,
    features: [
      "50 сообщений в AI-чате в месяц",
      "10 генераций изображений в месяц",
      "2 генерации видео в месяц",
      "Стандартное качество результатов",
      "Базовая поддержка",
    ],
    notIncluded: [
      "Приоритетная обработка",
      "Доступ к API",
      "Индивидуальная настройка моделей",
    ],
    cta: "Текущий тариф",
    popular: false,
    current: true,
  },
  {
    name: "Pro",
    description: "Для авторов, специалистов и бизнеса",
    monthlyPrice: 990,
    yearlyPrice: 9900,
    icon: Zap,
    features: [
      "Безлимитные сообщения в AI-чате",
      "200 генераций изображений в месяц",
      "50 генераций видео в месяц",
      "HD-качество результатов",
      "Приоритетная обработка",
      "Поддержка по email",
      "Доступ к API",
    ],
    notIncluded: ["Индивидуальная настройка моделей"],
    cta: "Перейти на Pro",
    popular: true,
    current: false,
  },
  {
    name: "Ultra",
    description: "Для команд и активного использования",
    monthlyPrice: 2490,
    yearlyPrice: 24900,
    icon: Crown,
    features: [
      "Безлимитные сообщения в AI-чате",
      "Безлимитная генерация изображений",
      "200 генераций видео в месяц",
      "4K-качество результатов",
      "Максимальный приоритет обработки",
      "Приоритетная поддержка",
      "Доступ к API",
      "Индивидуальная настройка моделей",
      "Командная работа",
      "Аналитика использования",
    ],
    notIncluded: [],
    cta: "Перейти на Ultra",
    popular: false,
    current: false,
  },
]

const faqs = [
  {
    question: "Можно ли отменить подписку в любой момент?",
    answer:
      "Да, подписку можно отменить в любой момент. Тариф останется активным до конца оплаченного периода.",
  },
  {
    question: "Какие способы оплаты будут доступны?",
    answer:
      "На старте можно подключить ЮKassa, CloudPayments или другую платёжную систему. Пока эта страница работает как интерфейс тарифов без реальной оплаты.",
  },
  {
    question: "Переносятся ли неиспользованные кредиты?",
    answer:
      "По умолчанию кредиты обновляются каждый платёжный период. Если нужно, позже можно добавить перенос неиспользованных кредитов.",
  },
  {
    question: "Можно ли сделать индивидуальный тариф?",
    answer:
      "Да, для команд и бизнеса можно добавить отдельный тариф с индивидуальными лимитами, моделями и условиями оплаты.",
  },
]

export default function PricingPage() {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="min-h-screen p-6 pt-16 md:p-8 md:pt-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 text-primary">
            <CreditCard className="h-5 w-5" />
            <span className="text-sm font-medium">Тарифы</span>
          </div>

          <h1 className="mb-4 text-balance text-4xl font-bold">
            Выберите подходящий тариф
          </h1>

          <p className="mx-auto max-w-2xl text-pretty text-lg text-muted-foreground">
            Начните бесплатно и переходите на расширенный тариф, когда
            понадобится больше возможностей. Все тарифы дают доступ к основным
            AI-инструментам NeiroPeiro.
          </p>

          {/* Billing Toggle */}
          <div className="mt-8 flex items-center justify-center gap-3">
            <Label
              htmlFor="billing"
              className={cn(
                !annual && "text-foreground",
                annual && "text-muted-foreground"
              )}
            >
              Ежемесячно
            </Label>

            <Switch
              id="billing"
              checked={annual}
              onCheckedChange={setAnnual}
            />

            <Label
              htmlFor="billing"
              className={cn(
                annual && "text-foreground",
                !annual && "text-muted-foreground"
              )}
            >
              Ежегодно
              <Badge
                variant="secondary"
                className="ml-2 bg-primary/10 text-primary"
              >
                Выгода 20%
              </Badge>
            </Label>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="mb-16 grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={cn(
                "relative flex flex-col border-border bg-card",
                plan.popular && "border-primary shadow-lg shadow-primary/10"
              )}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground">
                    Популярный
                  </Badge>
                </div>
              )}

              <CardHeader className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <plan.icon className="h-6 w-6 text-primary" />
                </div>

                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>

              <CardContent className="flex-1">
                <div className="mb-6 text-center">
                  <span className="text-4xl font-bold">
                    {annual ? plan.yearlyPrice : plan.monthlyPrice} ₽
                  </span>

                  <span className="text-muted-foreground">
                    /{annual ? "год" : "мес."}
                  </span>

                  {annual && plan.monthlyPrice > 0 && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      примерно {Math.round(plan.yearlyPrice / 12)} ₽/мес. при
                      оплате за год
                    </p>
                  )}
                </div>

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}

                  {plan.notIncluded.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-muted-foreground line-through"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 opacity-30" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={
                    plan.current
                      ? "outline"
                      : plan.popular
                        ? "default"
                        : "secondary"
                  }
                  disabled={plan.current}
                >
                  {plan.cta}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* FAQ */}
        <Card className="border-border bg-card">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              Частые вопросы
            </CardTitle>
            <CardDescription>
              Всё, что нужно знать о тарифах и оплате
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {faqs.map((faq, index) => (
                <div key={index} className="space-y-2">
                  <h3 className="font-semibold">{faq.question}</h3>
                  <p className="text-sm text-muted-foreground">
                    {faq.answer}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="mt-12 text-center">
          <p className="text-muted-foreground">
            Нужен индивидуальный тариф для команды?{" "}
            <Button variant="link" className="h-auto p-0 text-primary">
              Связаться с нами
            </Button>
          </p>
        </div>
      </div>
    </div>
  )
}
