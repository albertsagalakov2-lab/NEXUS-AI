"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, Sparkles } from "lucide-react"

export default function SignInPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) return

    setIsLoading(true)
    setError("")

    const response = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }).catch(() => null)
    const result = await response?.json().catch(() => ({}))

    setIsLoading(false)

    if (!response?.ok) {
      const message = String(
        result?.error || "Не удалось подключиться к серверу"
      )
      const lowerMessage = message.toLowerCase()

      if (response?.status === 429) {
        const retryAfter =
          response.headers.get("Retry-After") || result?.retryAfter || 60
        setError(`Слишком много попыток. Повторите через ${retryAfter} сек.`)
      } else if (response?.status === 503) {
        setError("Защита входа временно недоступна. Попробуйте через минуту.")
      } else if (lowerMessage.includes("email not confirmed")) {
        setError("Email не подтвержден. Подтверди почту в Supabase или отключи подтверждение email.")
      } else if (lowerMessage.includes("invalid login credentials")) {
        setError("Supabase отклонил логин или пароль. Проверь, что пользователь создан именно в этом Supabase-проекте и пароль задан.")
      } else {
        setError(`Supabase: ${message}`)
      }
      return
    }

    const params = new URLSearchParams(window.location.search)
    const next = params.get("next") || "/chat"

    router.push(next)
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>

          <CardTitle className="text-2xl">Вход в NeiroPeiro</CardTitle>
          <CardDescription>
            Войдите в аккаунт, чтобы продолжить
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Введите пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !email.trim() || !password.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Входим...
                </>
              ) : (
                "Войти"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Нет аккаунта?{" "}
            <Link href="/sign-up" className="text-primary hover:underline">
              Зарегистрироваться
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
