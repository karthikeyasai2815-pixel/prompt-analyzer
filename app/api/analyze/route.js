import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";

const ANALYSIS_SCHEMA = {
  type: SchemaType.OBJECT,
  properties: {
    score: {
      type: SchemaType.INTEGER,
      description: "A quality score from 0 to 100 evaluating the prompt.",
    },
    verdict: {
      type: SchemaType.STRING,
      description: "Evaluation verdict: 'Good', 'Average', or 'Needs Improvement'.",
      enum: ["Good", "Average", "Needs Improvement"],
    },
    mistakes: {
      type: SchemaType.ARRAY,
      description: "List of missing elements, weaknesses, or mistakes.",
      items: {
        type: SchemaType.STRING,
      },
    },
    weaknesses: {
      type: SchemaType.ARRAY,
      description: "List of missing elements, weaknesses, or mistakes.",
      items: {
        type: SchemaType.STRING,
      },
    },
    optimizedPrompt: {
      type: SchemaType.STRING,
      description: "The rewritten, production-grade, highly structured version of the prompt using professional prompt engineering best practices.",
    },
  },
  required: ["score", "verdict", "mistakes", "optimizedPrompt"],
};

const SYSTEM_INSTRUCTION = `You are an expert Prompt Engineer with deep expertise in both text/code prompts AND visual image-generation prompts.

STEP 1 — INTENT DETECTION:
Before analyzing, classify the user's prompt into one of two categories:

A) IMAGE GENERATION / PHOTO EDITING — if the prompt asks to generate, create, edit, transform, enhance, stylize, or manipulate a photo, image, picture, illustration, artwork, or visual (e.g. "make this photo aesthetic", "change the background to a sunset", "generate a cyberpunk cityscape", "edit this image to look vintage", "turn my selfie into an oil painting").

B) TEXT / CODE / WRITING — everything else (e.g. "write a blog post", "review my code", "draft an email", "explain quantum computing").

STEP 2 — ANALYSIS & OPTIMIZATION:

For BOTH categories, evaluate the prompt against these principles and score accordingly:
1. Specificity: Is the request precise rather than vague?
2. Context: Is enough background, subject matter, or reference information provided?
3. Constraints: Are boundaries, limitations, style preferences, or negative constraints defined?
4. Output Clarity: Is the desired result clearly described?

Then produce the optimizedPrompt differently based on category:

--- IF CATEGORY A (Image Generation / Photo Editing) ---
Rewrite the optimizedPrompt as a DIRECT VISUAL IMAGE-GENERATION INSTRUCTION. It must:
- Start with action words like "Transform the uploaded photo into...", "Edit this image to...", "Generate a...", "Create a..."
- Describe visual attributes in detail: lighting (golden hour, soft diffused, dramatic rim light), color grading (warm amber tones, cool desaturated blues, film-like grain), textures, mood/atmosphere, composition, depth of field, camera angle
- Be a single cohesive visual directive that an image-generation AI (like DALL-E, Midjourney, Gemini Vision, or Stable Diffusion) can execute directly
- NEVER include instructional language like "give step-by-step instructions", "explain how to", "provide a guide", "list the steps", "write a tutorial" — these are forbidden in image prompts
- NEVER frame the output as text instructions about editing — it must BE the image prompt itself

--- IF CATEGORY B (Text / Code / Writing) ---
Rewrite the optimizedPrompt as a clear, structured prompt with:
- Role / Persona: Assign a specific expert identity
- Context & Background: Explain the scenario, audience, and purpose
- Task: Break the goal into concrete, unambiguous instructions
- Constraints & Guardrails: Define tone, length, what to avoid, edge cases
- Output Format: Specify the deliverable structure (markdown, JSON, code blocks, bullet points, etc.)

Return a strict JSON object with:
- score (0 to 100)
- verdict ("Good", "Average", or "Needs Improvement")
- weaknesses (array of strings listing missing or weak elements)
- mistakes (same array of strings)
- optimizedPrompt (the rewritten prompt following the rules above for the detected category)
`;

