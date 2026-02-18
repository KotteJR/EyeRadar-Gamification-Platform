"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Mic, MicOff, Clock, Play, AlertCircle, ImageIcon } from "lucide-react";
import { stt, type STTResult } from "@/lib/stt";
import { UISounds } from "@/lib/ui-sounds";
import type { GameRendererProps } from "./shared";

/**
 * Rapid Automatized Naming (RAN)
 *
 * extra_data shape:
 * {
 *   images: { id: string; url: string; label: string }[]  — grid items
 *   grid_cols?: number     — columns (default 5)
 *   grid_rows?: number     — rows (default 4)
 *   time_limit?: number    — seconds (default 30)
 *   lang?: string          — BCP-47 (default "el-GR")
 *   expected_names?: string[] — ordered list of expected names for scoring
 * }
 *
 * A grid of images (animals, objects) is shown. The child names all images
 * as fast and accurately as possible while the mic records continuously.
 * After time runs out or the child stops, we submit the recognized words.
 */

type RANImage = {
  id: string;
  url: string;
  label: string;
};

export default function RapidNamingGame({
  item,
  lastResult,
  submitting,
  onSubmit,
}: GameRendererProps) {
  const extra = item.extra_data as {
    images?: RANImage[];
    grid_cols?: number;
    grid_rows?: number;
    time_limit?: number;
    lang?: string;
    expected_names?: string[];
  };

  const images = extra.images || [];
  const cols = extra.grid_cols || 5;
  const timeLimit = (extra.time_limit || 30) * 1000;
  const lang = extra.lang || "el-GR";

  const [phase, setPhase] = useState<"ready" | "recording" | "done">("ready");
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [currentTranscript, setCurrentTranscript] = useState("");
  const [allTranscripts, setAllTranscripts] = useState<string[]>([]);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [sttSupported, setSttSupported] = useState(true);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setPhase("ready");
    setTimeLeft(timeLimit);
    setCurrentTranscript("");
    setAllTranscripts([]);
    setHighlightIdx(-1);

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      stt.stop();
    };
  }, [item.index, timeLimit]);

  useEffect(() => {
    setSttSupported(stt.isSupported());
  }, []);

  const startRecording = useCallback(async () => {
    if (phase !== "ready") return;
    UISounds.start();
    setPhase("recording");
    setTimeLeft(timeLimit);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          stt.stop();
          return 0;
        }
        return prev - 100;
      });
    }, 100);

    let wordCount = 0;
    try {
      const transcripts = await stt.record(timeLimit, { lang }, (interim: STTResult) => {
        if (!mountedRef.current) return;
        setCurrentTranscript(interim.transcript);

        if (interim.isFinal) {
          const words = interim.transcript.split(/\s+/).filter(Boolean);
          wordCount += words.length;
          setHighlightIdx(Math.min(wordCount - 1, images.length - 1));
        }
      });

      if (!mountedRef.current) return;

      if (timerRef.current) clearInterval(timerRef.current);
      setAllTranscripts(transcripts);
      setPhase("done");

      const answer = transcripts.join(" ").trim();
      if (answer) {
        onSubmit(answer.toLowerCase());
      } else {
        onSubmit("__no_speech__");
      }
    } catch {
      if (mountedRef.current) {
        if (timerRef.current) clearInterval(timerRef.current);
        setPhase("done");
        onSubmit("__error__");
      }
    }
  }, [phase, timeLimit, lang, images.length, onSubmit]);

  const stopEarly = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    stt.stop();
  };

  const progress = (timeLeft / timeLimit) * 100;
  const isUrgent = progress < 25;
  const showResult = lastResult !== null;

  if (!sttSupported) {
    return (
      <div className="game-card text-center">
        <div className="flex items-center justify-center gap-2 text-amber-600 mb-4">
          <AlertCircle size={20} />
          <p className="font-bold">Speech recognition is not available in this browser.</p>
        </div>
        <p className="text-sm text-gray-500">Please use Chrome or Edge for voice-based exercises.</p>
      </div>
    );
  }

  return (
    <div className="game-card">
      <p className="text-lg font-bold text-gray-900 mb-2 text-center">
        {item.question || "Name all the pictures as fast as you can!"}
      </p>

      {/* Timer bar */}
      {phase === "recording" && (
        <div className="mb-3">
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-100 ${
                isUrgent ? "bg-red-500" : "bg-[#FF5A39]"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p
            className={`flex items-center gap-1 text-xs mt-1 text-right font-bold ${
              isUrgent ? "text-red-500" : "text-gray-400"
            }`}
          >
            <Clock size={12} /> {Math.ceil(timeLeft / 1000)}s
          </p>
        </div>
      )}

      {/* Image grid */}
      <div
        className="grid gap-2 mb-4 justify-center"
        style={{
          gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
          maxWidth: `${cols * 72}px`,
          margin: "0 auto",
        }}
      >
        {images.map((img, idx) => {
          const isHighlighted = phase === "recording" && idx <= highlightIdx;
          return (
            <div
              key={idx}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                isHighlighted
                  ? "border-emerald-400 bg-emerald-50 scale-105"
                  : "border-gray-100 bg-white"
              }`}
            >
              {img.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={img.url}
                  alt={img.label}
                  className="w-full aspect-square object-contain p-1"
                />
              ) : (
                <div className="w-full aspect-square flex items-center justify-center">
                  <ImageIcon size={20} className="text-gray-300" />
                </div>
              )}
              {showResult && (
                <p className="text-[9px] text-center font-bold text-gray-500 pb-0.5 truncate px-0.5">
                  {img.label}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Live transcript */}
      {phase === "recording" && currentTranscript && (
        <div className="mb-3 p-2 bg-gray-50 rounded-xl text-center">
          <p className="text-sm font-medium text-gray-600">{currentTranscript}</p>
        </div>
      )}

      {/* Controls */}
      {phase === "ready" && !showResult && (
        <button
          onClick={startRecording}
          className="mx-auto flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#FF5A39] to-[#FF9E75] text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-200 active:scale-95 transition-all"
        >
          <Play size={22} />
          Start Naming
        </button>
      )}

      {phase === "recording" && (
        <button
          onClick={stopEarly}
          className="mx-auto flex items-center gap-2 px-6 py-3 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-200 animate-pulse active:scale-95 transition-all"
        >
          <MicOff size={18} />
          Done!
        </button>
      )}

      {/* Results */}
      {phase === "done" && allTranscripts.length > 0 && (
        <div className="mt-3 p-3 bg-[#475093]/[0.04] rounded-xl border border-[#475093]/10 text-center">
          <p className="text-xs text-gray-400 font-semibold mb-1">You said:</p>
          <p className="text-sm font-bold text-[#303FAE]">
            {allTranscripts.join(", ")}
          </p>
        </div>
      )}

      {showResult && (
        <div
          className={`mt-4 p-4 rounded-2xl border-2 text-center ${
            lastResult.is_correct
              ? "bg-emerald-50 border-emerald-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <p
            className={`text-base font-bold ${
              lastResult.is_correct ? "text-emerald-700" : "text-amber-700"
            }`}
          >
            {lastResult.is_correct
              ? `Great! +${lastResult.points_earned} points`
              : "Keep practicing!"}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Speed and accuracy are both tracked
          </p>
        </div>
      )}
    </div>
  );
}
