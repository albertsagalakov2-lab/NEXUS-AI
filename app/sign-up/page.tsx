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

export default function SignUpPage() {
  const router = useRouter()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email.trim() || !password.trim()) return

    setIsLoading(true)
    setError("")
    setMessage("")

    const response = await fetch("/api/auth/sign-up", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, password }),
    }).catch(() => null)
    const result = await response?.json().catch(() => ({}))

    setIsLoading(false)

    if (!response?.ok) {
      if (response?.status === 429) {
        const retryAfter =
          response.headers.get("Retry-After") || result?.retryAfter || 60
        setError(`Слишком много попыток. Повторите через ${retryAfter} сек.`)
      } else if (response?.status === 503) {
        setError("Защита регистрации временно недоступна. Попробуйте через минуту.")
      } else {
        setError(
          String(
            result?.error ||
              "Не получилось зарегистрироваться. Попробуйте другой email."
          )
        )
      }
      return
    }

    if (result?.requiresEmailConfirmation) {
      setMessage(
        "Аккаунт создан. Проверь email и подтверди регистрацию по ссылке."
      )
      return
    }

    router.push("/chat")
    router.refresh()
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black p-4">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </div>

          <CardTitle className="text-2xl">Регистрация</CardTitle>
          <CardDescription>
            Создайте аккаунт NeiroPeiro
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Имя</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ваше имя"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-secondary"
              />
            </div>

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
                placeholder="Минимум 6 символов"
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

            {message && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
                {message}
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
                  Создаём аккаунт...
                </>
              ) : (
                "Создать аккаунт"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Уже есть аккаунт?{" "}
            <Link href="/sign-in" className="text-primary hover:underline">
              Войти
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
