"use client";

import React, { useState, useRef } from "react";

// Clean inline SVG icons with explicit width/height so they never render oversized
function SparklesIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function TrophyIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 21h8m-4-4v4m-5-8.5C7 8.5 7 4 7 4h10s0 4.5-2 8.5c-1.2 2.4-3 3.5-3 3.5s-1.8-1.1-3-3.5zM7 6H4a2 2 0 00-2 2v1c0 2.2 1.8 4 4 4h1m10-7h3a2 2 0 012 2v1c0 2.2-1.8 4-4 4h-1" />
    </svg>
  );
}

function CrownIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 18h18M4 8l4 6 4-8 4 8 4-6v10H4V8z" />
    </svg>
  );
}

function ClearIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function CopyIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function AlertCircleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
    </svg>
  );
}

function SpinnerIcon({ className = "w-5 h-5 animate-spin" }) {
  return (
    <svg className={className} width="20" height="20" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4}></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

const SAMPLE_PROMPTS = [
  {
    title: "Code Review",
    prompt: "Review my React code and find performance bugs.",
  },
  {
    title: "Cold Email",
    prompt: "Write a cold sales email to a VP of Engineering about our AI tool.",
  },
  {
    title: "Blog Post",
    prompt: "Write a high-converting blog post about the future of AI agents in 2026.",
  },
  {
    title: "Photo Edit",
    prompt: "Transform this photo into an aesthetic cinematic portrait with warm golden-hour lighting.",
  },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copiedBest, setCopiedBest] = useState(false);
  const [copiedModels, setCopiedModels] = useState({});
  const resultsRef = useRef(null);

  const handleAnalyze = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Please enter a prompt before analyzing.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setCopiedBest(false);
    setCopiedModels({});

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: trimmed }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze prompt. Please try again.");
      }

      setResult(data);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setPrompt("");
    setResult(null);
    setError(null);
    setCopiedBest(false);
    setCopiedModels({});
  };

  const copyToClipboard = async (text, onCopied) => {
    if (!text) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      onCopied();
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  };

  const handleCopyBest = () => {
    const text = result?.best?.optimizedPrompt || result?.optimizedPrompt;
    copyToClipboard(text, () => {
      setCopiedBest(true);
      setTimeout(() => setCopiedBest(false), 2000);
    });
  };

  const handleCopyModel = (modelKey, text) => {
    copyToClipboard(text, () => {
      setCopiedModels((prev) => ({ ...prev, [modelKey]: true }));
      setTimeout(() => {
        setCopiedModels((prev) => ({ ...prev, [modelKey]: false }));
      }, 2000);
    });
  };

  // Helper for score badges
  const getScoreBadge = (score) => {
    if (score >= 80) {
      return {
        bg: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        label: `${score}/100`,
        tag: "Excellent",
      };
    }
    if (score >= 50) {
      return {
        bg: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        label: `${score}/100`,
        tag: "Good",
      };
    }
    return {
      bg: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
      label: `${score}/100`,
      tag: "Needs Polish",
    };
  };

  const modelConfigs = [
    {
      key: "gemini",
      name: "Gemini",
      modelTag: "gemini-2.5-flash",
      brandColor: "#4285f4",
      accentBg: "bg-[#4285f4]/15 border-[#4285f4]/30 text-[#8ab4f8]",
      btnBg: "bg-[#4285f4] hover:bg-[#5a95f5]",
      btnOutline: "bg-[#4285f4]/15 text-[#8ab4f8] hover:bg-[#4285f4]/25 border border-[#4285f4]/30",
    },
    {
      key: "chatgpt",
      name: "ChatGPT",
      modelTag: "gpt-4o-mini",
      brandColor: "#10a37f",
      accentBg: "bg-[#10a37f]/15 border-[#10a37f]/30 text-[#6ee7b7]",
      btnBg: "bg-[#10a37f] hover:bg-[#059669]",
      btnOutline: "bg-[#10a37f]/15 text-[#6ee7b7] hover:bg-[#10a37f]/25 border border-[#10a37f]/30",
    },
    {
      key: "claude",
      name: "Claude",
      modelTag: "claude-sonnet-4",
      brandColor: "#d97706",
      accentBg: "bg-[#d97706]/15 border-[#d97706]/30 text-[#fcd34d]",
      btnBg: "bg-[#d97706] hover:bg-[#b45309]",
      btnOutline: "bg-[#d97706]/15 text-[#fcd34d] hover:bg-[#d97706]/25 border border-[#d97706]/30",
    },
  ];

  return (
    <div className="min-h-screen bg-[#131314] relative overflow-hidden text-slate-100 flex flex-col font-sans">
      {/* Gemini-style ambient glow layer */}
      <div className="gemini-ambient-glow animate-glow-drift pointer-events-none" />

      {/* Main container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col gap-8 relative z-10">
        {/* Header section */}
        <header className="text-center flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-blue-300 text-xs font-semibold tracking-wide uppercase">
            <SparklesIcon className="w-5 h-5 text-blue-400" />
            <span>Simultaneous Multi-Model Arena &bull; Gemini &bull; ChatGPT &bull; Claude</span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent drop-shadow-sm">
            Prompt Analyzer &amp; Arena
          </h1>
          <p className="text-sm sm:text-base text-[#9aa0a6] max-w-2xl leading-relaxed font-normal">
            Submit your prompt once. Gemini, ChatGPT, and Claude optimize it in parallel, and our AI judge crowns the single Best Overall Prompt.
          </p>
        </header>

        {/* Horizontal Prompt Bar Card */}
        <section className="bg-[#1e1f20] border border-[#303134] rounded-2xl p-5 sm:p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex items-center justify-between">
            <label htmlFor="prompt-input" className="text-sm font-semibold text-[#e3e3e8] flex items-center gap-2">
              <span>Raw Prompt Input</span>
              <span className="text-xs text-[#9aa0a6] font-normal">({prompt.length} characters)</span>
            </label>
            {prompt.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-[#9aa0a6] hover:text-[#e3e3e8] transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ClearIcon className="w-5 h-5" />
                Clear
              </button>
            )}
          </div>

          <textarea
            id="prompt-input"
            rows={5}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (error) setError(null);
            }}
            placeholder={"Type or paste your prompt here...\n(e.g. 'Write a blog post about AI' or 'Edit this photo to look cinematic')"}
            className="w-full bg-[#131314] text-[#e3e3e8] placeholder-[#5f6368] text-sm sm:text-base p-4 rounded-xl border border-[#303134] focus:outline-none focus:border-blue-500/60 focus:ring-2 focus:ring-blue-500/15 transition-all resize-y leading-relaxed font-normal"
          />

          {/* Quick sample prompt pills */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-[#9aa0a6]">Sample prompts:</span>
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(sample.prompt);
                  if (error) setError(null);
                }}
                className="text-xs bg-[#303134]/60 hover:bg-[#303134] text-[#bdc1c6] hover:text-white px-2.5 py-1 rounded-lg border border-[#3c4043] hover:border-[#5f6368] transition-all cursor-pointer"
              >
                {sample.title}
              </button>
            ))}
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-[#303134]">
            <div className="flex items-center gap-2 text-xs text-[#9aa0a6]">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Compares 3 models simultaneously in parallel</span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleClear}
                disabled={isLoading || (!prompt && !result)}
                className="px-4 py-2.5 rounded-xl border border-[#303134] bg-[#131314] hover:bg-[#282a2c] text-[#bdc1c6] hover:text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                <ClearIcon className="w-5 h-5" />
                Clear
              </button>

              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isLoading || !prompt.trim()}
                className="px-6 py-2.5 rounded-xl bg-[#4285f4] hover:bg-[#5a95f5] text-white text-sm font-semibold shadow-[0_2px_14px_rgba(66,133,244,0.35)] hover:shadow-[0_4px_22px_rgba(66,133,244,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <SpinnerIcon className="w-5 h-5 animate-spin text-blue-100" />
                    <span>Analyzing Across 3 Models...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5 text-blue-100" />
                    <span>Analyze &amp; Compare Models</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5">
              <AlertCircleIcon className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}
        </section>

        {/* Results Section */}
        {result && (
          <section ref={resultsRef} className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* 1. Highlighted '🏆 Best Overall Prompt' Hero Card */}
            {result.best && (
              <div className="relative rounded-2xl p-6 sm:p-7 bg-gradient-to-br from-[#1e1f20] via-[#232427] to-[#1e1f20] border-2 border-amber-500/50 shadow-[0_0_40px_rgba(245,158,11,0.15)] overflow-hidden">
                {/* Subtle gold flare background */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col gap-4">
                  {/* Top Header of Hero Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#303134]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 shadow-sm">
                        <TrophyIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-wide">
                            🏆 Best Overall Prompt
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-500/40 text-amber-300">
                            Crowned Winner: {result.best.winnerName}
                          </span>
                        </div>
                        <p className="text-xs text-[#9aa0a6] mt-0.5">
                          Selected by Gemini Judge based on clarity, specificity, and structural effectiveness
                        </p>
                      </div>
                    </div>

                    {/* One-Click Copy Best Prompt Button */}
                    <button
                      type="button"
                      onClick={handleCopyBest}
                      className={`self-start sm:self-auto px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all cursor-pointer shadow-md ${
                        copiedBest
                          ? "bg-emerald-500 text-white shadow-emerald-500/20"
                          : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black shadow-amber-500/20 hover:scale-[1.02] active:scale-[0.98]"
                      }`}
                    >
                      {copiedBest ? (
                        <>
                          <CheckIcon className="w-5 h-5 text-white" />
                          <span>Copied Best Prompt!</span>
                        </>
                      ) : (
                        <>
                          <CopyIcon className="w-5 h-5" />
                          <span>Copy Best Prompt</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Why It Won Callout */}
                  {result.best.reason && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs sm:text-sm leading-relaxed flex items-start gap-2.5">
                      <CrownIcon className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                      <div>
                        <span className="font-semibold text-amber-300 mr-1.5">Why it won:</span>
                        <span>{result.best.reason}</span>
                      </div>
                    </div>
                  )}

                  {/* Winning Optimized Prompt Container */}
                  <div className="relative rounded-xl bg-[#131314] border border-[#303134] p-4 sm:p-5 font-mono text-xs sm:text-sm text-[#e3e3e8] leading-relaxed whitespace-pre-wrap selection:bg-amber-500/30 selection:text-white shadow-inner max-h-[380px] overflow-y-auto">
                    {result.best.optimizedPrompt}
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#9aa0a6] pt-1">
                    <span>Ready for direct production deployment</span>
                    <span>{result.best.optimizedPrompt?.length || 0} characters</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Clean 3-Column Comparison Grid */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">
                    Individual Model Comparison
                  </h3>
                  <span className="text-xs text-[#9aa0a6] hidden sm:inline">
                    (Gemini &bull; ChatGPT &bull; Claude)
                  </span>
                </div>
                <span className="text-xs text-[#9aa0a6]">
                  Evaluated in parallel
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {modelConfigs.map((cfg) => {
                  const modelData = result.models?.[cfg.key];
                  const isWinner = result.best?.winner === cfg.key;
                  const isCopied = copiedModels[cfg.key];
                  const scoreBadge = getScoreBadge(modelData?.score || 0);

                  return (
                    <div
                      key={cfg.key}
                      className={`rounded-2xl p-5 bg-[#1e1f20] border flex flex-col justify-between gap-4 transition-all duration-200 ${
                        isWinner
                          ? "border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)]"
                          : "border-[#303134] hover:border-[#424449]"
                      }`}
                    >
                      {/* Column Header */}
                      <div className="flex flex-col gap-2.5 pb-3 border-b border-[#303134]">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cfg.brandColor }}
                            />
                            <h4 className="text-base font-bold text-white">
                              {cfg.name}
                            </h4>
                            <span className="text-[11px] font-mono text-[#9aa0a6] px-1.5 py-0.5 rounded bg-[#131314] border border-[#303134]">
                              {cfg.modelTag}
                            </span>
                          </div>

                          {isWinner && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              <CrownIcon className="w-5 h-5 text-amber-400" />
                              Winner
                            </span>
                          )}
                        </div>

                        {/* Score and status badge */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-[#9aa0a6]">Quality Score:</span>
                          {modelData?.status === "error" ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                              API Unavailable
                            </span>
                          ) : (
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${scoreBadge.bg}`}>
                              {scoreBadge.label} ({scoreBadge.tag})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Weaknesses Identified */}
                      {modelData?.weaknesses && modelData.weaknesses.length > 0 && (
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] uppercase tracking-wider text-[#9aa0a6] font-semibold">
                            Weaknesses Detected:
                          </span>
                          <ul className="space-y-1 text-xs text-[#bdc1c6]">
                            {modelData.weaknesses.slice(0, 3).map((w, idx) => (
                              <li key={idx} className="flex items-start gap-1.5 leading-snug">
                                <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                                <span className="line-clamp-2">{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Model Optimized Prompt Preview */}
                      <div className="flex flex-col gap-1.5 flex-1">
                        <span className="text-[11px] uppercase tracking-wider text-[#9aa0a6] font-semibold">
                          Optimized Prompt:
                        </span>
                        <div className="flex-1 min-h-[180px] max-h-[260px] overflow-y-auto p-3.5 rounded-xl bg-[#131314] border border-[#303134] text-xs font-mono text-[#e3e3e8] leading-relaxed whitespace-pre-wrap shadow-inner selection:bg-blue-500/30 selection:text-white">
                          {modelData?.optimizedPrompt || "No prompt generated"}
                        </div>
                      </div>

                      {/* Individual Copy Button */}
                      <div className="pt-2 border-t border-[#303134] flex items-center justify-between gap-2">
                        <span className="text-[11px] text-[#9aa0a6]">
                          {modelData?.optimizedPrompt?.length || 0} chars
                        </span>

                        <button
                          type="button"
                          disabled={!modelData?.optimizedPrompt || modelData?.status === "error"}
                          onClick={() => handleCopyModel(cfg.key, modelData?.optimizedPrompt)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                            isCopied
                              ? "bg-emerald-500 text-white"
                              : cfg.btnOutline
                          }`}
                        >
                          {isCopied ? (
                            <>
                              <CheckIcon className="w-5 h-5 text-white" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <CopyIcon className="w-5 h-5" />
                              <span>Copy {cfg.name}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#303134] py-6 text-center text-xs text-[#9aa0a6] relative z-10">
        Prompt Analyzer &amp; Arena &bull; Parallel Multi-Model Comparison powered by Gemini, ChatGPT &amp; Claude
      </footer>
    </div>
  );
}
