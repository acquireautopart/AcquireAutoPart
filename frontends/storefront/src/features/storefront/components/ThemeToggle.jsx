"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export const THEME_KEY = "acquireauto-theme";
const THEME_EVENT = "acquireauto-themechange";

function readTheme() {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/** Switches the whole site between dark and light. Choice is saved in localStorage. */
export default function ThemeToggle({ className = "", showLabel = false }) {
  const [theme, setTheme] = useState(null); // null until mounted → avoids hydration mismatch

  useEffect(() => {
    setTheme(readTheme());
    const sync = () => setTheme(readTheme());
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  function toggle() {
    const next = readTheme() === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      /* storage blocked – theme still changes for this visit */
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  const isDark = theme !== "light";
  const label = isDark ? "Switch to light theme" : "Switch to dark theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={
        className ||
        "grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line-light text-[#171916] transition hover:border-brand hover:text-brand"
      }
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      {showLabel && (
        <span className="ml-2 text-sm font-semibold">{isDark ? "Light mode" : "Dark mode"}</span>
      )}
    </button>
  );
}
