"use client";

import {
  Ear,
  Timer,
  Music,
  FlaskConical,
  ArrowLeftRight,
  Rocket,
  Layers,
  Shapes,
  Waves,
  Grid3x3,
  ListOrdered,
  RotateCcw,
  BookOpen,
  Brain,
  Search,
  Route,
  Puzzle,
  FlipHorizontal,
  Zap,
  TrendingUp,
  BookMarked,
  Rabbit,
  Mic,
  Map,
  Target,
  ScanSearch,
  Building2,
  Film,
  Gamepad2,
  Eye,
  Lightbulb,
  CircleDot,
  Keyboard,
  ArrowUpDown,
  Clock,
  Crosshair,
  PenTool,
  Navigation,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Ear,
  Timer,
  Music,
  FlaskConical,
  ArrowLeftRight,
  Rocket,
  Layers,
  Shapes,
  Waves,
  Grid3x3,
  ListOrdered,
  RotateCcw,
  BookOpen,
  Brain,
  Search,
  Route,
  Puzzle,
  PuzzleIcon: Puzzle,
  FlipHorizontal,
  Zap,
  TrendingUp,
  BookMarked,
  Rabbit,
  Mic,
  Map,
  Target,
  ScanSearch,
  Building2,
  Film,
  Gamepad2,
  Eye,
  Lightbulb,
  CircleDot,
  Keyboard,
  ArrowUpDown,
  Clock,
  Crosshair,
  PenTool,
  Navigation,
};

interface GameIconProps {
  name: string;
  size?: number;
  className?: string;
  color?: string;
  strokeWidth?: number;
}

export default function GameIcon({
  name,
  size = 24,
  className = "",
  color,
  strokeWidth = 2,
}: GameIconProps) {
  const IconComponent = ICON_MAP[name] || Gamepad2;
  return (
    <IconComponent
      size={size}
      className={className}
      color={color}
      strokeWidth={strokeWidth}
    />
  );
}

export { ICON_MAP };
