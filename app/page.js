"use client";

import React, { useState, useRef } from "react";

// Clean inline SVG icons for zero external dependencies and instant loading
function SparklesIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  );
}

function ClearIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function CopyIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function AlertCircleIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01" />
    </svg>
  );
}

function SpinnerIcon({ className = "w-5 h-5 animate-spin" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
}

const SAMPLE_PROMPTS = [
  {
    title: "Code Review",
    prompt: "Review my React code and find bugs.",
  },
  {
    title: "Cold Email",
    prompt: "Write a cold sales email to a VP of Engineering about our cloud cost tool.",
  },
  {
    title: "Blog Post",
    prompt: "Write a blog post about artificial intelligence in 2026.",
  },
  {
    title: "Salary Negotiation",
    prompt: "Write an email to my manager asking for a salary raise.",
  },
];

export default function Home() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const resultsRef = useRef(null);

  const handleAnalyze = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Please enter a prompt before analyzing.");
      return;
    }

    setIsLoading(true);
    setError(null);

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

      // Smooth scroll to results on mobile/small screens
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
    setCopied(false);
  };

  const handleCopy = async () => {
    if (!result?.optimizedPrompt) return;
    try {
      await navigator.clipboard.writeText(result.optimizedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement("textarea");
      textarea.value = result.optimizedPrompt;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Verdict badge colors
  const getVerdictBadge = (verdict, score) => {
    if (verdict === "Good" || score >= 80) {
      return {
        label: "Good",
        badgeClass: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
        barClass: "bg-emerald-500",
        textClass: "text-emerald-400",
      };
    }
    if (verdict === "Average" || (score >= 50 && score < 80)) {
      return {
        label: "Average",
        badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
        barClass: "bg-amber-500",
        textClass: "text-amber-400",
      };
    }
    return {
      label: "Needs Improvement",
      badgeClass: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
      barClass: "bg-rose-500",
      textClass: "text-rose-400",
    };
  };

  const verdictMeta = result ? getVerdictBadge(result.verdict, result.score) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-gradient-to-b from-indigo-600/15 via-purple-600/10 to-transparent blur-3xl opacity-70"></div>
      </div>

      {/* Main container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-10 sm:py-16 flex flex-col gap-8">
        {/* Header section */}
        <header className="text-center flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-medium tracking-wide uppercase">
            <SparklesIcon className="w-3.5 h-3.5" />
            <span>Powered by Google Gemini</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Prompt Analyzer &amp; Optimizer
          </h1>
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl leading-relaxed">
            Elevate your prompts into production-grade instructions. Get an instant score, pinpointed weaknesses, and a masterfully restructured rewrite.
          </p>
        </header>

        {/* Input Card */}
        <section className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl p-5 sm:p-7 backdrop-blur-sm flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <label htmlFor="prompt-input" className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <span>Your Raw Prompt</span>
              <span className="text-xs text-slate-500 font-normal">({prompt.length} characters)</span>
            </label>
            {prompt.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className="text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ClearIcon className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>

          <textarea
            id="prompt-input"
            rows={7}
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (error) setError(null);
            }}
            placeholder="Paste or type any prompt here... (e.g. 'Write a blog post about artificial intelligence for beginners with a friendly tone and code examples')"
            className="w-full bg-slate-950/80 text-slate-100 placeholder-slate-500 text-sm sm:text-base p-4 rounded-xl border border-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all resize-y leading-relaxed font-normal"
          />

          {/* Quick sample prompt pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs font-medium text-slate-500">Try an example:</span>
            {SAMPLE_PROMPTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPrompt(sample.prompt);
                  if (error) setError(null);
                }}
                className="text-xs bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg border border-slate-700/60 transition-colors cursor-pointer"
              >
                {sample.title}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={handleClear}
              disabled={isLoading || (!prompt && !result)}
              className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              <ClearIcon className="w-4 h-4" />
              Clear
            </button>

            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isLoading || !prompt.trim()}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-sm font-semibold shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer hover:shadow-indigo-500/35 active:scale-[0.99]"
            >
              {isLoading ? (
                <>
                  <SpinnerIcon className="w-4 h-4 animate-spin" />
                  <span>Analyzing &amp; Optimizing...</span>
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  <span>Analyze &amp; Optimize</span>
                </>
              )}
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-2.5 animate-fadeIn">
              <AlertCircleIcon className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
              <div className="flex-1">{error}</div>
            </div>
          )}
        </section>

        {/* Results Section */}
        {result && (
          <section ref={resultsRef} className="flex flex-col gap-6 animate-fadeIn">
            {/* Score & Verdict Card */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 sm:p-7 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-5 w-full sm:w-auto">
                {/* Visual Circular/Gauge-like Score display */}
                <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-slate-950 border border-slate-800 shadow-inner shrink-0">
                  <div className="flex flex-col items-center">
                    <span className={`text-3xl font-black tracking-tight ${verdictMeta?.textClass}`}>
                      {result.score}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                      / 100
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 flex-1">
                  <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">
                    Overall Readiness
                  </span>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${verdictMeta?.badgeClass}`}>
                      {result.verdict}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {result.score >= 80
                      ? "Excellent prompt with strong context, persona, and output instructions."
                      : result.score >= 50
                      ? "Good starting point, but lacks key constraints, persona, or explicit formatting."
                      : "Lacks core prompt engineering pillars; optimization recommended before LLM inference."}
                  </p>
                </div>
              </div>

              {/* Score Progress Bar */}
              <div className="w-full sm:w-56 flex flex-col gap-1.5">
                <div className="flex justify-between text-xs text-slate-400 font-medium">
                  <span>Prompt Quality</span>
                  <span className={verdictMeta?.textClass}>{result.score}%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${verdictMeta?.barClass}`}
                    style={{ width: `${Math.min(100, Math.max(0, result.score))}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Mistakes Card */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 sm:p-7 shadow-xl flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                <h3 className="text-base font-bold text-slate-200">
                  Detected Weaknesses &amp; Missing Elements
                </h3>
                <span className="ml-auto text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">
                  {result.mistakes?.length || 0} issues found
                </span>
              </div>

              {result.mistakes && result.mistakes.length > 0 ? (
                <ul className="grid grid-cols-1 gap-2.5">
                  {result.mistakes.map((mistake, idx) => (
                    <li
                      key={idx}
                      className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-sm text-slate-300 flex items-start gap-3 leading-relaxed"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-2 shrink-0"></span>
                      <span>{mistake}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-emerald-400 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  No critical mistakes or missing elements detected.
                </p>
              )}
            </div>

            {/* Optimized Prompt Box */}
            <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden flex flex-col">
              <div className="p-4 sm:p-5 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                  <h3 className="text-base font-bold text-slate-200">
                    Optimized Production-Ready Prompt
                  </h3>
                </div>

                {/* Working Copy Button */}
                <button
                  type="button"
                  onClick={handleCopy}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                    copied
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 hover:text-white"
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5" />
                      <span>Copy Prompt</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-5 sm:p-6 bg-slate-950/90 text-slate-200 text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans selection:bg-indigo-500 selection:text-white">
                {result.optimizedPrompt}
              </div>

              <div className="p-3 bg-slate-900/60 border-t border-slate-800/80 px-5 flex items-center justify-between text-xs text-slate-500">
                <span>Structured with role, context, task, constraints, and output format</span>
                <span>{result.optimizedPrompt?.length || 0} characters</span>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Prompt Analyzer &amp; Optimizer &bull; Built with Next.js, Tailwind CSS &amp; Google Gemini
      </footer>
    </div>
  );
}
