"use client";

import { useState, useEffect } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { MusicManager } from "@/lib/music-manager";

/**
 * Universal mute/unmute button. Toggles background music globally.
 * Place anywhere — it reads from the MusicManager singleton.
 */
export default function MuteButton({ className = "" }: { className?: string }) {
  const [muted, setMuted] = useState(MusicManager.isMuted);

  useEffect(() => {
    return MusicManager.subscribe(() => {
      setMuted(MusicManager.isMuted);
    });
  }, []);

  return (
    <button
      onClick={() => MusicManager.toggleMute()}
      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
        muted
          ? "bg-black/30 hover:bg-black/50 text-red-300"
          : "bg-black/30 hover:bg-black/50 text-white/70"
      } ${className}`}
      title={muted ? "Unmute music" : "Mute music"}
    >
      {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
    </button>
  );
}
