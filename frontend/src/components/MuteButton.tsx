"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { MusicManager } from "@/lib/music-manager";

/**
 * Universal mute/unmute button. Toggles background music globally.
 * Place anywhere — it reads from the MusicManager singleton.
 */
export default function MuteButton({ className = "", variant = "overlay" }: { className?: string; variant?: "overlay" | "header" }) {
  const [muted, setMuted] = useState(MusicManager.isMuted);

  useEffect(() => {
    return MusicManager.subscribe(() => {
      setMuted(MusicManager.isMuted);
    });
  }, []);

  const styles = variant === "header"
    ? muted
      ? "bg-red-50 hover:bg-red-100 text-red-400"
      : "bg-gray-100 hover:bg-gray-200 text-gray-500"
    : muted
      ? "bg-black/30 hover:bg-black/50 text-red-300"
      : "bg-black/30 hover:bg-black/50 text-white/70";

  return (
    <button
      onClick={() => MusicManager.toggleMute()}
      className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${styles} ${className}`}
      title={muted ? "Unmute music" : "Mute music"}
    >
      {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
    </button>
  );
}
