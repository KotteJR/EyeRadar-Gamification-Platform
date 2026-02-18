"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Volume2, ArrowRight, AlertCircle } from "lucide-react";
import { stt, type STTResult } from "@/lib/stt";
import { tts } from "@/lib/tts";
import { UISounds } from "@/lib/ui-sounds";
import type { GameRendererProps } from "./shared";

/**
 * Decoding – Read Aloud
 *
 * extra_data shape:
 * {
 *   word: string             — the word to read aloud
 *   is_pseudo_word?: boolean — true if it's a fake/pseudo word
 *   lang?: string            — BCP-47, defaults to "el-GR"
 *   show_hint_audio?: boolean — allow child to hear correct pronunciation after attempt
 *   max_attempts?: number    — max recording attempts (default 2)
 * }
 *
 * A word appears. The child presses the mic, reads it aloud, and STT
 * captures what they said. We do a fuzzy match on the transcript vs
 * the expected word. Pseudo-words test pure decoding ability.
 */
export default function ReadAloudGame({
  item,
  lastResult,
  submitting,
  onSubmit,
}: GameRendererProps) {
  const extra = item.extra_data as {
    word?: string;
    is_pseudo_word?: boolean;
    lang?: string;
    show_hint_audio?: boolean;
    max_attempts?: number;
  };

  const word = extra.word || item.question || "";
  const lang = extra.lang || "el-GR";
  const isPseudo = extra.is_pseudo_word || false;
  const maxAttempts = extra.max_attempts || 2;
  const isGreek = lang.startsWith("el");

  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimText, setInterimText] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [sttSupported, setSttSupported] = useState(true);
  const [showWord, setShowWord] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setTranscript("");
    setInterimText("");
    setAttempts(0);
    setShowWord(false);

    const timer = setTimeout(() => {
      if (mountedRef.current) setShowWord(true);
    }, 300);

    return () => {
      mountedRef.current = false;
      clearTimeout(timer);
      stt.stop();
    };
  }, [item.index]);

  useEffect(() => {
    setSttSupported(stt.isSupported());
  }, []);

  const startRecording = useCallback(async () => {
    if (recording || lastResult || submitting) return;

    setRecording(true);
    setTranscript("");
    setInterimText("");
    UISounds.start();

    try {
      const result = await stt.start(
        { lang, maxDuration: 8000 },
        (interim: STTResult) => {
          if (mountedRef.current) {
            setInterimText(interim.transcript);
          }
        }
      );

      if (!mountedRef.current) return;

      setRecording(false);
      const finalTranscript = result.transcript;
      setTranscript(finalTranscript);
      setAttempts((prev) => prev + 1);

      if (finalTranscript) {
        onSubmit(finalTranscript.toLowerCase());
      }
    } catch {
      if (mountedRef.current) {
        setRecording(false);
      }
    }
  }, [recording, lastResult, submitting, lang, onSubmit]);

  const stopRecording = () => {
    stt.stop();
    setRecording(false);
  };

  const playPronunciation = async () => {
    await tts.speak(word, { lang, rate: 0.6 });
  };

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
    <div className="game-card text-center">
      {/* Label */}
      <p className="text-sm text-gray-400 font-semibold mb-1">
        {item.question || "Read this word out loud"}
      </p>
      {isPseudo && (
        <span className="inline-block px-2.5 py-0.5 bg-purple-50 text-purple-600 text-xs font-bold rounded-full mb-3">
          {isGreek ? "Φανταστική λέξη" : "Made-up word"}
        </span>
      )}

      {/* The word to read */}
      <div
        className={`my-6 transition-all duration-500 ${
          showWord ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
      >
        <p className="text-5xl font-bold text-[#303FAE] tracking-wide">{word}</p>
      </div>

      {/* Mic button */}
      {!showResult && (
        <div className="mb-4">
          {recording ? (
            <button
              onClick={stopRecording}
              className="mx-auto flex items-center gap-2 px-8 py-4 bg-red-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-red-200 animate-pulse active:scale-95 transition-all"
            >
              <MicOff size={22} />
              {isGreek ? "Σταμάτα" : "Stop Recording"}
            </button>
          ) : (
            <button
              onClick={startRecording}
              disabled={submitting || attempts >= maxAttempts}
              className="mx-auto flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-[#FF5A39] to-[#FF9E75] text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-200 active:scale-95 transition-all disabled:opacity-40"
            >
              <Mic size={22} />
              {attempts > 0
                ? isGreek ? "Δοκίμασε ξανά" : "Try Again"
                : isGreek ? "Ξεκίνα να μιλάς" : "Start Speaking"}
            </button>
          )}

          {attempts > 0 && attempts < maxAttempts && !transcript && (
            <p className="text-xs text-gray-400 mt-2 font-medium">
              No speech detected. Try again!
            </p>
          )}
          {attempts >= maxAttempts && !showResult && (
            <p className="text-xs text-amber-500 mt-2 font-medium">
              Max attempts reached
            </p>
          )}
        </div>
      )}

      {/* Live transcript */}
      {recording && interimText && (
        <div className="mb-4 p-3 bg-gray-50 rounded-2xl">
          <p className="text-sm text-gray-400 font-semibold mb-1">{isGreek ? "Ακούω:" : "Hearing:"}</p>
          <p className="text-lg font-bold text-gray-700">{interimText}</p>
        </div>
      )}

      {/* Final transcript */}
      {!recording && transcript && (
        <div className="mb-4 p-3 bg-[#475093]/[0.04] rounded-2xl border border-[#475093]/10">
          <p className="text-sm text-gray-400 font-semibold mb-1">{isGreek ? "Είπες:" : "You said:"}</p>
          <p className="text-xl font-bold text-[#303FAE]">&ldquo;{transcript}&rdquo;</p>
        </div>
      )}

      {/* Result feedback */}
      {showResult && (
        <div
          className={`mt-4 p-4 rounded-2xl border-2 ${
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
              ? isGreek ? "Εξαιρετική προφορά!" : "Great pronunciation!"
              : isGreek ? "Όχι ακριβώς" : "Not quite right"}
          </p>
          {!lastResult.is_correct && (
            <p className="text-sm text-amber-600 mt-1">
              Expected: <strong>{lastResult.correct_answer}</strong>
            </p>
          )}
        </div>
      )}

      {/* Hear correct pronunciation */}
      {(extra.show_hint_audio !== false) && (
        <button
          onClick={playPronunciation}
          className="mt-4 mx-auto flex items-center gap-2 px-4 py-2 text-sm text-gray-500 hover:text-[#FF5A39] font-semibold transition-colors"
        >
          <Volume2 size={16} />
          {isGreek ? "Άκουσε προφορά" : "Hear pronunciation"}
        </button>
      )}

      {/* Skip / Next for stuck children */}
      {!showResult && attempts >= maxAttempts && (
        <button
          onClick={() => onSubmit("__skipped__")}
          className="mt-3 mx-auto flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 font-semibold"
        >
          {isGreek ? "Παράλειψη" : "Skip"} <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}
