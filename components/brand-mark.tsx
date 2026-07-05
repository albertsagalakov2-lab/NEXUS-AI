import Image from "next/image"
import { cn } from "@/lib/utils"

export function BrandMark({
  compact = false,
  className,
}: {
  compact?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#080b13] shadow-[0_0_20px_rgba(79,70,229,0.14)]">
        <Image
          src="/neiropeiro-mascot.png"
          alt="Логотип NeiroPeiro"
          fill
          sizes="40px"
          className="object-cover"
          priority
        />
      </div>
      {!compact && (
        <span className="text-xl font-semibold tracking-tight text-white">
          NeiroPeiro <span className="brand-gradient-text">AI</span>
        </span>
      )}
    </div>
  )
}