function cleanJsonText(rawText) {
  let text = (rawText || "").trim();
  if (text.startsWith("```json")) {
    text = text.replace(/^```json\s*/, "").replace(/```\s*$/, "").trim();
  } else if (text.startsWith("```")) {
    text = text.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  }
  return text;
}

function normalizeResult(raw, originalPrompt) {
  const score =
    typeof raw?.score === "number"
      ? Math.max(0, Math.min(100, Math.round(raw.score)))
      : 70;

  const verdict =
    raw?.verdict === "Good" ||
    raw?.verdict === "Average" ||
    raw?.verdict === "Needs Improvement"
      ? raw.verdict
      : score >= 80
      ? "Good"
      : score >= 50
      ? "Average"
      : "Needs Improvement";

  const issues = Array.isArray(raw?.weaknesses)
    ? raw.weaknesses
    : Array.isArray(raw?.mistakes)
    ? raw.mistakes
    : ["Missing explicit constraints and clear output formatting."];

  const optimizedPrompt =
    typeof raw?.optimizedPrompt === "string" && raw.optimizedPrompt.trim().length > 0
      ? raw.optimizedPrompt.trim()
      : typeof raw?.optimized_prompt === "string" && raw.optimized_prompt.trim().length > 0
      ? raw.optimized_prompt.trim()
      : originalPrompt;

  return {
    score,
    verdict,
    weaknesses: issues,
    mistakes: issues,
    optimizedPrompt,
  };
}

// 1. Gemini: gemini-2.5-flash via GEMINI_API_KEY
async function analyzeWithGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const modelsToTry = [
    "gemini-2.5-flash",
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
  ];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: ANALYSIS_SCHEMA,
          temperature: 0.2,
        },
        systemInstruction: SYSTEM_INSTRUCTION,
      });

      const promptInput = `Please analyze and optimize this prompt:\n\n"""\n${prompt.trim()}\n"""`;
      const result = await model.generateContent(promptInput);
      const responseText = result.response.text();
      const cleaned = cleanJsonText(responseText);
      const parsed = JSON.parse(cleaned);
      return normalizeResult(parsed, prompt);
    } catch (err) {
      lastError = err;
      continue;
    }
  }

  throw lastError || new Error("Failed to analyze prompt with Gemini API.");
}

// 2. ChatGPT: gpt-4o-mini via OPENAI_API_KEY
async function analyzeWithChatGPT(prompt) {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    "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";

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            SYSTEM_INSTRUCTION +
            '\n\nYou MUST return a strict JSON object matching: {"score": number, "verdict": "Good"|"Average"|"Needs Improvement", "weaknesses": string[], "mistakes": string[], "optimizedPrompt": string}',
        },
        {
          role: "user",
          content: `Please analyze and optimize this prompt:\n\n"""\n${prompt.trim()}\n"""`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error?.message ||
        `OpenAI API returned status ${response.status}: ${response.statusText}`
    );
  }

  const data = await response.json();
  const rawText = data?.choices?.[0]?.message?.content || "";
  const cleaned = cleanJsonText(rawText);
  const parsed = JSON.parse(cleaned);
  return normalizeResult(parsed, prompt);
}

