"use client";

import React, { useState, useEffect } from "react";
import type { BossType } from "@/lib/boss-config";
import { BOSSES } from "@/lib/boss-config";

interface SpriteProps {
  size?: number;
  className?: string;
}

// ─── Pixel Art Image Sprite ─────────────────────────────────────────────────
// Tries to load PixelLab-generated image, falls back to SVG
function PixelSprite({
  src,
  fallback,
  size,
  className = "",
  alt = "sprite",
}: {
  src: string;
  fallback: React.ReactNode;
  size: number;
  className?: string;
  alt?: string;
}) {
  const [imgError, setImgError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  if (imgError) return <>{fallback}</>;

  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      <img
        src={src}
        alt={alt}
        width={size}
        height={size}
        className={`pixelated ${className}`}
        onError={() => setImgError(true)}
        onLoad={() => setLoaded(true)}
        style={{
          imageRendering: "pixelated",
          width: size,
          height: size,
          objectFit: "contain",
          display: loaded ? "block" : "none",
        }}
      />
      {!loaded && <div style={{ width: size, height: size }}>{fallback}</div>}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── PLAYER SPRITES ─────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function PlayerSprite({ size = 64, className = "" }: SpriteProps) {
  return (
    <PixelSprite
      src="/game-assets/player/idle.png"
      size={size}
      className={className}
      alt="Player"
      fallback={<PlayerSpriteSVG size={size} className={className} />}
    />
  );
}

function PlayerSpriteSVG({ size = 64, className = "" }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 72" className={className}>
      <ellipse cx="32" cy="70" rx="14" ry="3" fill="black" opacity="0.15" />
      <ellipse cx="32" cy="46" rx="13" ry="15" fill="#4A90D9" />
      <ellipse cx="32" cy="48" rx="10" ry="12" fill="#5BA0E9" />
      <ellipse cx="32" cy="46" rx="4" ry="6" fill="#4A90D9" opacity="0.5" />
      <rect x="20" y="52" width="24" height="3" rx="1.5" fill="#DAA520" />
      <rect x="28" y="51" width="8" height="5" rx="2" fill="#FFD700" />
      <ellipse cx="17" cy="44" rx="5" ry="7" fill="#4A90D9" />
      <circle cx="16" cy="50" r="4" fill="#FDDCB5" />
      <ellipse cx="47" cy="44" rx="5" ry="7" fill="#4A90D9" />
      <circle cx="48" cy="50" r="4" fill="#FDDCB5" />
      <ellipse cx="32" cy="22" rx="15" ry="16" fill="#FDDCB5" />
      <ellipse cx="32" cy="14" rx="16" ry="11" fill="#8B4513" />
      <ellipse cx="22" cy="17" rx="6" ry="8" fill="#8B4513" />
      <ellipse cx="42" cy="17" rx="6" ry="8" fill="#8B4513" />
      <ellipse cx="32" cy="10" rx="14" ry="7" fill="#FF5A39" />
      <rect x="16" y="10" width="32" height="5" rx="2.5" fill="#FF5A39" />
      <ellipse cx="32" cy="8" rx="10" ry="5" fill="#FF7056" />
      <ellipse cx="26" cy="23" rx="4.5" ry="5" fill="white" />
      <ellipse cx="38" cy="23" rx="4.5" ry="5" fill="white" />
      <circle cx="27.5" cy="24" r="2.5" fill="#333" />
      <circle cx="39.5" cy="24" r="2.5" fill="#333" />
      <circle cx="28.5" cy="22.5" r="1" fill="white" />
      <circle cx="40.5" cy="22.5" r="1" fill="white" />
      <ellipse cx="20" cy="28" rx="3.5" ry="2" fill="#FFB5A0" opacity="0.6" />
      <ellipse cx="44" cy="28" rx="3.5" ry="2" fill="#FFB5A0" opacity="0.6" />
      <path d="M27,30 Q32,35 37,30" stroke="#C4956A" strokeWidth="2" fill="none" strokeLinecap="round" />
      <rect x="23" y="56" width="7" height="10" rx="3.5" fill="#3B5998" />
      <rect x="34" y="56" width="7" height="10" rx="3.5" fill="#3B5998" />
      <ellipse cx="26" cy="66" rx="6" ry="3.5" fill="#8B4513" />
      <ellipse cx="38" cy="66" rx="6" ry="3.5" fill="#8B4513" />
    </svg>
  );
}

export function PlayerRunning({ size = 64, className = "" }: SpriteProps) {
  const [frame, setFrame] = useState(0);
  const [imgError, setImgError] = useState(false);
  const frameCount = 6;

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % frameCount);
    }, 120);
    return () => clearInterval(interval);
  }, []);

  if (!imgError) {
    return (
      <div className={`${className}`} style={{ width: size, height: size }}>
        <img
          src={`/game-assets/player/running/frame_00${frame}.png`}
          alt="Running"
          width={size}
          height={size}
          style={{ imageRendering: "pixelated", width: size, height: size, objectFit: "contain" }}
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div className={`${className} animate-run-bob`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 64 72">
        <ellipse cx="32" cy="70" rx="14" ry="3" fill="black" opacity="0.15" />
        <ellipse cx="32" cy="46" rx="13" ry="15" fill="#4A90D9" />
        <ellipse cx="32" cy="48" rx="10" ry="12" fill="#5BA0E9" />
        <rect x="20" y="52" width="24" height="3" rx="1.5" fill="#DAA520" />
        <rect x="28" y="51" width="8" height="5" rx="2" fill="#FFD700" />
        <ellipse cx="15" cy="42" rx="5" ry="7" fill="#4A90D9" className="animate-arm-swing" style={{ transformOrigin: "17px 38px" }} />
        <circle cx="14" cy="48" r="4" fill="#FDDCB5" className="animate-arm-swing" style={{ transformOrigin: "17px 38px" }} />
        <ellipse cx="49" cy="46" rx="5" ry="7" fill="#4A90D9" className="animate-arm-swing-reverse" style={{ transformOrigin: "47px 38px" }} />
        <circle cx="50" cy="52" r="4" fill="#FDDCB5" className="animate-arm-swing-reverse" style={{ transformOrigin: "47px 38px" }} />
        <ellipse cx="32" cy="22" rx="15" ry="16" fill="#FDDCB5" />
        <ellipse cx="32" cy="14" rx="16" ry="11" fill="#8B4513" />
        <ellipse cx="22" cy="17" rx="6" ry="8" fill="#8B4513" />
        <ellipse cx="42" cy="17" rx="6" ry="8" fill="#8B4513" />
        <ellipse cx="32" cy="10" rx="14" ry="7" fill="#FF5A39" />
        <rect x="16" y="10" width="32" height="5" rx="2.5" fill="#FF5A39" />
        <ellipse cx="32" cy="8" rx="10" ry="5" fill="#FF7056" />
        <ellipse cx="26" cy="23" rx="4.5" ry="4.5" fill="white" />
        <ellipse cx="38" cy="23" rx="4.5" ry="4.5" fill="white" />
        <circle cx="28" cy="23.5" r="2.5" fill="#333" />
        <circle cx="40" cy="23.5" r="2.5" fill="#333" />
        <circle cx="29" cy="22" r="1" fill="white" />
        <circle cx="41" cy="22" r="1" fill="white" />
        <ellipse cx="20" cy="28" rx="3.5" ry="2" fill="#FFB5A0" opacity="0.6" />
        <ellipse cx="44" cy="28" rx="3.5" ry="2" fill="#FFB5A0" opacity="0.6" />
        <ellipse cx="32" cy="31" rx="3.5" ry="2.5" fill="#C4956A" />
        <rect x="22" y="55" width="7" height="11" rx="3.5" fill="#3B5998" className="animate-leg-run" />
        <rect x="35" y="55" width="7" height="11" rx="3.5" fill="#3B5998" className="animate-leg-run-reverse" />
        <ellipse cx="25" cy="66" rx="6" ry="3.5" fill="#8B4513" className="animate-leg-run" />
        <ellipse cx="39" cy="66" rx="6" ry="3.5" fill="#8B4513" className="animate-leg-run-reverse" />
      </svg>
    </div>
  );
}

export function PlayerCelebrate({ size = 64, className = "" }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 72" className={`${className} animate-bounce`}>
      <ellipse cx="32" cy="70" rx="14" ry="3" fill="black" opacity="0.15" />
      <ellipse cx="32" cy="46" rx="13" ry="15" fill="#4A90D9" />
      <ellipse cx="32" cy="48" rx="10" ry="12" fill="#5BA0E9" />
      <rect x="20" y="52" width="24" height="3" rx="1.5" fill="#DAA520" />
      <ellipse cx="14" cy="34" rx="5" ry="7" fill="#4A90D9" transform="rotate(-30 14 34)" />
      <circle cx="10" cy="30" r="4" fill="#FDDCB5" />
      <ellipse cx="50" cy="34" rx="5" ry="7" fill="#4A90D9" transform="rotate(30 50 34)" />
      <circle cx="54" cy="30" r="4" fill="#FDDCB5" />
      <ellipse cx="32" cy="22" rx="15" ry="16" fill="#FDDCB5" />
      <ellipse cx="32" cy="14" rx="16" ry="11" fill="#8B4513" />
      <ellipse cx="22" cy="17" rx="6" ry="8" fill="#8B4513" />
      <ellipse cx="42" cy="17" rx="6" ry="8" fill="#8B4513" />
      <ellipse cx="32" cy="10" rx="14" ry="7" fill="#FF5A39" />
      <rect x="16" y="10" width="32" height="5" rx="2.5" fill="#FF5A39" />
      <ellipse cx="32" cy="8" rx="10" ry="5" fill="#FF7056" />
      <path d="M22,22 Q26,19 30,22" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M34,22 Q38,19 42,22" stroke="#333" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="20" cy="27" rx="3.5" ry="2" fill="#FFB5A0" opacity="0.7" />
      <ellipse cx="44" cy="27" rx="3.5" ry="2" fill="#FFB5A0" opacity="0.7" />
      <path d="M25,28 Q32,35 39,28" stroke="#C4956A" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <rect x="23" y="56" width="7" height="10" rx="3.5" fill="#3B5998" />
      <rect x="34" y="56" width="7" height="10" rx="3.5" fill="#3B5998" />
      <ellipse cx="26" cy="66" rx="6" ry="3.5" fill="#8B4513" />
      <ellipse cx="38" cy="66" rx="6" ry="3.5" fill="#8B4513" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── BOSS MONSTER SPRITES ───────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

interface BossMonsterProps extends SpriteProps {
  bossType: BossType;
  defeated?: boolean;
  hurt?: boolean;
  attacking?: boolean;
}

export function BossMonster({
  bossType,
  size,
  className = "",
  defeated = false,
  hurt = false,
  attacking = false,
}: BossMonsterProps) {
  const boss = BOSSES[bossType];
  const actualSize = size || boss.size;
  const [deathFrame, setDeathFrame] = useState(0);
  const [useDeathFrames, setUseDeathFrames] = useState(false);
  const deathFrameCount = 7;

  useEffect(() => {
    if (defeated) {
      setUseDeathFrames(true);
      setDeathFrame(0);
      const interval = setInterval(() => {
        setDeathFrame((f) => {
          if (f >= deathFrameCount - 1) {
            clearInterval(interval);
            return deathFrameCount - 1;
          }
          return f + 1;
        });
      }, 100);
      return () => clearInterval(interval);
    } else {
      setUseDeathFrames(false);
      setDeathFrame(0);
    }
  }, [defeated]);

  const animClass = defeated
    ? "animate-boss-death"
    : hurt
    ? "animate-boss-hurt"
    : attacking
    ? "animate-boss-attack"
    : "animate-boss-idle";

  const svgFallback = (
    <BossSVG
      bossType={bossType}
      size={actualSize}
      className={`${className} ${animClass}`}
      defeated={defeated}
    />
  );

  if (useDeathFrames) {
    return (
      <PixelSprite
        src={`/game-assets/bosses/${bossType}_death/frame_00${deathFrame}.png`}
        size={actualSize}
        className={`${className} ${animClass}`}
        alt={`${boss.name} defeated`}
        fallback={svgFallback}
      />
    );
  }

  return (
    <PixelSprite
      src={`/game-assets/bosses/${bossType}.png`}
      size={actualSize}
      className={`${className} ${animClass}`}
      alt={boss.name}
      fallback={svgFallback}
    />
  );
}

// ─── SVG Boss Fallbacks ─────────────────────────────────────────────────────

function BossSVG({
  bossType,
  size,
  className,
  defeated,
}: {
  bossType: BossType;
  size: number;
  className: string;
  defeated: boolean;
}) {
  switch (bossType) {
    case "dark_sorcerer":
      return <DarkSorcererSVG size={size} className={className} defeated={defeated} />;
    case "giant_golem":
      return <GiantGolemSVG size={size} className={className} defeated={defeated} />;
    case "shadow_beast":
      return <ShadowBeastSVG size={size} className={className} defeated={defeated} />;
    case "dragon":
      return <DragonBossSVG size={size} className={className} defeated={defeated} />;
    case "corrupted_knight":
      return <CorruptedKnightSVG size={size} className={className} defeated={defeated} />;
  }
}

// ─── Dark Sorcerer ──────────────────────────────────────────────────────────
function DarkSorcererSVG({ size = 120, className = "", defeated = false }: SpriteProps & { defeated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 110" className={className}>
      <ellipse cx="50" cy="107" rx="18" ry="4" fill="black" opacity="0.2" />
      {/* Dark aura */}
      <ellipse cx="50" cy="60" rx="35" ry="40" fill="#4C1D95" opacity="0.15">
        <animate attributeName="rx" values="35;38;35" dur="2s" repeatCount="indefinite" />
      </ellipse>
      {/* Robe body */}
      <path d="M30,45 Q28,75 25,100 L75,100 Q72,75 70,45 Z" fill="#1a1a2e" />
      <path d="M33,48 Q32,72 30,95 L70,95 Q68,72 67,48 Z" fill="#2d2d4e" />
      {/* Tattered robe edges */}
      <path d="M25,100 L28,92 L31,100 L34,93 L37,100" fill="#1a1a2e" />
      <path d="M63,100 L66,93 L69,100 L72,92 L75,100" fill="#1a1a2e" />
      {/* Staff */}
      <rect x="76" y="20" width="3" height="80" rx="1.5" fill="#4A3520" />
      <circle cx="77.5" cy="18" r="8" fill="none" stroke="#6B21A8" strokeWidth="2" />
      <circle cx="77.5" cy="18" r="4" fill={defeated ? "#666" : "#FF2222"} opacity={defeated ? 0.5 : 0.9}>
        {!defeated && <animate attributeName="r" values="4;5;4" dur="1.5s" repeatCount="indefinite" />}
      </circle>
      {/* Skull on staff */}
      <ellipse cx="77.5" cy="16" rx="5" ry="6" fill="#E8E0D0" />
      <circle cx="75.5" cy="15" r="1.5" fill="#1a1a2e" />
      <circle cx="79.5" cy="15" r="1.5" fill="#1a1a2e" />
      <path d="M75,19 L76.5,18 L78,19 L79.5,18 L80,19" stroke="#1a1a2e" strokeWidth="0.8" fill="none" />
      {/* Hood */}
      <path d="M35,40 Q50,5 65,40 Q58,30 50,28 Q42,30 35,40 Z" fill="#1a1a2e" />
      <path d="M37,38 Q50,10 63,38 Q57,30 50,28 Q43,30 37,38 Z" fill="#2d2d4e" />
      {/* Face (hidden in shadow) */}
      <ellipse cx="50" cy="38" rx="12" ry="10" fill="#111" />
      {/* Glowing eyes */}
      {defeated ? (
        <>
          <line x1="43" y1="36" x2="48" y2="36" stroke="#666" strokeWidth="2" strokeLinecap="round" />
          <line x1="52" y1="36" x2="57" y2="36" stroke="#666" strokeWidth="2" strokeLinecap="round" />
          <path d="M44,42 Q50,39 56,42" stroke="#666" strokeWidth="1.5" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="44" cy="35" rx="3.5" ry="2.5" fill="#FF0000" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="56" cy="35" rx="3.5" ry="2.5" fill="#FF0000" opacity="0.9">
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="2s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="44" cy="34.5" rx="1.5" ry="1" fill="#FF6666" />
          <ellipse cx="56" cy="34.5" rx="1.5" ry="1" fill="#FF6666" />
        </>
      )}
      {/* Hands */}
      <circle cx="32" cy="65" r="4" fill="#3d1f5c" />
      <circle cx="68" cy="55" r="4" fill="#3d1f5c" />
    </svg>
  );
}

// ─── Giant Golem ────────────────────────────────────────────────────────────
function GiantGolemSVG({ size = 130, className = "", defeated = false }: SpriteProps & { defeated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 110 120" className={className}>
      <ellipse cx="55" cy="117" rx="22" ry="4" fill="black" opacity="0.2" />
      {/* Massive body */}
      <rect x="25" y="35" width="60" height="60" rx="8" fill="#6B7280" />
      <rect x="30" y="38" width="50" height="54" rx="5" fill="#9CA3AF" />
      {/* Cracks */}
      <path d="M40,42 L45,55 L38,65" stroke="#4B5563" strokeWidth="1.5" fill="none" />
      <path d="M65,45 L70,58 L63,70" stroke="#4B5563" strokeWidth="1.5" fill="none" />
      <path d="M55,50 L50,62 L58,75" stroke="#4B5563" strokeWidth="1.5" fill="none" />
      {/* Moss patches */}
      <ellipse cx="35" cy="80" rx="8" ry="4" fill="#4ADE80" opacity="0.5" />
      <ellipse cx="70" cy="75" rx="6" ry="3" fill="#4ADE80" opacity="0.4" />
      <ellipse cx="45" cy="42" rx="5" ry="3" fill="#4ADE80" opacity="0.3" />
      {/* Glowing core */}
      <circle cx="55" cy="60" r={defeated ? 6 : 10} fill={defeated ? "#666" : "#FBBF24"} opacity={defeated ? 0.3 : 0.8}>
        {!defeated && <animate attributeName="r" values="10;12;10" dur="1.5s" repeatCount="indefinite" />}
      </circle>
      {!defeated && (
        <circle cx="55" cy="60" r="6" fill="#FCD34D" opacity="0.9">
          <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      {/* Ancient runes */}
      {!defeated && (
        <>
          <text x="38" y="55" fill="#FBBF24" opacity="0.5" fontSize="8" fontFamily="serif">&#x16A0;</text>
          <text x="68" y="55" fill="#FBBF24" opacity="0.5" fontSize="8" fontFamily="serif">&#x16B1;</text>
          <text x="53" y="82" fill="#FBBF24" opacity="0.5" fontSize="8" fontFamily="serif">&#x16C7;</text>
        </>
      )}
      {/* Head */}
      <rect x="35" y="15" width="40" height="25" rx="6" fill="#6B7280" />
      <rect x="38" y="18" width="34" height="19" rx="4" fill="#9CA3AF" />
      {/* Eyes */}
      {defeated ? (
        <>
          <line x1="42" y1="28" x2="50" y2="28" stroke="#4B5563" strokeWidth="3" strokeLinecap="round" />
          <line x1="60" y1="28" x2="68" y2="28" stroke="#4B5563" strokeWidth="3" strokeLinecap="round" />
        </>
      ) : (
        <>
          <rect x="42" y="24" width="8" height="6" rx="1" fill="#FBBF24" opacity="0.9" />
          <rect x="60" y="24" width="8" height="6" rx="1" fill="#FBBF24" opacity="0.9" />
          <rect x="44" y="25" width="3" height="4" rx="0.5" fill="#92400E" />
          <rect x="62" y="25" width="3" height="4" rx="0.5" fill="#92400E" />
        </>
      )}
      {/* Arms */}
      <rect x="10" y="40" width="18" height="40" rx="6" fill="#6B7280" />
      <rect x="82" y="40" width="18" height="40" rx="6" fill="#6B7280" />
      <ellipse cx="19" cy="82" rx="7" ry="5" fill="#6B7280" />
      <ellipse cx="91" cy="82" rx="7" ry="5" fill="#6B7280" />
      {/* Legs */}
      <rect x="32" y="92" width="16" height="18" rx="5" fill="#6B7280" />
      <rect x="62" y="92" width="16" height="18" rx="5" fill="#6B7280" />
      <rect x="30" y="106" width="20" height="8" rx="4" fill="#4B5563" />
      <rect x="60" y="106" width="20" height="8" rx="4" fill="#4B5563" />
    </svg>
  );
}

// ─── Shadow Beast ───────────────────────────────────────────────────────────
function ShadowBeastSVG({ size = 110, className = "", defeated = false }: SpriteProps & { defeated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 110" className={className}>
      <ellipse cx="50" cy="107" rx="20" ry="4" fill="black" opacity="0.15" />
      {/* Wispy smoke body */}
      <ellipse cx="50" cy="60" rx="30" ry="35" fill="#1F2937" opacity="0.8" />
      <ellipse cx="50" cy="55" rx="25" ry="30" fill="#374151" opacity="0.6" />
      {/* Smoke tendrils */}
      {!defeated && (
        <>
          <path d="M25,70 Q15,55 20,40" stroke="#374151" strokeWidth="6" fill="none" opacity="0.5" strokeLinecap="round">
            <animate attributeName="d" values="M25,70 Q15,55 20,40;M25,70 Q12,50 22,38;M25,70 Q15,55 20,40" dur="3s" repeatCount="indefinite" />
          </path>
          <path d="M75,70 Q85,55 80,40" stroke="#374151" strokeWidth="6" fill="none" opacity="0.5" strokeLinecap="round">
            <animate attributeName="d" values="M75,70 Q85,55 80,40;M75,70 Q88,50 78,38;M75,70 Q85,55 80,40" dur="3s" repeatCount="indefinite" />
          </path>
          <path d="M40,90 Q35,100 30,105" stroke="#1F2937" strokeWidth="4" fill="none" opacity="0.4" strokeLinecap="round" />
          <path d="M60,90 Q65,100 70,105" stroke="#1F2937" strokeWidth="4" fill="none" opacity="0.4" strokeLinecap="round" />
        </>
      )}
      {/* Multiple glowing eyes */}
      {defeated ? (
        <>
          <line x1="35" y1="45" x2="42" y2="45" stroke="#555" strokeWidth="2" strokeLinecap="round" />
          <line x1="58" y1="45" x2="65" y2="45" stroke="#555" strokeWidth="2" strokeLinecap="round" />
          <line x1="44" y1="55" x2="48" y2="55" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="52" y1="55" x2="56" y2="55" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Main eyes */}
          <ellipse cx="38" cy="45" rx="5" ry="4" fill="#C084FC">
            <animate attributeName="opacity" values="1;0.6;1" dur="2.5s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="62" cy="45" rx="5" ry="4" fill="#C084FC">
            <animate attributeName="opacity" values="1;0.6;1" dur="2.5s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="38" cy="44" rx="2" ry="1.5" fill="#E9D5FF" />
          <ellipse cx="62" cy="44" rx="2" ry="1.5" fill="#E9D5FF" />
          {/* Secondary eyes */}
          <ellipse cx="46" cy="55" rx="3" ry="2.5" fill="#818CF8" opacity="0.7">
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="3s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="54" cy="55" rx="3" ry="2.5" fill="#818CF8" opacity="0.7">
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="3s" repeatCount="indefinite" />
          </ellipse>
          {/* Tiny eyes */}
          <circle cx="30" cy="38" r="2" fill="#A78BFA" opacity="0.5" />
          <circle cx="70" cy="38" r="2" fill="#A78BFA" opacity="0.5" />
        </>
      )}
      {/* Sharp claws */}
      {!defeated && (
        <>
          <path d="M20,65 L12,58 M20,68 L10,63 M20,71 L13,68" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
          <path d="M80,65 L88,58 M80,68 L90,63 M80,71 L87,68" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

// ─── Dragon Boss ────────────────────────────────────────────────────────────
function DragonBossSVG({ size = 120, className = "", defeated = false }: SpriteProps & { defeated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 110" className={className}>
      <ellipse cx="50" cy="107" rx="18" ry="4" fill="black" opacity="0.2" />
      {/* Wings */}
      {!defeated && (
        <>
          <path d="M20,45 Q5,15 15,35 Q10,20 22,30 Q15,25 25,38" fill="#7F1D1D" opacity="0.8" />
          <path d="M80,45 Q95,15 85,35 Q90,20 78,30 Q85,25 75,38" fill="#7F1D1D" opacity="0.8" />
        </>
      )}
      {/* Body */}
      <ellipse cx="50" cy="60" rx="24" ry="28" fill="#991B1B" />
      <ellipse cx="50" cy="64" rx="16" ry="20" fill="#FCA5A5" />
      {/* Belly scales */}
      <path d="M40,52 L50,48 L60,52" stroke="#E76F51" strokeWidth="1" fill="none" opacity="0.5" />
      <path d="M42,58 L50,54 L58,58" stroke="#E76F51" strokeWidth="1" fill="none" opacity="0.5" />
      <path d="M44,64 L50,60 L56,64" stroke="#E76F51" strokeWidth="1" fill="none" opacity="0.5" />
      {/* Head */}
      <ellipse cx="50" cy="28" rx="18" ry="16" fill="#991B1B" />
      <ellipse cx="50" cy="30" rx="14" ry="12" fill="#DC2626" />
      {/* Horns */}
      <path d="M32,18 Q28,5 33,12" fill="#7F1D1D" />
      <path d="M68,18 Q72,5 67,12" fill="#7F1D1D" />
      {/* Spikes down back */}
      <path d="M46,14 L50,8 L54,14" fill="#B91C1C" />
      <path d="M44,16 L47,11 L50,16" fill="#B91C1C" opacity="0.7" />
      {/* Eyes */}
      {defeated ? (
        <>
          <line x1="40" y1="27" x2="47" y2="27" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="53" y1="27" x2="60" y2="27" stroke="#555" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M44,38 Q50,34 56,38" stroke="#555" strokeWidth="2" fill="none" />
        </>
      ) : (
        <>
          <ellipse cx="42" cy="26" rx="5.5" ry="6" fill="white" />
          <ellipse cx="58" cy="26" rx="5.5" ry="6" fill="white" />
          <ellipse cx="43" cy="26" rx="3" ry="4" fill="#FFA500" />
          <ellipse cx="59" cy="26" rx="3" ry="4" fill="#FFA500" />
          <ellipse cx="43.5" cy="25" rx="1.5" ry="2" fill="black" />
          <ellipse cx="59.5" cy="25" rx="1.5" ry="2" fill="black" />
          {/* Nostrils + fire */}
          <circle cx="46" cy="35" r="1.5" fill="#7F1D1D" />
          <circle cx="54" cy="35" r="1.5" fill="#7F1D1D" />
          <ellipse cx="50" cy="40" rx="4" ry="2.5" fill="#FFA500" opacity="0.6">
            <animate attributeName="ry" values="2.5;3.5;2.5" dur="1s" repeatCount="indefinite" />
          </ellipse>
          <ellipse cx="50" cy="41" rx="2" ry="1.5" fill="#FFD700" opacity="0.5" />
        </>
      )}
      {/* Tail */}
      <path d="M72,70 Q85,60 88,75 Q82,68 80,78" fill="#991B1B" />
      <path d="M88,75 L92,70 L86,72" fill="#DC2626" />
      {/* Feet */}
      <ellipse cx="38" cy="85" rx="9" ry="6" fill="#7F1D1D" />
      <ellipse cx="62" cy="85" rx="9" ry="6" fill="#7F1D1D" />
      {/* Claws */}
      <circle cx="32" cy="85" r="2" fill="#991B1B" />
      <circle cx="36" cy="88" r="2" fill="#991B1B" />
      <circle cx="64" cy="88" r="2" fill="#991B1B" />
      <circle cx="68" cy="85" r="2" fill="#991B1B" />
    </svg>
  );
}

// ─── Corrupted Knight ───────────────────────────────────────────────────────
function CorruptedKnightSVG({ size = 115, className = "", defeated = false }: SpriteProps & { defeated?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 110" className={className}>
      <ellipse cx="50" cy="107" rx="16" ry="3.5" fill="black" opacity="0.2" />
      {/* Tattered cape */}
      <path d="M35,35 Q30,60 25,100 L75,100 Q70,60 65,35 Z" fill="#44403C" opacity="0.6" />
      <path d="M25,100 L28,92 L32,100 L35,94 L38,100" fill="#44403C" opacity="0.6" />
      <path d="M62,100 L65,94 L68,100 L72,92 L75,100" fill="#44403C" opacity="0.6" />
      {/* Armor body */}
      <rect x="32" y="38" width="36" height="40" rx="4" fill="#44403C" />
      <rect x="35" y="40" width="30" height="36" rx="3" fill="#57534E" />
      {/* Rust patches */}
      <ellipse cx="42" cy="50" rx="4" ry="3" fill="#92400E" opacity="0.4" />
      <ellipse cx="60" cy="60" rx="3" ry="4" fill="#92400E" opacity="0.3" />
      {/* Armor details */}
      <line x1="50" y1="40" x2="50" y2="76" stroke="#44403C" strokeWidth="2" />
      <rect x="38" y="52" width="24" height="3" rx="1.5" fill="#78716C" />
      {/* Cursed sword */}
      <rect x="78" y="30" width="3" height="50" rx="1" fill="#57534E" />
      <rect x="73" y="28" width="13" height="4" rx="2" fill="#44403C" />
      <path d="M78,30 L80,20 L82,30" fill="#78716C" />
      {!defeated && (
        <line x1="79.5" y1="25" x2="79.5" y2="75" stroke="#22D3EE" strokeWidth="1" opacity="0.4">
          <animate attributeName="opacity" values="0.4;0.1;0.4" dur="2s" repeatCount="indefinite" />
        </line>
      )}
      {/* Helmet */}
      <rect x="35" y="10" width="30" height="30" rx="6" fill="#44403C" />
      <rect x="38" y="13" width="24" height="24" rx="4" fill="#57534E" />
      {/* Broken helmet visor showing skull */}
      <path d="M40,22 L48,20 L55,22 L60,20 L62,24 L55,28 L50,30 L45,28 L38,24 Z" fill="#111" />
      {defeated ? (
        <>
          <line x1="43" y1="25" x2="48" y2="25" stroke="#78716C" strokeWidth="2" strokeLinecap="round" />
          <line x1="52" y1="25" x2="57" y2="25" stroke="#78716C" strokeWidth="2" strokeLinecap="round" />
        </>
      ) : (
        <>
          <circle cx="45" cy="24" r="2.5" fill="#06B6D4">
            <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
          </circle>
          <circle cx="55" cy="24" r="2.5" fill="#06B6D4">
            <animate attributeName="opacity" values="1;0.4;1" dur="2s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {/* Helmet horns */}
      <path d="M35,15 Q30,5 36,10" fill="#44403C" />
      <path d="M65,15 Q70,5 64,10" fill="#44403C" />
      {/* Shoulder armor */}
      <ellipse cx="27" cy="42" rx="8" ry="6" fill="#44403C" />
      <ellipse cx="73" cy="42" rx="8" ry="6" fill="#44403C" />
      <circle cx="27" cy="42" r="3" fill="#57534E" />
      <circle cx="73" cy="42" r="3" fill="#57534E" />
      {/* Arms */}
      <rect x="20" y="46" width="10" height="25" rx="4" fill="#57534E" />
      <rect x="70" y="46" width="10" height="25" rx="4" fill="#57534E" />
      {/* Gauntlets */}
      <ellipse cx="25" cy="73" rx="5" ry="4" fill="#44403C" />
      <ellipse cx="75" cy="73" rx="5" ry="4" fill="#44403C" />
      {/* Legs */}
      <rect x="35" y="76" width="12" height="22" rx="4" fill="#44403C" />
      <rect x="53" y="76" width="12" height="22" rx="4" fill="#44403C" />
      {/* Boots */}
      <ellipse cx="41" cy="98" rx="8" ry="5" fill="#3E2723" />
      <ellipse cx="59" cy="98" rx="8" ry="5" fill="#3E2723" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ─── UI ELEMENTS ────────────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════════════════

export function QuestionBlock({ size = 48, className = "", hit = false }: SpriteProps & { hit?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" className={`${className} ${hit ? "animate-block-hit" : ""}`}>
      <rect x="2" y="2" width="44" height="44" rx="4" fill={hit ? "#8B6914" : "#FFD700"} stroke="#B8860B" strokeWidth="2" />
      <rect x="4" y="4" width="8" height="8" rx="1" fill={hit ? "#6B5010" : "#FFF3B0"} opacity="0.6" />
      {!hit && <text x="24" y="33" textAnchor="middle" fill="#8B4513" fontSize="24" fontWeight="bold" fontFamily="'Fredoka', sans-serif">?</text>}
    </svg>
  );
}

export function Coin({ size = 24, className = "" }: SpriteProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={`${className} animate-coin-spin`}>
      <circle cx="12" cy="12" r="10" fill="#FFD700" stroke="#DAA520" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7" fill="#FFED4A" opacity="0.5" />
      <text x="12" y="16" textAnchor="middle" fill="#B8860B" fontSize="11" fontWeight="bold" fontFamily="'Fredoka', sans-serif">$</text>
    </svg>
  );
}

export function Heart({ size = 20, className = "", filled = true }: SpriteProps & { filled?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" className={className}>
      <path d="M10,17 L2,9 C0,6 0,3 3,2 C5,1 8,3 10,6 C12,3 15,1 17,2 C20,3 20,6 18,9 Z" fill={filled ? "#FF4444" : "#ddd"} stroke={filled ? "#CC0000" : "#bbb"} strokeWidth="0.5" />
    </svg>
  );
}

export function SpeechBubble({ children, className = "", position = "above" }: { children: React.ReactNode; className?: string; position?: "above" | "below" }) {
  return (
    <div className={`relative ${className}`}>
      <div className="bg-white rounded-2xl p-4 shadow-xl border-2 border-gray-100">
        {children}
      </div>
      <div
        className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${position === "above" ? "-bottom-2" : "-top-2"}`}
        style={position === "above" ? {
          borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderTop: "8px solid white",
        } : {
          borderLeft: "8px solid transparent", borderRight: "8px solid transparent", borderBottom: "8px solid white",
        }}
      />
    </div>
  );
}

export function DefeatedPoof({ size = 60, className = "" }: SpriteProps) {
  return (
    <div className={`${className} animate-poof`}>
      <svg width={size} height={size} viewBox="0 0 60 60">
        <circle cx="30" cy="30" r="20" fill="#FFE066" opacity="0.7" />
        <circle cx="30" cy="30" r="12" fill="#FFF" opacity="0.5" />
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
          <circle key={i} cx={30 + Math.cos((angle * Math.PI) / 180) * 22} cy={30 + Math.sin((angle * Math.PI) / 180) * 22} r="4" fill="#FFD700" opacity="0.8" />
        ))}
      </svg>
    </div>
  );
}

// ─── Boss Defeated Explosion (more dramatic) ────────────────────────────────
export function BossDefeatedExplosion({ size = 120, className = "", bossType }: SpriteProps & { bossType: BossType }) {
  const boss = BOSSES[bossType];
  return (
    <div className={`${className} animate-boss-explode`}>
      <svg width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="40" fill={boss.colors.accent} opacity="0.4">
          <animate attributeName="r" values="20;50;20" dur="0.8s" />
        </circle>
        <circle cx="60" cy="60" r="25" fill="white" opacity="0.3">
          <animate attributeName="r" values="10;35;10" dur="0.8s" />
        </circle>
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((angle, i) => (
          <circle
            key={i}
            cx={60 + Math.cos((angle * Math.PI) / 180) * 35}
            cy={60 + Math.sin((angle * Math.PI) / 180) * 35}
            r="5"
            fill={i % 2 === 0 ? boss.colors.accent : "#FFD700"}
            opacity="0.8"
          />
        ))}
      </svg>
    </div>
  );
}

// ─── Damage Flash Overlay ───────────────────────────────────────────────────
export function DamageFlash({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 bg-red-500/20 animate-damage-flash pointer-events-none z-[25]" />
  );
}

// ─── Floating Damage Number ─────────────────────────────────────────────────
export function FloatingDamage({ amount, x, y }: { amount: number; x: string; y: string }) {
  return (
    <div
      className="absolute animate-float-up pointer-events-none z-30"
      style={{ left: x, top: y, fontFamily: "'Fredoka', sans-serif" }}
    >
      <span className="text-2xl font-bold text-red-500 drop-shadow-lg">-{amount}</span>
    </div>
  );
}

// ─── Boss Health Bar ────────────────────────────────────────────────────────
export function BossHealthBar({ hp, maxHp, bossName }: { hp: number; maxHp: number; bossName: string }) {
  const pct = Math.max(0, (hp / maxHp) * 100);
  const barColor = pct > 50 ? "#EF4444" : pct > 25 ? "#F59E0B" : "#DC2626";

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-white/80 uppercase tracking-wider">{bossName}</span>
        <span className="text-[10px] font-bold text-white/60">{hp}/{maxHp}</span>
      </div>
      <div className="h-3 bg-black/30 rounded-full overflow-hidden border border-white/10">
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${barColor}, ${barColor}CC)` }}
        />
      </div>
    </div>
  );
}
