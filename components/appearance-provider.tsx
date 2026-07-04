"use client"

import { useEffect } from "react"

type AppearanceSettings = {
  site_name: string
  primary_color: string
  radius: string
}

function applyAppearance(settings: AppearanceSettings) {
  const root = document.documentElement

  root.style.setProperty("--primary", settings.primary_color || "#8b5cf6")
  root.style.setProperty("--ring", settings.primary_color || "#8b5cf6")
  root.style.setProperty("--radius", settings.radius || "0.75rem")

  window.localStorage.setItem("nexusai_site_name", settings.site_name || "NeiroPeiro")
  document.title = settings.site_name || "NeiroPeiro"
}

export function AppearanceProvider() {
  useEffect(() => {
    async function loadAppearance() {
      try {
        const response = await fetch("/api/appearance", {
          cache: "no-store",
        })

        const data = await response.json().catch(() => ({}))

        if (!response.ok || !data.settings) return

        applyAppearance(data.settings)
      } catch (error) {
        console.error("Load appearance error:", error)
      }
    }

    loadAppearance()

    window.addEventListener("nexusai-appearance-updated", loadAppearance)
    window.addEventListener("focus", loadAppearance)

    return () => {
      window.removeEventListener("nexusai-appearance-updated", loadAppearance)
      window.removeEventListener("focus", loadAppearance)
    }
  }, [])

  return null
}
