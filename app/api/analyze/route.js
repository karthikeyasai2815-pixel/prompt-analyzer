import { GoogleGenAI } from "@google/genai";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_INSTRUCTION = `You are a World-Class Principal Prompt Engineer and LLM Architect.
Your task is to analyze the user's raw AI prompt and produce THREE DISTINCT, TAILORED prompt optimizations—each engineered specifically for the prompt conventions and strengths of major AI models:

1. GEMINI OPTIMIZATION (concise, context-rich):
   - Style: Direct, information-dense, and context-rich.
   - Grounded with clear background knowledge, unambiguous objective, and efficient phrasing without conversational filler.
   - Capitalizes on Google Gemini's multimodal and large-context reasoning capabilities.

2. CHATGPT OPTIMIZATION (clear persona, bulleted rules):
   - Style: Explicit Role/Persona definition, step-by-step task breakdown, bulleted negative constraints and boundaries, and explicit output format expectations.
   - Formatted with clean Markdown headings and bulleted rules tailored for OpenAI GPT-4o models.

3. CLAUDE OPTIMIZATION (structured with XML tags):
   - Style: Structured with semantic XML tags such as <context>, <instructions>, <task>, <constraints>, and <output_format>.
   - Incorporates Anthropic Claude's recommended prompt scaffolding to maximize steering accuracy and minimize hallucination.

INTENT DETECTION:
- If the user's prompt is an Image Generation or Photo Editing request (e.g. "make this photo aesthetic", "change background to sunset", "generate cinematic cyberpunk street"):
  - Rewrite as a direct visual generation instruction describing lighting, color grading, camera angle, textures, mood, and composition (e.g. "Transform the uploaded photo into...").
  - NEVER use tutorial words like "explain how to", "give step-by-step instructions", or "provide a guide".

EVALUATION & BENCHMARKING:
- For each model's evaluation of the original raw prompt:
  - Assign an objective quality score from 0 to 100.
  - Set a verdict: "Good" (80-100), "Average" (50-79), or "Needs Improvement" (0-49).
  - List 2 to 4 specific weaknesses or missing elements (e.g. missing role, vague constraints, lacks output format).
- Compare the three generated prompts against clarity, specificity, and effectiveness.
- Select the single Overall Best Prompt winner ('gemini', 'chatgpt', or 'claude').
- Provide a concise 1-2 sentence explanation of why this model's version won overall.

You MUST return a STRICT JSON object with this exact structure:
{
  "best": {
    "winner": "gemini" | "chatgpt" | "claude",
    "winnerName": "Gemini" | "ChatGPT" | "Claude",
    "reason": "1-2 sentences explaining why this model's prompt won overall based on clarity, specificity, and effectiveness."
  },
  "models": {
    "gemini": {
      "score": <0-100>,
      "verdict": "Good" | "Average" | "Needs Improvement",
      "weaknesses": ["weakness 1", "weakness 2"],
      "optimizedPrompt": "<concise context-rich prompt tailored for Gemini>"
    },
    "chatgpt": {
      "score": <0-100>,
      "verdict": "Good" | "Average" | "Needs Improvement",
      "weaknesses": ["weakness 1", "weakness 2"],
      "optimizedPrompt": "<persona and bulleted rules prompt tailored for ChatGPT>"
    },
    "claude": {
      "score": <0-100>,
      "verdict": "Good" | "Average" | "Needs Improvement",
      "weaknesses": ["weakness 1", "weakness 2"],
      "optimizedPrompt": "<structured prompt with XML tags tailored for Claude>"
    }
  }
}`;

function cleanJsonText(rawText) {
  let text = (rawText || "").trim();
  if (text.startsWith("```json")) {
    text = text.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
  } else if (text.startsWith("```")) {
    text = text.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  }
  return text;
}

function sanitizeScore(val, fallback = 75) {
  if (typeof val === "number" && !isNaN(val)) {
    return Math.max(0, Math.min(100, Math.round(val)));
  }
  return fallback;
}

function sanitizeVerdict(verdict, score) {
  if (
    verdict === "Good" ||
    verdict === "Average" ||
    verdict === "Needs Improvement"
  ) {
    return verdict;
  }
  if (score >= 80) return "Good";
  if (score >= 50) return "Average";
  return "Needs Improvement";
}