// 3. Claude: claude-sonnet-4-20250514 via ANTHROPIC_API_KEY
async function analyzeWithClaude(prompt) {
  const apiKey =
    process.env.ANTHROPIC_API_KEY ||
    "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";

  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured.");
  }

  const modelsToTry = [
    "claude-sonnet-4-20250514",
    "claude-sonnet-5-5",
    "claude-haiku-5-5",
    "claude-3-5-sonnet-20241022",
    "claude-3-5-haiku-20241022",
    "claude-3-haiku-20240307",
  ];

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 2048,
          system:
            SYSTEM_INSTRUCTION +
            '\n\nYou MUST return ONLY a valid JSON object matching: {"score": number, "verdict": "Good"|"Average"|"Needs Improvement", "weaknesses": string[], "mistakes": string[], "optimizedPrompt": string}. Output no text outside the JSON.',
          messages: [
            {
              role: "user",
              content: `Please analyze and optimize this prompt:\n\n"""\n${prompt.trim()}\n"""\n\nReturn strict JSON:`,
            },
          ],
          temperature: 0.2,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        const errMsg =
          errorData?.error?.message ||
          `Anthropic API returned status ${response.status}: ${response.statusText}`;

        if (response.status === 404 || errMsg.toLowerCase().includes("model")) {
          lastError = new Error(errMsg);
          continue;
        }
        throw new Error(errMsg);
      }

      const data = await response.json();
      const rawText = data?.content?.[0]?.text || "";
      const cleaned = cleanJsonText(rawText);
      const parsed = JSON.parse(cleaned);
      return normalizeResult(parsed, prompt);
    } catch (err) {
      lastError = err;
      if (
        err.message &&
        (err.message.toLowerCase().includes("model") || err.message.includes("404"))
      ) {
        continue;
      }
      throw err;
    }
  }

  throw lastError || new Error("Failed to analyze prompt with Claude API.");
}

