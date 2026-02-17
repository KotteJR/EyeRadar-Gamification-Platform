"use client";

import { useState, useEffect } from "react";
import { RotateCcw, MapPin, Skull } from "lucide-react";
import { UISounds } from "@/lib/ui-sounds";

interface GameOverOverlayProps {
  onRetry: () => void;
  onBackToWorld: () => void;
}

export default function GameOverOverlay({ onRetry, onBackToWorld }: GameOverOverlayProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    UISounds.wrong();
    const t = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`fixed inset-0 z-[300] flex items-center justify-center transition-all duration-700 ${visible ? "opacity-100" : "opacity-0"}`}>
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Content */}
      <div className={`relative z-10 text-center transition-all duration-700 ${visible ? "scale-100 translate-y-0" : "scale-90 translate-y-8"}`}>
        {/* Skull icon */}
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-5 ring-4 ring-red-500/30">
          <Skull size={40} className="text-red-400" />
        </div>

        {/* Text */}
        <h2
          className="text-4xl font-black text-white mb-2 tracking-tight"
          style={{ fontFamily: "'Fredoka', sans-serif", textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}
        >
          Game Over
        </h2>
        <p className="text-white/50 text-sm font-medium mb-8" style={{ fontFamily: "'Fredoka', sans-serif" }}>
          You ran out of hearts!
        </p>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-64 mx-auto">
          <button
            onClick={() => { UISounds.start(); onRetry(); }}
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-[#FF5A39] to-[#FF9E75] text-white font-bold rounded-2xl hover:shadow-lg hover:shadow-orange-500/30 transition-all active:scale-[0.97] text-sm"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            <RotateCcw size={16} />
            Try Again
          </button>
          <button
            onClick={() => { UISounds.click(); onBackToWorld(); }}
            className="flex items-center justify-center gap-2.5 px-6 py-3 bg-white/10 text-white/80 font-semibold rounded-2xl hover:bg-white/20 transition-all active:scale-[0.97] text-sm border border-white/10"
            style={{ fontFamily: "'Fredoka', sans-serif" }}
          >
            <MapPin size={15} />
            Back to World
          </button>
        </div>
      </div>
    </div>
  );
}