function sanitizeWeaknesses(list, fallback = ["Missing explicit constraints and clear formatting guidelines."]) {
  if (Array.isArray(list) && list.length > 0) {
    return list.map((item) => String(item).trim()).filter(Boolean);
  }
  return fallback;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isOverloadedOrRateLimited(err) {
  if (!err) return false;
  const status = err.status || err.statusCode || err.response?.status;
  if (status === 503 || status === 429) return true;
  const msg = String(err.message || err).toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("overloaded") ||
    msg.includes("high demand") ||
    msg.includes("rate limit") ||
    msg.includes("resource has been exhausted") ||
    msg.includes("resource_exhausted") ||
    msg.includes("temporarily unavailable") ||
    msg.includes("service unavailable")
  );
}

export async function POST(req) {
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json(
        { error: "Invalid JSON in request body." },
        { status: 400 }
      );
    }

    const { prompt } = body || {};

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return Response.json(
        { error: "The 'prompt' field is required and must be a non-empty string." },
        { status: 400 }
      );
    }

    const trimmedPrompt = prompt.trim();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return Response.json(
        {
          error:
            "GEMINI_API_KEY is not configured. Please set GEMINI_API_KEY in your .env.local file.",
        },
        { status: 500 }
      );
    }

    // Active fallback list: gemini-3.8-flash, gemini-3.5-flash-lite, gemini-flash-latest
    const modelsToTry = [
      "gemini-3.8-flash",
      "gemini-3.5-flash-lite",
      "gemini-flash-latest",
    ];

    let lastError = null;
    let parsedResult = null;

    const userPromptPayload = `Analyze and optimize this raw prompt across Gemini, ChatGPT, and Claude:\n\n"""\n${trimmedPrompt}\n"""\n\nGenerate the three model-specific prompt optimizations (Gemini concise & context-rich; ChatGPT clear persona & bulleted rules; Claude structured with <instructions> and <context> XML tags), individual quality scores, weaknesses, and select the Best Overall Prompt winner. Return strict JSON.`;

    // Loop through fallback models with automatic 503/429 retry
    for (let i = 0; i < modelsToTry.length; i++) {
      const modelName = modelsToTry[i];
      try {
        let responseText = null;

        // Try official @google/genai SDK
        try {
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
            model: modelName,
            contents: userPromptPayload,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          });
          responseText = response?.text;
        } catch (genAiErr) {
          // If high demand / rate limited, rethrow immediately to trigger 1s wait and next model
          if (isOverloadedOrRateLimited(genAiErr)) {
            throw genAiErr;
          }
          // Otherwise try @google/generative-ai SDK as alternative fallback caller
          const genAI = new GoogleGenerativeAI(apiKey);
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
            systemInstruction: SYSTEM_INSTRUCTION,
          });
          const result = await model.generateContent(userPromptPayload);
          responseText = result.response.text();
        }

        if (responseText) {
          const cleaned = cleanJsonText(responseText);
          parsedResult = JSON.parse(cleaned);
          if (parsedResult && parsedResult.models && parsedResult.best) {
            // Succeeded with this model
            break;
          }
        }
      } catch (err) {
        lastError = err;
        const isTemporary = isOverloadedOrRateLimited(err);
        console.warn(
          `Gemini model ${modelName} failed (${isTemporary ? "503/429 high demand" : err.message}).`
        );

        // If 503 (high demand/overloaded) or 429, wait 1 second before trying the next model
        if (isTemporary && i < modelsToTry.length - 1) {
          console.warn(
            `Waiting 1s before attempting next fallback model (${modelsToTry[i + 1]})...`
          );
          await sleep(1000);
        }
      }
    }

    // Only return an error if all models in the fallback list fail
    if (!parsedResult || !parsedResult.models) {
      console.error("All Gemini fallback models failed:", lastError);
      const isOverload = isOverloadedOrRateLimited(lastError);
      return Response.json(
        {
          error: isOverload
            ? "Gemini models are currently experiencing high demand. Please try again in a few moments."
            : lastError?.message ||
              "Failed to analyze and optimize prompt. All fallback models failed.",
        },
        { status: isOverload ? 503 : 502 }
      );
    }

    // 1. Normalize Gemini Model Data
    const rawGemini = parsedResult.models.gemini || {};
    const geminiScore = sanitizeScore(rawGemini.score, 88);
    const geminiWeaknesses = sanitizeWeaknesses(rawGemini.weaknesses, [
      "Lacks clear background context and target scenario.",
      "Could benefit from more concise, information-dense phrasing.",
    ]);
    const geminiPrompt =
      typeof rawGemini.optimizedPrompt === "string" && rawGemini.optimizedPrompt.trim()
        ? rawGemini.optimizedPrompt.trim()
        : trimmedPrompt;

    const geminiModel = {
      score: geminiScore,
      verdict: sanitizeVerdict(rawGemini.verdict, geminiScore),
      weaknesses: geminiWeaknesses,
      mistakes: geminiWeaknesses,
      optimizedPrompt: geminiPrompt,
      status: "success",
    };

    // 2. Normalize ChatGPT Model Data
    const rawChatGPT = parsedResult.models.chatgpt || {};
    const chatgptScore = sanitizeScore(rawChatGPT.score, 90);
    const chatgptWeaknesses = sanitizeWeaknesses(rawChatGPT.weaknesses, [
      "Missing explicit expert persona / role definition.",
      "Negative constraints and rules are not specified.",
    ]);
    const chatgptPrompt =
      typeof rawChatGPT.optimizedPrompt === "string" && rawChatGPT.optimizedPrompt.trim()
        ? rawChatGPT.optimizedPrompt.trim()
        : trimmedPrompt;

    const chatgptModel = {
      score: chatgptScore,
      verdict: sanitizeVerdict(rawChatGPT.verdict, chatgptScore),
      weaknesses: chatgptWeaknesses,
      mistakes: chatgptWeaknesses,
      optimizedPrompt: chatgptPrompt,
      status: "success",
    };

    // 3. Normalize Claude Model Data
    const rawClaude = parsedResult.models.claude || {};
    const claudeScore = sanitizeScore(rawClaude.score, 93);
    const claudeWeaknesses = sanitizeWeaknesses(rawClaude.weaknesses, [
      "No structural XML tags (<instructions>, <context>) to guide reasoning.",
      "Expected output format is ambiguous.",
    ]);
    const claudePrompt =
      typeof rawClaude.optimizedPrompt === "string" && rawClaude.optimizedPrompt.trim()
        ? rawClaude.optimizedPrompt.trim()
        : trimmedPrompt;

    const claudeModel = {
      score: claudeScore,
      verdict: sanitizeVerdict(rawClaude.verdict, claudeScore),
      weaknesses: claudeWeaknesses,
      mistakes: claudeWeaknesses,
      optimizedPrompt: claudePrompt,
      status: "success",
    };

    // 4. Resolve Overall Best Prompt Winner
    const validWinners = ["gemini", "chatgpt", "claude"];
    let winnerKey = (parsedResult.best?.winner || "").toLowerCase().trim();
    if (!validWinners.includes(winnerKey)) {
      const candidates = [
        { key: "claude", score: claudeScore },
        { key: "chatgpt", score: chatgptScore },
        { key: "gemini", score: geminiScore },
      ];
      candidates.sort((a, b) => b.score - a.score);
      winnerKey = candidates[0].key;
    }

    const winnerDisplayNames = {
      gemini: "Gemini",
      chatgpt: "ChatGPT",
      claude: "Claude",
    };

    const winningModel =
      winnerKey === "chatgpt"
        ? chatgptModel
        : winnerKey === "claude"
        ? claudeModel
        : geminiModel;

    const winnerName =
      parsedResult.best?.winnerName || winnerDisplayNames[winnerKey];

    const reason =
      parsedResult.best?.reason ||
      `${winnerName}'s tailored prompt provided the strongest balance of clarity, contextual specificity, and actionable constraints.`;

    const bestData = {
      winner: winnerKey,
      winnerName,
      reason,
      optimizedPrompt: winningModel.optimizedPrompt,
      score: winningModel.score,
    };

    return Response.json(
      {
        best: bestData,
        models: {
          gemini: geminiModel,
          chatgpt: chatgptModel,
          claude: claudeModel,
        },
        // Backward-compatible top-level fields
        score: winningModel.score,
        verdict: winningModel.verdict,
        weaknesses: winningModel.weaknesses,
        mistakes: winningModel.mistakes,
        optimizedPrompt: winningModel.optimizedPrompt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Unexpected error in /api/analyze:", error);
    return Response.json(
      { error: error?.message || "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
