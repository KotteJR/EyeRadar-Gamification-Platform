"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { UISounds } from "@/lib/ui-sounds";

interface LanguageToggleProps {
  studentId: string;
  initialLang?: string;
  className?: string;
}

const LANGS = [
  { code: "en", flag: "🇬🇧", label: "EN" },
  { code: "el", flag: "🇬🇷", label: "ΕΛ" },
] as const;

export default function LanguageToggle({
  studentId,
  initialLang = "en",
  className = "",
}: LanguageToggleProps) {
  const [lang, setLang] = useState(initialLang);
  const [switching, setSwitching] = useState(false);

  const toggle = useCallback(async () => {
    if (switching) return;
    const next = lang === "en" ? "el" : "en";
    setSwitching(true);
    try {
      await api.updateStudent(studentId, { language: next });
      setLang(next);
      UISounds.play("click");
    } catch {
      // silently fail
    } finally {
      setSwitching(false);
    }
  }, [lang, studentId, switching]);

  const current = LANGS.find((l) => l.code === lang) || LANGS[0];

  return (
    <button
      onClick={toggle}
      disabled={switching}
      className={`flex items-center gap-1 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-xl transition-colors ${
        switching ? "opacity-60" : ""
      } ${className}`}
      title={`Switch language (current: ${current.label})`}
    >
      <span className="text-[13px]">{current.flag}</span>
      <span className="text-[12px] font-bold text-blue-700">{current.label}</span>
    </button>
  );
}
