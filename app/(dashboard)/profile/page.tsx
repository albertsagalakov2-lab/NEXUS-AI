"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
  BadgeHelp,
  Building2,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Coins,
  Crown,
  CreditCard,
  FolderKanban,
  Handshake,
  History,
  Image as ImageIcon,
  LifeBuoy,
  Loader2,
  LogOut,
  Mail,
  MessageSquare,
  MonitorPlay,
  MoreHorizontal,
  Pencil,
  Save,
  Sparkles,
  Settings,
  User,
  Video,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type AccountSection =
  | "profile"
  | "organization"
  | "settings"
  | "media"
  | "partner"
  | "support"
  | "more"
  | "pricing"
  | "tokens";

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
  { id: "settings", label: "Настройки", icon: Settings },
  { id: "media", label: "Медиа", icon: MonitorPlay },
  { id: "partner", label: "Партнёрство", icon: Handshake },
  { id: "support", label: "Поддержка", icon: LifeBuoy },
  { id: "more", label: "Ещё", icon: MoreHorizontal },
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
  const [draftName, setDraftName] = useState("");
  const [plan, setPlan] = useState("free");
  const [createdAt, setCreatedAt] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);

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
          setDraftName(profile.full_name || "");
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

  const handleSave = async (nextName = name) => {
    if (!userId || isSaving) return;

    const supabase = createClient();
    setIsSaving(true);
    setSuccessMessage("");
    setErrorMessage("");

    const normalizedName = nextName.trim();

    try {
      const profileUpdate = await supabase
        .from("profiles")
        .update({
          full_name: normalizedName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", userId);

      if (profileUpdate.error) throw profileUpdate.error;

      const authUpdate = await supabase.auth.updateUser({
        data: { full_name: normalizedName },
      });

      if (authUpdate.error) throw authUpdate.error;

      setName(normalizedName);
      setDraftName(normalizedName);
      setIsEditingName(false);
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

  const renderMobileMenuItem = (
    id: AccountSection,
    description?: string,
  ) => {
    const item = accountItems.find((entry) => entry.id === id);
    if (!item) return null;

    const Icon = item.icon;

    return (
      <button
        key={id}
        type="button"
        onClick={() => setActiveSection(id)}
        className={cn(
          "flex w-full items-center gap-4 rounded-2xl px-1 py-3 text-left transition",
          activeSection === id ? "text-white" : "text-slate-300",
        )}
      >
        <Icon className="h-5 w-5 shrink-0 text-slate-200" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-medium leading-6">
            {item.label}
          </span>
          {description && (
            <span className="mt-0.5 block truncate text-sm text-slate-500">
              {description}
            </span>
          )}
        </span>
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
      </button>
    );
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
    <div className="h-full min-h-0 overflow-y-auto bg-[#03050a] px-3 pb-24 pt-4 text-white [scrollbar-gutter:stable] sm:px-6 lg:h-dvh lg:px-8 lg:pb-10 lg:pt-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-4 flex min-h-[52px] items-center justify-between gap-3 lg:mb-7">
          <div>
            <p className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-violet-300/80 sm:block">
              Аккаунт
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-3xl">
              Профиль и настройки
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

        {activeSection === "profile" && (
        <div className="mb-6 lg:hidden">
          <section className="rounded-[28px] border border-white/[0.07] bg-black px-4 py-6 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-cyan-400 via-violet-500 to-fuchsia-500 text-3xl font-semibold text-white ring-1 ring-white/10">
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
            <h2 className="mt-4 truncate text-2xl font-semibold text-white">
              {displayName}
            </h2>
            <p className="mt-1 truncate text-sm text-slate-400">{email}</p>

            <button
              type="button"
              onClick={() => router.push("/pricing")}
              className="mt-7 flex w-full items-center gap-3 rounded-2xl px-1 py-3 text-left text-white"
            >
              <span className="min-w-0 flex-1 text-[17px] font-medium">
                {plan && plan.toLowerCase() !== "free"
                  ? getPlanLabel(plan)
                  : "Нет подписки"}
              </span>
              <Sparkles className="h-5 w-5 shrink-0 text-slate-300" />
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-600" />
            </button>
          </section>

          <div className="mt-7 space-y-7">
            <section>
              <p className="mb-3 text-sm font-medium text-slate-500">
                Управление
              </p>
              <div className="space-y-1">
                {renderMobileMenuItem("settings")}
              </div>
            </section>

            <section className="border-t border-white/[0.1] pt-5">
              <p className="mb-3 text-sm font-medium text-slate-500">
                Сервисы
              </p>
              <div className="space-y-1">
                {renderMobileMenuItem("media", "Изображения, видео и проекты")}
                {renderMobileMenuItem("pricing", "Подписки и лимиты")}
                {renderMobileMenuItem("tokens", "История расхода")}
                {renderMobileMenuItem("partner")}
                {renderMobileMenuItem("support")}
                {renderMobileMenuItem("more")}
              </div>
            </section>

            <section className="border-t border-white/[0.1] pt-5">
              <button
                type="button"
                onClick={handleSignOut}
                className="flex w-full items-center gap-4 rounded-2xl px-1 py-3 text-left text-slate-300 transition hover:text-rose-300"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span className="text-[17px] font-medium">Выйти</span>
              </button>
            </section>
          </div>
        </div>
        )}

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

          <main
            className={cn(
              "min-h-[620px] min-w-0 w-full",
              activeSection === "profile" && "hidden lg:block",
            )}
          >
            {activeSection !== "profile" && (
              <button
                type="button"
                onClick={() => setActiveSection("profile")}
                className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white lg:hidden"
              >
                <ChevronLeft className="h-4 w-4" />
                Профиль и настройки
              </button>
            )}
            {activeSection === "profile" && (
              <div className="min-h-[620px] w-full space-y-4 sm:space-y-5">
                <section className="rounded-2xl border border-white/[0.075] bg-[#070a12] p-3.5 sm:p-5">
                  <div className="flex items-center gap-3 sm:gap-5">
                    <div className="relative h-16 w-16 shrink-0 sm:h-24 sm:w-24">
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
                      {isEditingName && (
                        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                          <input
                            value={draftName}
                            onChange={(event) => setDraftName(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") handleSave(draftName);
                              if (event.key === "Escape") {
                                setDraftName(name);
                                setIsEditingName(false);
                              }
                            }}
                            placeholder="Введите имя"
                            className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-white/[0.035] px-3 text-sm font-semibold text-white outline-none transition placeholder:text-slate-600 focus:border-white/[0.16] sm:text-base"
                            autoFocus
                          />
                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleSave(draftName)}
                              disabled={isSaving}
                              className="inline-flex h-9 flex-1 items-center justify-center rounded-full bg-white px-3 text-xs font-medium text-black transition hover:bg-slate-200 disabled:cursor-wait disabled:opacity-70 sm:h-10 sm:flex-none sm:px-4 sm:text-sm"
                            >
                              {isSaving ? "Сохраняем..." : "Сохранить"}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setDraftName(name);
                                setIsEditingName(false);
                                setSuccessMessage("");
                                setErrorMessage("");
                              }}
                              className="inline-flex h-9 flex-1 items-center justify-center rounded-full border border-white/[0.16] px-3 text-xs font-medium text-white transition hover:bg-white/[0.06] sm:h-10 sm:flex-none sm:px-4 sm:text-sm"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      )}
                      <div className={cn("min-w-0 items-center gap-2", isEditingName ? "hidden" : "flex")}>
                          <h2 className="truncate text-lg font-semibold sm:text-xl">
                          {displayName}
                        </h2>
                        <button
                          type="button"
                          onClick={() => {
                            setDraftName(name);
                            setIsEditingName(true);
                            setSuccessMessage("");
                            setErrorMessage("");
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white/[0.06] hover:text-white"
                          aria-label="Изменить имя"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 truncate text-sm text-slate-400">
                        <Mail className="h-4 w-4 shrink-0" />
                        {email}
                      </p>
                      {false && isEditingName && (
                        <div className="mt-4 max-w-lg rounded-2xl border border-white/[0.075] bg-white/[0.025] p-3">
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <input
                              value={draftName}
                              onChange={(event) => setDraftName(event.target.value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") handleSave(draftName);
                                if (event.key === "Escape") {
                                  setDraftName(name);
                                  setIsEditingName(false);
                                }
                              }}
                              placeholder="Введите имя"
                              className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#0b0f19] px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-white/[0.16]"
                              autoFocus
                            />
                            <Button
                              type="button"
                              onClick={() => handleSave(draftName)}
                              disabled={isSaving}
                              className="h-10 bg-gradient-to-r from-violet-500 to-blue-500"
                            >
                              {isSaving ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="mr-2 h-4 w-4" />
                              )}
                              Сохранить
                            </Button>
                          </div>
                          {(successMessage || errorMessage) && (
                            <div
                              className={cn(
                                "mt-3 flex items-center gap-2 rounded-xl border px-3 py-2 text-sm",
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
                        </div>
                      )}
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
                      className="hidden border-white/[0.09] bg-white/[0.025] sm:inline-flex"
                    >
                      <Camera className="mr-2 h-4 w-4" />
                      Сменить фото
                    </Button>
                  </div>
                </section>

                <section className="grid gap-3 sm:gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-white/[0.075] bg-[#070a12] p-3.5 sm:p-5">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                      <CreditCard className="h-4 w-4 text-violet-300" />
                      Тариф
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-white sm:mt-4">
                      {getPlanLabel(plan)}
                    </div>
                    <p className="mt-1 text-sm text-slate-400">
                      5 запросов в день на базовом плане.
                    </p>
                    <Link
                      href="/pricing"
                      className="mt-4 flex h-10 items-center justify-center rounded-xl bg-white text-sm font-medium text-black transition hover:bg-slate-200"
                    >
                      Купить подписку
                    </Link>
                  </div>

                  <div className="rounded-2xl border border-white/[0.075] bg-[#070a12] p-3.5 sm:p-5">
                    <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                      <Sparkles className="h-4 w-4 text-violet-300" />
                      Доп. токены
                    </div>
                    <div className="mt-3 text-2xl font-semibold text-white sm:mt-4">0</div>
                    <p className="mt-1 text-sm text-slate-400">
                      Доступны после оформления подписки.
                    </p>
                    <Link
                      href="/pricing"
                      className="mt-4 flex h-10 items-center justify-center rounded-xl bg-white text-sm font-medium text-black transition hover:bg-slate-200"
                    >
                      Купить токены
                    </Link>
                  </div>
                </section>

                <section className="rounded-2xl border border-white/[0.075] bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.22),rgba(255,255,255,0.035)_42%,rgba(7,10,18,0.96)_100%)] p-3.5 shadow-[0_24px_80px_rgba(0,0,0,0.32)] sm:p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-300">
                        <Handshake className="h-4 w-4 text-violet-200" />
                        Партнёрская программа
                      </div>
                      <h2 className="mt-3 text-base font-semibold text-white">
                        Реферальная ссылка уже готова
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection("partner")}
                      className="inline-flex h-9 items-center justify-center rounded-full bg-white/[0.08] px-4 text-xs font-medium text-white transition hover:bg-white/[0.12]"
                    >
                      Кабинет
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/[0.07] px-3 py-3 text-sm text-white">
                    <span className="min-w-0 truncate">
                      https://neiropeiro.ai/ref/{userId.slice(0, 8) || "profile"}
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">копия</span>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-white/[0.06] p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                        Баланс
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">0 ₽</p>
                    </div>
                    <div className="rounded-xl bg-white/[0.06] p-3">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-slate-400">
                        Бонус
                      </p>
                      <p className="mt-2 text-base font-semibold text-white">10%</p>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
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
                        className="rounded-2xl border border-white/[0.07] bg-[#070a12] p-3.5 sm:p-4"
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

            {activeSection === "organization" && (
              <div className="min-h-[620px] w-full space-y-5">
                <section className="rounded-2xl border border-white/[0.075] bg-[#070a12] p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-300">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Организация</h2>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                        Пространство для команды, общих лимитов и совместных проектов. Сейчас аккаунт работает как личный.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      "Приглашение участников",
                      "Общие чаты и проекты",
                      "Роли и доступы",
                      "Единый баланс команды",
                    ].map((feature) => (
                      <div
                        key={feature}
                        className="rounded-xl border border-white/[0.065] bg-white/[0.025] px-4 py-3 text-sm text-slate-300"
                      >
                        {feature}
                      </div>
                    ))}
                  </div>

                  <Button className="mt-6 bg-gradient-to-r from-violet-500 to-blue-500">
                    <Building2 className="mr-2 h-4 w-4" />
                    Создать организацию
                  </Button>
                </section>
              </div>
            )}

            {activeSection === "settings" && (
              <div className="min-h-[620px] w-full space-y-5">
                <section className="rounded-2xl border border-white/[0.075] bg-[#070a12] p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-300">
                      <Settings className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Настройки</h2>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                        Управляйте поведением аккаунта, уведомлениями и рабочими сценариями.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    {[
                      ["Автосохранение истории", "Чаты и генерации сохраняются в вашем профиле."],
                      ["Быстрые действия", "Показывать подсказки для изображений, видео и задач."],
                      ["Безопасный режим", "Предупреждать перед удалением чатов и файлов."],
                    ].map(([title, description]) => (
                      <div
                        key={title}
                        className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.065] bg-white/[0.025] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-white">{title}</p>
                          <p className="mt-1 text-xs text-slate-500">{description}</p>
                        </div>
                        <span className="h-6 w-11 rounded-full border border-violet-400/25 bg-violet-500/20 p-0.5">
                          <span className="block h-5 w-5 rounded-full bg-violet-300" />
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeSection === "media" && (
              <div className="min-h-[620px] w-full space-y-5">
                <section className="rounded-2xl border border-white/[0.075] bg-[#070a12] p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-300">
                      <MonitorPlay className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Медиа</h2>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                        Быстрый доступ к созданным изображениям, видео и будущим аудио-инструментам.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {[
                      { label: "Изображения", value: imagesCount, href: "/image", icon: ImageIcon },
                      { label: "Видео", value: videosCount, href: "/video", icon: Video },
                      { label: "Проекты", value: chatsCount, href: "/chat", icon: FolderKanban },
                    ].map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-violet-400/25 hover:bg-white/[0.045]"
                        >
                          <div className="flex items-center gap-2 text-sm text-slate-300">
                            <Icon className="h-4 w-4 text-violet-300" />
                            {item.label}
                          </div>
                          <div className="mt-3 text-2xl font-semibold text-white">{item.value}</div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              </div>
            )}

            {activeSection === "partner" && (
              <div className="min-h-[620px] w-full space-y-5">
                <section className="rounded-2xl border border-white/[0.075] bg-[#070a12] p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-300">
                      <Handshake className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Партнёрство</h2>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                        Раздел для реферальной программы, промокодов и статистики приглашений.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-xl border border-dashed border-violet-400/25 bg-violet-500/8 p-4 text-sm text-violet-100">
                    Партнёрский кабинет готовится. Здесь появятся ссылка, начисления и история выплат.
                  </div>
                </section>
              </div>
            )}

            {activeSection === "support" && (
              <div className="min-h-[620px] w-full space-y-5">
                <section className="rounded-2xl border border-white/[0.075] bg-[#070a12] p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-300">
                      <LifeBuoy className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Поддержка</h2>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                        Помощь по аккаунту, оплате, генерациям и доступу к моделям.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      { title: "Написать в поддержку", text: "Опишите проблему, мы подготовим обращение." },
                      { title: "Проверить лимиты", text: "Сверьте тариф, историю и доступные генерации." },
                      { title: "Вопросы по оплате", text: "Поможем разобраться с тарифом и продлением." },
                      { title: "Техническая помощь", text: "Если что-то не загрузилось или работает странно." },
                    ].map((item) => (
                      <div
                        key={item.title}
                        className="rounded-xl border border-white/[0.065] bg-white/[0.025] p-4"
                      >
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeSection === "more" && (
              <div className="min-h-[620px] w-full space-y-5">
                <section className="rounded-2xl border border-white/[0.075] bg-[#070a12] p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/12 text-violet-300">
                      <BadgeHelp className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold">Ещё</h2>
                      <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">
                        Дополнительные разделы аккаунта, которые не нужны каждый день, но должны быть под рукой.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2">
                    {[
                      "Документы и файлы",
                      "Безопасность входа",
                      "Экспорт данных",
                      "История действий",
                    ].map((item) => (
                      <div
                        key={item}
                        className="rounded-xl border border-white/[0.065] bg-white/[0.025] px-4 py-3 text-sm text-slate-300"
                      >
                        {item}
                      </div>
                    ))}
                  </div>
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
