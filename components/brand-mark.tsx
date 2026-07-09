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
      <div className="np-brand-logo-frame relative h-10 w-10 shrink-0 overflow-hidden">
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