// 4. Best Prompt Judge: Gemini evaluates the candidates against clarity, specificity, and effectiveness
async function judgeBestPrompt(rawPrompt, successfulModels) {
  if (!successfulModels || successfulModels.length === 0) {
    throw new Error("No successful model outputs to judge.");
  }

  // If only 1 model succeeded, that model wins automatically
  if (successfulModels.length === 1) {
    const single = successfulModels[0];
    return {
      winner: single.provider,
      winnerName: single.name,
      reason: `Evaluated as the strongest optimized prompt with a quality score of ${single.data.score}/100.`,
      optimizedPrompt: single.data.optimizedPrompt,
      score: single.data.score,
      verdict: single.data.verdict,
      weaknesses: single.data.weaknesses,
    };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelsToTry = [
      "gemini-2.5-flash",
      "gemini-3.8-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash",
    ];

    const candidatesList = successfulModels
      .map(
        (m, idx) =>
          `[CANDIDATE ${idx + 1}: ${m.name} (id: ${m.provider}, score: ${m.data.score})]\n${m.data.optimizedPrompt}`
      )
      .join("\n\n");

    const judgePrompt = `Original Raw Prompt:\n"""\n${rawPrompt.trim()}\n"""\n\nCandidate Optimized Prompts from Different Models:\n${candidatesList}\n\nEvaluate all candidates against clarity, specificity, and effectiveness. Select the single best prompt and provide a concise 1-2 sentence explanation of why it won. Return JSON only:`;

    for (const modelName of modelsToTry) {
      try {
        const judgeModel = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
          systemInstruction: `You are an elite Prompt Engineering Judge.
Evaluate candidate prompts on clarity, specificity, and effectiveness.
Select the single Overall Best Prompt among the candidates.
Provide a clear 1-2 sentence reason explaining why it won over the others.

Return strict JSON:
{
  "winner": "gemini" | "chatgpt" | "claude",
  "winnerName": "Gemini" | "ChatGPT" | "Claude",
  "reason": "1-2 sentences explaining why this prompt won against clarity, specificity, and effectiveness."
}`,
        });

        const result = await judgeModel.generateContent(judgePrompt);
        const text = result.response.text();
        const parsed = JSON.parse(cleanJsonText(text));

        const chosenWinnerKey = (parsed.winner || "").toLowerCase();
        const winningEntry =
          successfulModels.find((m) => m.provider === chosenWinnerKey) ||
          successfulModels.find((m) => m.name.toLowerCase() === (parsed.winnerName || "").toLowerCase()) ||
          successfulModels[0];

        return {
          winner: winningEntry.provider,
          winnerName: winningEntry.name,
          reason:
            parsed.reason ||
            `${winningEntry.name}'s prompt excelled with superior clarity, contextual boundaries, and structural precision.`,
          optimizedPrompt: winningEntry.data.optimizedPrompt,
          score: winningEntry.data.score,
          verdict: winningEntry.data.verdict,
          weaknesses: winningEntry.data.weaknesses,
        };
      } catch (err) {
        console.warn(`Judge attempt with ${modelName} failed, trying next:`, err.message);
        continue;
      }
    }
  }

  // Fallback heuristic judge if Gemini judge is unavailable: highest score
  const sorted = [...successfulModels].sort((a, b) => (b.data.score || 0) - (a.data.score || 0));
  const top = sorted[0];
  return {
    winner: top.provider,
    winnerName: top.name,
    reason: `${top.name}'s version earned the highest prompt precision score (${top.data.score}/100) with well-defined constraints and optimal task framing.`,
    optimizedPrompt: top.data.optimizedPrompt,
    score: top.data.score,
    verdict: top.data.verdict,
    weaknesses: top.data.weaknesses,
  };
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

    // 1. Backend Parallel Comparison: Run Gemini, ChatGPT, and Claude simultaneously using Promise.allSettled
    const [geminiResult, chatgptResult, claudeResult] = await Promise.allSettled([
      analyzeWithGemini(trimmedPrompt),
      analyzeWithChatGPT(trimmedPrompt),
      analyzeWithClaude(trimmedPrompt),
    ]);

    const modelsData = {
      gemini:
        geminiResult.status === "fulfilled"
          ? { ...geminiResult.value, status: "success" }
          : {
              status: "error",
              error: geminiResult.reason?.message || "Failed to analyze with Gemini",
              score: 0,
              verdict: "Needs Improvement",
              weaknesses: ["Gemini service or API key was unavailable."],
              optimizedPrompt: trimmedPrompt,
            },
      chatgpt:
        chatgptResult.status === "fulfilled"
          ? { ...chatgptResult.value, status: "success" }
          : {
              status: "error",
              error: chatgptResult.reason?.message || "Failed to analyze with ChatGPT",
              score: 0,
              verdict: "Needs Improvement",
              weaknesses: ["ChatGPT service or API key was unavailable."],
              optimizedPrompt: trimmedPrompt,
            },
      claude:
        claudeResult.status === "fulfilled"
          ? { ...claudeResult.value, status: "success" }
          : {
              status: "error",
              error: claudeResult.reason?.message || "Failed to analyze with Claude",
              score: 0,
              verdict: "Needs Improvement",
              weaknesses: ["Claude service or API key was unavailable."],
              optimizedPrompt: trimmedPrompt,
            },
    };

    // Gather successfully completed model outputs
    const successfulModels = [];
    if (geminiResult.status === "fulfilled") {
      successfulModels.push({ provider: "gemini", name: "Gemini", data: geminiResult.value });
    }
    if (chatgptResult.status === "fulfilled") {
      successfulModels.push({ provider: "chatgpt", name: "ChatGPT", data: chatgptResult.value });
    }
    if (claudeResult.status === "fulfilled") {
      successfulModels.push({ provider: "claude", name: "Claude", data: claudeResult.value });
    }

    // If all three models failed, return graceful error
    if (successfulModels.length === 0) {
      return Response.json(
        {
          error:
            "All AI providers failed to analyze the prompt. Please check your API keys (GEMINI_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY) in .env.local.",
          models: modelsData,
        },
        { status: 502 }
      );
    }

    // 2. Best Prompt Judge: Gemini evaluates the generated prompts against clarity, specificity, and effectiveness
    const bestVerdict = await judgeBestPrompt(trimmedPrompt, successfulModels);

    return Response.json(
      {
        best: {
          winner: bestVerdict.winner,
          winnerName: bestVerdict.winnerName,
          reason: bestVerdict.reason,
          optimizedPrompt: bestVerdict.optimizedPrompt,
          score: bestVerdict.score,
        },
        models: modelsData,
        // Backward-compatible fields
        score: bestVerdict.score,
        verdict: bestVerdict.verdict || (bestVerdict.score >= 80 ? "Good" : "Average"),
        weaknesses: bestVerdict.weaknesses || [],
        mistakes: bestVerdict.weaknesses || [],
        optimizedPrompt: bestVerdict.optimizedPrompt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/analyze:", error);
    return Response.json(
      { error: error?.message || "An unexpected server error occurred." },
      { status: 500 }
    );
  }
}
