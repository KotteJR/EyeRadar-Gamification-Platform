"use client";

import { useMemo } from "react";
import { createAvatar } from "@dicebear/core";
import { avataaars } from "@dicebear/collection";

export interface AvatarConfig {
  clothing?: string[];
  clothesColor?: string[];
  top?: string[];
  hatColor?: string[];
  accessories?: string[];
  accessoriesColor?: string[];
  eyes?: string[];
  mouth?: string[];
  skinColor?: string[];
  hairColor?: string[];
  eyebrows?: string[];
  facialHair?: string[];
  facialHairColor?: string[];
  style?: string[];
  backgroundColor?: string[];
}

// Default config for a new student
export const DEFAULT_AVATAR: AvatarConfig = {
  clothing: ["hoodie"],
  clothesColor: ["65c9ff"],
  top: ["shortFlat"],
  accessories: [],
  eyes: ["default"],
  mouth: ["smile"],
  skinColor: ["ffdbb4"],
  hairColor: ["2c1b18"],
  eyebrows: ["default"],
  style: ["circle"],
  backgroundColor: ["b6e3f4"],
};

interface AvatarProps {
  config?: AvatarConfig;
  seed?: string;
  size?: number;
  className?: string;
}

export default function Avatar({ config, seed, size = 128, className = "" }: AvatarProps) {
  const avatarSrc = useMemo(() => {
    const opts = config || DEFAULT_AVATAR;
    try {
      const avatar = createAvatar(avataaars, {
        seed: seed || "default",
        size,
        clothing: (opts.clothing as never[]) || undefined,
        clothesColor: (opts.clothesColor as never[]) || undefined,
        top: (opts.top as never[]) || undefined,
        hatColor: (opts.hatColor as never[]) || undefined,
        accessories: (opts.accessories as never[]) || undefined,
        accessoriesColor: (opts.accessoriesColor as never[]) || undefined,
        accessoriesProbability: opts.accessories && opts.accessories.length > 0 ? 100 : 0,
        eyes: (opts.eyes as never[]) || undefined,
        mouth: (opts.mouth as never[]) || undefined,
        skinColor: (opts.skinColor as never[]) || undefined,
        hairColor: (opts.hairColor as never[]) || undefined,
        eyebrows: (opts.eyebrows as never[]) || undefined,
        facialHairProbability: 0,
        style: ["circle"] as never[],
        backgroundColor: (opts.backgroundColor || ["b6e3f4"]) as never[],
      });
      return avatar.toDataUri();
    } catch {
      return "";
    }
  }, [config, seed, size]);

  if (!avatarSrc) {
    return (
      <div
        className={`rounded-full bg-neutral-200 flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="text-neutral-400 text-xl">?</span>
      </div>
    );
  }

  return (
    <img
      src={avatarSrc}
      alt="Avatar"
      width={size}
      height={size}
      className={`rounded-full ${className}`}
    />
  );
}
