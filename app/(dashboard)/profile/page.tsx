"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Coins,
  Crown,
  CreditCard,
  History,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  Save,
  Sparkles,
  User,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AccountSection = "profile" | "pricing" | "tokens";

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  plan: string | null;
  created_at: string | null;
};

const accountItems: Array<{
  id: AccountSection;
  label: string;
  icon: typeof User;
}> = [
  { id: "profile", label: "Профиль", icon: User },
  { id: "pricing", label: "Тарифы", icon: CreditCard },
  { id: "tokens", label: "История токенов", icon: History },
];

function getPlanLabel(plan?: string | null) {
  if (!plan || plan.toLowerCase() === "free") return "Free";
  return plan;
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

async function withTimeout<T>(
  promise: PromiseLike<T>,
  timeoutMs = 12000,
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Время ожидания истекло")),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([Promise.resolve(promise), timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function prepareAvatar(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Выберите изображение JPG, PNG или WEBP.");
  }

  if (file.size > 8 * 1024 * 1024) {
    throw new Error("Размер фотографии не должен превышать 8 МБ.");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new window.Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error("Не удалось прочитать изображение."));
      element.src = objectUrl;
    });

    const size = 512;
    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
    const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Не удалось обработать изображение.");

    context.drawImage(
      image,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      size,
      size,
    );

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Не удалось подготовить аватар."));
        },
        "image/webp",
        0.88,
      );
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeSection, setActiveSection] =
    useState<AccountSection>("profile");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [plan, setPlan] = useState("free");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");

  const [chatsCount, setChatsCount] = useState(0);
  const [messagesCount, setMessagesCount] = useState(0);
  const [imagesCount, setImagesCount] = useState(0);
  const [videosCount, setVideosCount] = useState(0);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [loadError, setLoadError] = useState("");

  const displayName = name.trim() || email.split("@")[0] || "Пользователь";
  const initials = displayName.slice(0, 1).toUpperCase();

  useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      const supabase = createClient();

      setIsLoading(true);
      setLoadError("");
      setErrorMessage("");

      try {
        const authResult = await withTimeout(supabase.auth.getUser());
        const user = authResult.data.user;

        if (!user) {
          if (!cancelled) router.replace("/sign-in");
          return;
        }

        if (cancelled) return;

        setUserId(user.id);
        setEmail(user.email || "");
        setCreatedAt(user.created_at || null);
        setAvatarUrl(
          typeof user.user_metadata?.avatar_url === "string"
            ? user.user_metadata.avatar_url
            : "",
        );

        const profileResult = await withTimeout(
          supabase
            .from("profiles")
            .select("full_name,email,plan,created_at")
            .eq("id", user.id)
            .maybeSingle<ProfileRow>(),
        ).catch((error) => {
          console.error("Load profile row error:", error);
          return { data: null, error };
        });

        const profile = profileResult.data;

        if (!profile) {
          await withTimeout(
            supabase.from("profiles").upsert(
              {
                id: user.id,
                email: user.email || "",
                full_name: "",
                plan: "free",
              },
              { onConflict: "id" },
            ),
          ).catch((error) => {
            console.error("Create profile row error:", error);
          });
        } else if (!cancelled) {
          setName(profile.full_name || "");
          setPlan(profile.plan || "free");
          setCreatedAt(profile.created_at || user.created_at || null);
        }

        const countRequests = [
          supabase
            .from("chats")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("chat_messages")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("image_generations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
          supabase
            .from("video_generations")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),
        ] as const;

        const results = await Promise.allSettled(
          countRequests.map((request) => withTimeout(request, 8000)),
        );

        if (cancelled) return;

        const counts = results.map((result) =>
          result.status === "fulfilled" ? result.value.count || 0 : 0,
        );

        setChatsCount(counts[0]);
        setMessagesCount(counts[1]);
        setImagesCount(counts[2]);
        setVideosCount(counts[3]);
      } catch (error) {
        console.error("Load profile error:", error);
        if (!cancelled) {
          setLoadError(
            "Профиль загружался слишком долго. Проверьте соединение и попробуйте ещё раз.",
          );
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [router, loadAttempt]);

  const handleSave = async () => {
    if (!userId || isSaving) return;

    const supabase = createClient();
    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const profileUpdate = await supabase
        .from("profiles")
        .update({
          full_name: name.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileUpdate.error) throw profileUpdate.error;

      const authUpdate = await supabase.auth.updateUser({
        data: { full_name: name.trim() },
      });

      if (authUpdate.error) throw authUpdate.error;

      setSuccessMessage("Изменения сохранены.");
      window.dispatchEvent(new Event("neiropeiro-profile-updated"));
    } catch (error) {
      console.error("Save profile error:", error);
      setErrorMessage("Не получилось сохранить профиль.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file || !userId || isUploadingAvatar) return;

    const supabase = createClient();
    setIsUploadingAvatar(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const avatar = await prepareAvatar(file);
      const path = `${userId}/${Date.now()}-avatar.webp`;
      const upload = await supabase.storage.from("avatars").upload(path, avatar, {
        contentType: "image/webp",
        cacheControl: "3600",
        upsert: false,
      });

      if (upload.error) throw upload.error;

      const publicUrl = supabase.storage.from("avatars").getPublicUrl(path)
        .data.publicUrl;
      const versionedUrl = `${publicUrl}?v=${Date.now()}`;

      const authUpdate = await supabase.auth.updateUser({
        data: { avatar_url: versionedUrl },
      });

      if (authUpdate.error) throw authUpdate.error;

      setAvatarUrl(versionedUrl);
      setSuccessMessage("Аватар обновлён.");
      window.dispatchEvent(new Event("neiropeiro-profile-updated"));
    } catch (error) {
      console.error("Upload avatar error:", error);
      const message = error instanceof Error ? error.message : "";
      setErrorMessage(
        message.includes("Bucket not found")
          ? "Сначала создайте публичный bucket avatars в Supabase Storage."
          : message || "Не получилось загрузить аватар.",
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.localStorage.removeItem("nexusai_active_chat_id");
    window.location.href = "/sign-in";
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#03050a] p-6 lg:min-h-screen">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
          Загружаем аккаунт...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-[#03050a] p-6 lg:min-h-screen">
        <div className="w-full max-w-md rounded-2xl border border-white/[0.08] bg-white/[0.025] p-6">
          <h1 className="text-lg font-semibold text-white">
            Не удалось загрузить профиль
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">{loadError}</p>
          <Button
            className="mt-5"
            onClick={() => setLoadAttempt((value) => value + 1)}
          >
            Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#03050a] px-4 pb-24 pt-5 text-white [scrollbar-gutter:stable] sm:px-6 lg:h-dvh lg:min-h-0 lg:overflow-y-scroll lg:px-8 lg:pb-10 lg:pt-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5 flex min-h-[58px] items-center justify-between lg:mb-7">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-violet-300/80">
              Аккаунт
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              Настройки профиля
            </h1>
          </div>
          <Link
            href="/chat"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.09] bg-white/[0.035] text-slate-400 transition hover:bg-white/[0.07] hover:text-white"
            aria-label="Закрыть настройки"
          >
            <X className="h-5 w-5" />
          </Link>
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden">
          {accountItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveSection(item.id)}
                className={cn(
                  "flex h-10 shrink-0 items-center gap-2 rounded-xl border px-3 text-sm transition",
                  activeSection === item.id
                    ? "border-violet-400/35 bg-violet-500/12 text-white"
                    : "border-white/[0.07] bg-white/[0.025] text-slate-400",
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
          <aside className="hidden rounded-2xl border border-white/[0.07] bg-[#070a12] p-2 lg:sticky lg:top-8 lg:block">
            <p className="px-3 pb-2 pt-2 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-600">
              Аккаунт
            </p>
            <nav className="space-y-1">
              {accountItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={cn(
                      "flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-left text-sm transition",
                      activeSection === item.id
                        ? "bg-white/[0.07] text-white"
                        : "text-slate-400 hover:bg-white/[0.035] hover:text-slate-200",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <button
              type="button"
              onClick={handleSignOut}
              className="mt-8 flex h-10 w-full items-center gap-2.5 rounded-xl px-3 text-sm text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </button>
          </aside>

          <main className="min-h-[620px] min-w-0 w-full">
            {activeSection === "profile" && (
              <div className="min-h-[620px] w-full space-y-5">
                <section className="rounded-2xl border border-white/[0.075] bg-[#070a12] p-4 sm:p-5">
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                    <div className="relative h-24 w-24 shrink-0">
                      <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 text-3xl font-semibold text-white ring-4 ring-white/[0.035]">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt={displayName}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingAvatar}
                        className="absolute bottom-0 right-0 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-[#111522] text-white shadow-xl transition hover:bg-violet-500 disabled:cursor-wait disabled:opacity-60"
                        aria-label="Изменить аватар"
                      >
                        {isUploadingAvatar ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={handleAvatarChange}
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h2 className="truncate text-xl font-semibold">
                        {displayName}
                      </h2>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-400">
                        <Mail className="h-4 w-4 shrink-0" />
                        {email}
                      </p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex h-7 items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 text-xs text-violet-200">
                          <Sparkles className="h-3.5 w-3.5" />
                          {getPlanLabel(plan)}
                        </span>
                        <span className="text-xs text-slate-600">
                          С нами с {formatDate(createdAt)}
                        </span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="border-white/[0.09] bg-white/[0.025]"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Сменить фото
                    </Button>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/[0.075] bg-[#070a12] p-4 sm:p-5">
                  <div className="mb-5">
                    <h2 className="text-base font-semibold">Данные аккаунта</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Имя отображается в меню и внутри сервиса.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-slate-300">
                        Имя
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        placeholder="Введите имя"
                        className="h-11 border-white/[0.08] bg-white/[0.035]"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-slate-300">
                        Email
                      </Label>
                      <Input
                        id="email"
                        value={email}
                        disabled
                        className="h-11 border-white/[0.06] bg-white/[0.02] text-slate-500"
                      />
                    </div>
                  </div>

                  {(successMessage || errorMessage) && (
                    <div
                      className={cn(
                        "mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm",
                        successMessage
                          ? "border-emerald-400/20 bg-emerald-500/8 text-emerald-300"
                          : "border-rose-400/20 bg-rose-500/8 text-rose-300",
                      )}
                    >
                      {successMessage ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                      {successMessage || errorMessage}
                    </div>
                  )}

                  <Button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="mt-5 bg-gradient-to-r from-violet-500 to-blue-500"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="mr-2 h-4 w-4" />
                    )}
                    Сохранить изменения
                  </Button>
                </section>

                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    { label: "Чаты", value: chatsCount, icon: MessageSquare },
                    { label: "Сообщения", value: messagesCount, icon: Sparkles },
                    { label: "Изображения", value: imagesCount, icon: ImageIcon },
                    { label: "Видео", value: videosCount, icon: Video },
                  ].map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-white/[0.07] bg-[#070a12] p-4"
                      >
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Icon className="h-4 w-4 text-violet-300" />
                          {item.label}
                        </div>
                        <div className="mt-2 text-2xl font-semibold">
                          {item.value}
                        </div>
                      </div>
                    );
                  })}
                </section>
              </div>
            )}

            {activeSection === "pricing" && (
              <div className="min-h-[620px] w-full">
                <section className="rounded-2xl border border-white/[0.075] bg-[#070a12] p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.16em] text-violet-300/80">
                      Текущий тариф
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold">
                      {getPlanLabel(plan)}
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-400">
                      Управляйте тарифом, лимитами генераций и доступными моделями.
                    </p>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/25 to-blue-500/20 text-violet-200">
                    <Crown className="h-8 w-8" />
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    "Чат и базовые модели",
                    "Генерация изображений",
                    "История ваших работ",
                  ].map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-2 rounded-xl border border-white/[0.065] bg-white/[0.025] px-3 py-3 text-sm text-slate-300"
                    >
                      <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                      {feature}
                    </div>
                  ))}
                </div>

                <Link
                  href="/pricing"
                  className="mt-6 inline-flex h-10 items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 px-5 text-sm font-medium text-white transition hover:brightness-110"
                >
                  Посмотреть тарифы
                </Link>
                </section>
              </div>
            )}

            {activeSection === "tokens" && (
              <div className="min-h-[620px] w-full space-y-5">
                <section className="rounded-2xl border border-white/[0.075] bg-[#070a12] p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-300">
                      <Coins className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">История токенов</h2>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                        Здесь будет отображаться точный расход токенов по чатам и генерациям. Сейчас сервис показывает подтверждённую активность аккаунта.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-white/[0.075] bg-[#070a12]">
                  <div className="grid grid-cols-[1fr_auto] border-b border-white/[0.06] px-4 py-3 text-[11px] uppercase tracking-[0.14em] text-slate-600 sm:px-5">
                    <span>Тип активности</span>
                    <span>Количество</span>
                  </div>
                  {[
                    {
                      label: "Сообщения в чатах",
                      value: messagesCount,
                      icon: MessageSquare,
                    },
                    {
                      label: "Генерации изображений",
                      value: imagesCount,
                      icon: ImageIcon,
                    },
                    {
                      label: "Генерации видео",
                      value: videosCount,
                      icon: Video,
                    },
                  ].map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className={cn(
                          "grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-4 sm:px-5",
                          index !== 2 && "border-b border-white/[0.055]",
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.035] text-violet-300">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="text-sm text-slate-300">
                            {item.label}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-white">
                          {item.value}
                        </span>
                      </div>
                    );
                  })}
                </section>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
