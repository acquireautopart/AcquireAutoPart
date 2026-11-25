"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "acquireauto-profile-theme";

// Dark is the default look of the profile page. Light is opt-in and remembered.
export default function useProfileTheme() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      /* storage can be blocked – keep default */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { theme, toggleTheme };
}
