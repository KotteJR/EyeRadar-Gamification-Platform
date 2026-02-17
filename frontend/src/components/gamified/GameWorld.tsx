"use client";

import React, { useState } from "react";
import type { WorldTheme } from "@/lib/level-config";
import { WORLD_THEMES } from "@/lib/level-config";

interface GameWorldProps {
  children: React.ReactNode;
  theme?: WorldTheme;
  worldOffset?: number;
}

const GROUND_H = 100;

export default function GameWorld({
  children,
  theme = "grassland",
  worldOffset = 0,
}: GameWorldProps) {
  const t = WORLD_THEMES[theme];
  const [bgError, setBgError] = useState(false);

  const farSpeed = 0.15;
  const midSpeed = 0.35;
  const nearSpeed = 0.6;
  const groundSpeed = 1;

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      style={{ fontFamily: "'Fredoka', 'Nunito', sans-serif" }}
    >
      {/* PixelLab background image (if available) */}
      {!bgError && (
        <img
          src={`/game-assets/backgrounds/${theme}.png`}
          alt=""
          className="absolute inset-0 w-full object-cover z-[1]"
          style={{ imageRendering: "pixelated", height: `calc(100% - ${GROUND_H}px)` }}
          onError={() => setBgError(true)}
        />
      )}

      {/* CSS fallback sky gradient (visible behind transparent parts or as full fallback) */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${t.sky.top} 0%, ${t.sky.mid} 50%, ${t.sky.bottom} 100%)`,
          opacity: bgError ? 1 : 0.3,
        }}
      />

      {/* Stars for dark themes */}
      {t.stars && <Stars />}

      {/* Special effects */}
      {t.specialEffect === "fireflies" && <Fireflies />}
      {t.specialEffect === "snowflakes" && <Snowflakes />}
      {t.specialEffect === "embers" && <Embers />}
      {t.specialEffect === "sparkles" && <Sparkles />}

      {/* Clouds — parallax (only when no PixelLab background) */}
      {t.clouds && bgError && (
        <div
          className="absolute inset-0 z-[2] transition-transform duration-700 ease-out"
          style={{ transform: `translateX(${-worldOffset * 0.08}px)` }}
        >
          <Cloud left={60} top={5} w={140} theme={theme} />
          <Cloud left={300} top={14} w={100} theme={theme} />
          <Cloud left={550} top={4} w={160} theme={theme} />
          <Cloud left={800} top={18} w={110} theme={theme} />
          <Cloud left={1100} top={8} w={130} theme={theme} />
          <Cloud left={1400} top={3} w={150} theme={theme} />
        </div>
      )}

      {/* Far mountains — slow parallax (hidden when PixelLab bg available) */}
      {bgError && (
        <div
          className="absolute left-0 z-[3] w-[400%] transition-transform duration-700 ease-out"
          style={{
            bottom: GROUND_H,
            height: 180,
            transform: `translateX(${-worldOffset * farSpeed}px)`,
          }}
        >
          <svg viewBox="0 0 4800 180" className="w-full h-full" preserveAspectRatio="none">
            <path d={FAR_MOUNTAINS} fill={t.mountains.far} opacity="0.35" />
          </svg>
        </div>
      )}

      {/* Mid hills — medium parallax (hidden when PixelLab bg available) */}
      {bgError && (
        <div
          className="absolute left-0 z-[4] w-[400%] transition-transform duration-700 ease-out"
          style={{
            bottom: GROUND_H,
            height: 150,
            transform: `translateX(${-worldOffset * midSpeed}px)`,
          }}
        >
          <svg viewBox="0 0 4800 150" className="w-full h-full" preserveAspectRatio="none">
            <path d={MID_HILLS} fill={t.mountains.mid} opacity="0.45" />
          </svg>
        </div>
      )}

      {/* Near hills — fast parallax (hidden when PixelLab bg available) */}
      {bgError && (
        <div
          className="absolute left-0 z-[5] w-[400%] transition-transform duration-700 ease-out"
          style={{
            bottom: GROUND_H,
            height: 120,
            transform: `translateX(${-worldOffset * nearSpeed}px)`,
          }}
        >
          <svg viewBox="0 0 4800 120" className="w-full h-full" preserveAspectRatio="none">
            <path d={NEAR_HILLS} fill={t.mountains.near} opacity="0.5" />
          </svg>
        </div>
      )}

      {/* Decorative elements based on theme (only when no PixelLab background) */}
      {bgError && <ThemeDecorations theme={theme} worldOffset={worldOffset} />}

      {/* Content area — above ground */}
      <div className="absolute inset-0 z-10" style={{ bottom: GROUND_H }}>
        {children}
      </div>

      {/* Ground */}
      <div className="absolute left-0 right-0 bottom-0 z-[6]" style={{ height: GROUND_H }}>
        <div className="h-[8px] w-full" style={{ background: t.ground.grass }} />
        <div
          className="w-full overflow-hidden"
          style={{ background: t.ground.earth, height: GROUND_H - 8 }}
        >
          <div
            className="h-full w-[400%] transition-transform duration-700 ease-out"
            style={{ transform: `translateX(${-worldOffset * groundSpeed}px)` }}
          >
            <svg width="100%" height="100%" preserveAspectRatio="none">
              <defs>
                <pattern
                  id={`bricks-${theme}`}
                  x="0"
                  y="0"
                  width="48"
                  height="24"
                  patternUnits="userSpaceOnUse"
                >
                  <rect x="1" y="1" width="22" height="10" rx="1" fill={t.ground.brick} opacity="0.3" />
                  <rect x="25" y="1" width="22" height="10" rx="1" fill={t.ground.brick} opacity="0.3" />
                  <rect x="13" y="13" width="22" height="10" rx="1" fill={t.ground.brick} opacity="0.3" />
                  <rect x="-11" y="13" width="22" height="10" rx="1" fill={t.ground.brick} opacity="0.3" />
                  <rect x="37" y="13" width="22" height="10" rx="1" fill={t.ground.brick} opacity="0.3" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill={`url(#bricks-${theme})`} />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Cloud ──────────────────────────────────────────────────────────────────
function Cloud({ left, top, w, theme }: { left: number; top: number; w: number; theme: WorldTheme }) {
  const h = w * 0.42;
  const isLight = theme === "cloud_kingdom" || theme === "sunset";
  const fill = isLight ? "#FFFFFF" : "#FFFFFF";
  const opacity = theme === "cloud_kingdom" ? 0.9 : theme === "sunset" ? 0.6 : 0.75;

  return (
    <svg
      className="absolute pointer-events-none"
      style={{ left, top: `${top}%`, width: w, height: h }}
      viewBox="0 0 100 42"
    >
      <ellipse cx="50" cy="27" rx="44" ry="14" fill={fill} opacity={opacity * 0.85} />
      <ellipse cx="33" cy="21" rx="27" ry="12" fill={fill} opacity={opacity * 0.95} />
      <ellipse cx="67" cy="21" rx="24" ry="11" fill={fill} opacity={opacity * 0.9} />
      <ellipse cx="50" cy="17" rx="20" ry="10" fill={fill} opacity={opacity} />
    </svg>
  );
}

// ─── Stars ──────────────────────────────────────────────────────────────────
function Stars() {
  return (
    <div className="absolute inset-0 overflow-hidden z-[1]">
      {Array.from({ length: 60 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: `${1 + Math.random() * 2.5}px`,
            height: `${1 + Math.random() * 2.5}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 50}%`,
            opacity: 0.3 + Math.random() * 0.6,
            animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite ${Math.random() * 3}s`,
          }}
        />
      ))}
      {/* Moon */}
      <div className="absolute top-[8%] right-[15%] z-[1]">
        <svg width="50" height="50" viewBox="0 0 50 50">
          <circle cx="25" cy="25" r="18" fill="#FFF8DC" opacity="0.9" />
          <circle cx="30" cy="22" r="15" fill="#0A0E27" opacity="0.3" />
          <circle cx="20" cy="18" r="3" fill="#F5DEB3" opacity="0.3" />
          <circle cx="28" cy="30" r="2" fill="#F5DEB3" opacity="0.2" />
        </svg>
      </div>
    </div>
  );
}

// ─── Fireflies ──────────────────────────────────────────────────────────────
function Fireflies() {
  return (
    <div className="absolute inset-0 overflow-hidden z-[7] pointer-events-none">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${3 + Math.random() * 4}px`,
            height: `${3 + Math.random() * 4}px`,
            left: `${Math.random() * 100}%`,
            top: `${20 + Math.random() * 60}%`,
            background: `radial-gradient(circle, #FFE08090, #9ACD3260, transparent)`,
            animation: `firefly ${4 + Math.random() * 6}s ease-in-out infinite ${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Snowflakes ─────────────────────────────────────────────────────────────
function Snowflakes() {
  return (
    <div className="absolute inset-0 overflow-hidden z-[7] pointer-events-none">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white"
          style={{
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
            left: `${Math.random() * 100}%`,
            top: `-${Math.random() * 20}%`,
            opacity: 0.5 + Math.random() * 0.4,
            animation: `snowfall ${5 + Math.random() * 8}s linear infinite ${Math.random() * 5}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Embers ─────────────────────────────────────────────────────────────────
function Embers() {
  return (
    <div className="absolute inset-0 overflow-hidden z-[7] pointer-events-none">
      {Array.from({ length: 15 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${2 + Math.random() * 3}px`,
            height: `${2 + Math.random() * 3}px`,
            left: `${Math.random() * 100}%`,
            bottom: `${GROUND_H + Math.random() * 30}px`,
            background: `radial-gradient(circle, #FF6B3580, #FF450040, transparent)`,
            animation: `ember-rise ${3 + Math.random() * 5}s ease-out infinite ${Math.random() * 4}s`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Sparkles ───────────────────────────────────────────────────────────────
function Sparkles() {
  return (
    <div className="absolute inset-0 overflow-hidden z-[7] pointer-events-none">
      {Array.from({ length: 25 }).map((_, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            width: `${4 + Math.random() * 6}px`,
            height: `${4 + Math.random() * 6}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 70}%`,
            animation: `sparkle ${2 + Math.random() * 3}s ease-in-out infinite ${Math.random() * 3}s`,
          }}
        >
          <svg viewBox="0 0 10 10" width="100%" height="100%">
            <path d="M5,0 L6,4 L10,5 L6,6 L5,10 L4,6 L0,5 L4,4 Z" fill="#FFD700" opacity="0.6" />
          </svg>
        </div>
      ))}
    </div>
  );
}

// ─── Theme-specific decorations ─────────────────────────────────────────────
function ThemeDecorations({ theme, worldOffset }: { theme: WorldTheme; worldOffset: number }) {
  switch (theme) {
    case "forest":
      return (
        <div
          className="absolute left-0 z-[5] w-[400%] transition-transform duration-700 ease-out pointer-events-none"
          style={{ bottom: GROUND_H, height: 200, transform: `translateX(${-worldOffset * 0.5}px)` }}
        >
          {/* Tree trunks and canopy silhouettes */}
          <svg viewBox="0 0 4800 200" className="w-full h-full" preserveAspectRatio="none">
            {/* Tree trunks */}
            {[100, 350, 600, 850, 1200, 1500, 1800, 2100, 2400, 2700, 3000, 3300, 3600, 3900, 4200, 4500].map((x, i) => (
              <React.Fragment key={i}>
                <rect x={x - 4} y={100 + (i % 3) * 15} width={8} height={100 - (i % 3) * 15} fill="#2D1810" opacity="0.3" />
                <ellipse cx={x} cy={80 + (i % 3) * 20} rx={30 + (i % 2) * 15} ry={40 + (i % 2) * 10} fill="#1B4D1B" opacity="0.15" />
              </React.Fragment>
            ))}
            {/* Hanging vines */}
            {[200, 500, 900, 1300, 1700, 2200, 2600, 3100, 3500, 4000, 4400].map((x, i) => (
              <path key={`v${i}`} d={`M${x},${20 + (i % 4) * 10} Q${x + 8},${60 + (i % 3) * 10} ${x - 5},${80 + (i % 2) * 15}`} stroke="#2E7D32" strokeWidth="2" fill="none" opacity="0.2" />
            ))}
          </svg>
        </div>
      );
    case "cloud_kingdom":
      return (
        <div
          className="absolute left-0 z-[3] w-[400%] transition-transform duration-700 ease-out pointer-events-none"
          style={{ bottom: GROUND_H + 20, height: 100, transform: `translateX(${-worldOffset * 0.3}px)` }}
        >
          <svg viewBox="0 0 4800 100" className="w-full h-full" preserveAspectRatio="none">
            {/* Floating cloud platforms */}
            {[200, 600, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500].map((x, i) => (
              <ellipse key={i} cx={x} cy={50 + (i % 3) * 15} rx={60 + (i % 2) * 20} ry={15 + (i % 2) * 5} fill="white" opacity="0.3" />
            ))}
          </svg>
        </div>
      );
    default:
      return null;
  }
}

// ─── Terrain Paths ──────────────────────────────────────────────────────────
const FAR_MOUNTAINS = `M0,180 C80,80 160,100 260,55 C360,10 480,70 650,30 C820,-10 940,80 1200,40 
  C1280,80 1360,100 1460,55 C1560,10 1680,70 1850,30 C2020,-10 2140,80 2400,40
  C2480,80 2560,100 2660,55 C2760,10 2880,70 3050,30 C3220,-10 3340,80 3600,40
  C3680,80 3760,100 3860,55 C3960,10 4080,70 4250,30 C4420,-10 4540,80 4800,40 L4800,180 Z`;

const MID_HILLS = `M0,150 C100,65 260,85 440,45 C620,5 800,65 1000,30 C1200,-5 1360,60 1600,35
  C1700,65 1860,85 2040,45 C2220,5 2400,65 2600,30 C2800,-5 2960,60 3200,35
  C3300,65 3460,85 3640,45 C3820,5 4000,65 4200,30 C4400,-5 4560,60 4800,35 L4800,150 Z`;

const NEAR_HILLS = `M0,120 C120,65 300,80 500,48 C700,16 880,58 1060,35 C1240,12 1380,52 1600,40
  C1720,65 1900,80 2100,48 C2300,16 2480,58 2660,35 C2840,12 2980,52 3200,40
  C3320,65 3500,80 3700,48 C3900,16 4080,58 4260,35 C4440,12 4580,52 4800,40 L4800,120 Z`;
