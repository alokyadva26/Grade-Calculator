"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { flushSync } from "react-dom"
import { Moon, Sun } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"

type AnimatedThemeTogglerProps = {
  className?: string
}

export const AnimatedThemeToggler = ({ className }: AnimatedThemeTogglerProps) => {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false
    return document.documentElement.classList.contains("dark")
  })

  // Synchronise state with document element classes (e.g. from script or external change)
  useEffect(() => {
    const syncTheme = () => {
      setDarkMode(document.documentElement.classList.contains("dark"))
    }

    const observer = new MutationObserver(syncTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => {
      observer.disconnect()
    }
  }, [])

  const onToggle = useCallback(async () => {
    if (!buttonRef.current) return

    const toggled = !darkMode
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches

    // Graceful fallback if View Transitions API is unsupported or user prefers reduced motion
    if (!document.startViewTransition || prefersReducedMotion) {
      setDarkMode(toggled)
      document.documentElement.classList.toggle("dark", toggled)
      try {
        localStorage.setItem("theme", toggled ? "dark" : "light")
      } catch (e) {
        console.error("Failed to save theme preference:", e)
      }
      return
    }

    // View Transitions API
    const transition = document.startViewTransition(() => {
      flushSync(() => {
        setDarkMode(toggled)
        document.documentElement.classList.toggle("dark", toggled)
        try {
          localStorage.setItem("theme", toggled ? "dark" : "light")
        } catch (e) {
          console.error("Failed to save theme preference:", e)
        }
      })
    })

    await transition.ready

    const { left, top, width, height } = buttonRef.current.getBoundingClientRect()
    const centerX = left + width / 2
    const centerY = top + height / 2
    const maxDistance = Math.hypot(
      Math.max(centerX, window.innerWidth - centerX),
      Math.max(centerY, window.innerHeight - centerY)
    )

    const animation = document.documentElement.animate(
      {
        clipPath: [
          `circle(0px at ${centerX}px ${centerY}px)`,
          `circle(${maxDistance}px at ${centerX}px ${centerY}px)`,
        ],
      },
      {
        duration: 500,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      }
    )

    animation.onfinish = () => {
      // Clean up after transition
    }
  }, [darkMode])

  return (
    <button
      ref={buttonRef}
      onClick={onToggle}
      aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      title={darkMode ? "Dark mode active — Click for light mode" : "Light mode active — Click for dark mode"}
      className={cn(
        "flex items-center justify-center p-2 rounded-spatial-sm outline-none focus:outline-none active:outline-none focus:ring-0 cursor-pointer transition-colors duration-150",
        className
      )}
      type="button"
    >
      <AnimatePresence mode="wait" initial={false}>
        {darkMode ? (
          <motion.span
            key="moon-icon"
            initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.6, rotate: 20 }}
            transition={{ duration: 0.2 }}
            className="text-white flex items-center justify-center"
          >
            <Moon className="w-4 h-4" />
          </motion.span>
        ) : (
          <motion.span
            key="sun-icon"
            initial={{ opacity: 0, scale: 0.6, rotate: 20 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            exit={{ opacity: 0, scale: 0.6, rotate: -20 }}
            transition={{ duration: 0.2 }}
            className="text-amber-500 flex items-center justify-center"
          >
            <Sun className="w-4 h-4" />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
