import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { z } from "zod";
import { STAGES, UserRole } from "../types";

let _aiClient: GoogleGenAI | null = null;
let _aiBetaClient: GoogleGenAI | null = null;

function resolveGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.API_KEY ||
    ""
  ).trim();
}

function getAiClient(apiVersion?: "v1beta"): GoogleGenAI {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured on the server.");
  }
  if (apiVersion === "v1beta") {
    if (!_aiBetaClient) {
      _aiBetaClient = new GoogleGenAI({
        apiKey,
        apiVersion: "v1beta",
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    }
    return _aiBetaClient;
  }
  if (!_aiClient) {
    _aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return _aiClient;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  return Promise.race([
    promise.finally(() => {
      if (timer) clearTimeout(timer);
    }),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} সময়সীমা অতিক্রম করেছে।`)), ms);
    }),
  ]);
}

export interface DbCategory {
  id: string;
  name: string;
  banglaName?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface VoiceAnalysisOutput {
  observations: string[];
  suggestedCategories: Array<{
    categoryId: string;
    name: string;
    banglaName?: string | null;
    reason: string;
    confidence: number;
  }>;
  uncertainObservations: Array<{
    statement: string;
    possibleCategoryId?: string | null;
    possibleCategoryName?: string | null;
    question: string;
  }>;
  indicatorUpdates: {
    suggestedStage?: number | null;
    stageReason?: string | null;
    suggestedPriority?: "growing" | "stable" | "needs_attention" | "high_priority" | null;
    fajrTarget?: boolean | null;
    jummahTarget?: boolean | null;
    deeniyatTarget?: boolean | null;
    tafseerTarget?: boolean | null;
  };
  selfVsAdminComparison?: Array<{
    area: string;
    selfReport: string;
    adminObservation: string;
    status: "agree" | "differ" | "unknown";
  }>;
}

export interface GapAndGuidanceOutput {
  gapAnalysis: {
    achieved: string[];
    needsAttention: string[];
    unknownInfo: string[];
    nextSteps: string[];
  };
  dawahGuidance: {
    nextStage: string;
    topicToDiscuss: string;
    adviceOrInvitation: string;
    activityToEncourage: string;
    followUpQuestions: string[];
    practicalNextAction: string;
  };
}

function normalizeAudioMimeType(mimeType: string): string {
  const base = (mimeType || "audio/webm").split(";")[0].trim().toLowerCase();
  if (!base) return "audio/webm";
  if (base === "video/webm") return "audio/webm";
  if (base === "audio/x-m4a" || base === "audio/m4a" || base === "audio/mp4a-latm") return "audio/mp4";
  if (base === "audio/x-wav" || base === "audio/wave") return "audio/wav";
  if (base === "audio/x-aac") return "audio/aac";
  if (base === "audio/mpeg3" || base === "audio/x-mpeg-3") return "audio/mp3";
  return base;
}

/**
 * Transcribe Bengali voice note audio reliably with timeout + model fallback.
 * Tries gemini-3.5-transcribe (default & v1beta), then falls back to gemini-4-hydrogen and gemini-3.1-flash-lite.
 */
export async function transcribeBengaliAudio(base64Audio: string, mimeType: string): Promise<string> {
  const cleanBase64 = base64Audio.replace(/^data:[^;]+;base64,/, "").trim();
  if (!cleanBase64 || cleanBase64.length < 120) {
    throw new Error("রেকর্ড করা অডিওটি খুব ছোট বা খালি। অনুগ্রহ করে আবার বলুন।");
  }

  if (!resolveGeminiApiKey()) {
    throw new Error(
      "ভয়েস থেকে টেক্সট রূপান্তরের জন্য সার্ভারে GEMINI_API_KEY কনফিগার করা নেই। Settings > Secrets-এ API Key সেট করুন অথবা নিচে সরাসরি বাংলা লিখুন।"
    );
  }

  const normalizedMime = normalizeAudioMimeType(mimeType);
  const audioPart = {
    inlineData: {
      mimeType: normalizedMime,
      data: cleanBase64,
    },
  };
  const promptText =
    "Transcribe the exact spoken words from this audio in Bengali (বাংলা) script. If there is no clear speech or only background noise/silence, return an empty string. Return only the exact spoken transcription without commentary or extra text.";

  const tryTranscribe = async (
    client: GoogleGenAI,
    model: string,
    thinkingLevel?: ThinkingLevel,
    timeoutMs = 12000
  ) => {
    const response = await withTimeout(
      client.models.generateContent({
        model,
        contents: { parts: [audioPart, { text: promptText }] },
        ...(thinkingLevel ? { config: { thinkingConfig: { thinkingLevel } } } : {}),
      }),
      timeoutMs,
      "ভয়েস ট্রান্সক্রিপশন"
    );
    return (response.text ?? "").trim();
  };

  const attempts: Array<{ label: string; run: () => Promise<string> }> = [
    {
      label: "gemini-3.5-transcribe(default)",
      run: () => tryTranscribe(getAiClient(), "gemini-3.5-transcribe", undefined, 12000),
    },
    {
      label: "gemini-4-hydrogen(default)",
      run: () => tryTranscribe(getAiClient(), "gemini-4-hydrogen", ThinkingLevel.LOW, 14000),
    },
    {
      label: "gemini-3.1-flash-lite(default)",
      run: () => tryTranscribe(getAiClient(), "gemini-3.1-flash-lite", ThinkingLevel.MINIMAL, 12000),
    },
    {
      label: "gemini-3.5-transcribe(v1beta)",
      run: () => tryTranscribe(getAiClient("v1beta"), "gemini-3.5-transcribe", undefined, 10000),
    },
  ];

  let text = "";
  let lastErr: any = null;

  for (const attempt of attempts) {
    try {
      const candidate = await attempt.run();
      if (candidate) {
        text = candidate;
        break;
      }
    } catch (err: any) {
      lastErr = err;
      console.warn(`[AI Transcribe Attempt Failed: ${attempt.label}]`, err?.message || err);
    }
  }

  if (!text) {
    const errMsg = String(lastErr?.message || "");
    if (/API_KEY_INVALID|PERMISSION_DENIED|403|API key not valid/i.test(errMsg)) {
      throw new Error(
        "Gemini API Key অনুমোদিত নয় বা সঠিক নয়। অনুগ্রহ করে Settings > Secrets প্যানেল থেকে API Key যাচাই করুন।"
      );
    }
    if (/RESOURCE_EXHAUSTED|429|quota/i.test(errMsg)) {
      throw new Error(
        "এই মুহূর্তে AI ট্রান্সক্রিপশন কোটা সীমা পূর্ণ হয়েছে। কিছুক্ষণ পর চেষ্টা করুন অথবা নিচে সরাসরি বাংলা লিখুন।"
      );
    }
    throw new Error(
      "ভয়েস থেকে স্পষ্ট বাংলা লেখা শনাক্ত করা যায়নি। অনুগ্রহ করে মাইক্রোফোনের কাছে পরিষ্কারভাবে বলুন অথবা নিচে সরাসরি বাংলা লিখুন।"
    );
  }
  return text;
}

/**
 * Analyze Bengali voice transcription against real database categories and indicators.
 * Strictly validates returned category IDs against actual database records.
 */
export async function analyzeVoiceNoteForMember(params: {
  contact: any;
  categories: DbCategory[];
  existingObservations: any[];
  transcription: string;
  consentedSelfReportSummary?: string | null;
}): Promise<VoiceAnalysisOutput> {
  const { contact, categories, existingObservations, transcription, consentedSelfReportSummary } = params;

  const activeCategories = categories.filter((c) => c.isActive !== false);
  const categoryById = new Map(activeCategories.map((c) => [c.id, c]));

  if (!resolveGeminiApiKey()) {
    return buildDeterministicVoiceFallback({
      transcription,
      activeCategories,
      consentedSelfReportSummary,
    });
  }

  const currentTags: string[] = Array.isArray(contact.categoryTags) ? contact.categoryTags : [];
  const stageList = STAGES.map((label, idx) => `${idx + 1}. ${label}`).join("\n");

  const systemInstruction = `You are a careful, respectful Dawah Coordinator assistant for Kotbari Dawah Movement.
Your job is to analyze an administrator's Bengali voice note about a member and match it strictly against the REAL database categories and growth stages provided.

CRITICAL RULES:
1. NEVER invent or duplicate category IDs. You MUST ONLY use the exact UUID "id" values from the provided REAL_CATEGORIES list.
2. NEVER assume a category's list position is its ID. Always reference the UUID string.
3. If a statement in the voice note is ambiguous, occasional ("মাঝে মাঝে", "কখনো কখনো", "চেষ্টা করছে"), or uncertain, DO NOT add it to suggestedCategories. Put it in "uncertainObservations" so the administrator can confirm manually.
4. Keep observations concise, factual, and in natural Bengali.
5. Never judge the member's faith, sincerity, or spiritual worth. Only record observable attendance, communication, and participation.`;

  const prompt = `Member Context:
- Name: ${contact.name}
- Current Stage: ${contact.currentStage} (${STAGES[(contact.currentStage || 1) - 1] || "Unknown"})
- Current Priority: ${contact.priorityLevel}
- Current Assigned Category Tags: ${JSON.stringify(currentTags)}
- Existing Targets: fajrTarget=${!!contact.fajrTarget}, jummahTarget=${!!contact.jummahTarget}, deeniyatTarget=${!!contact.deeniyatTarget}, tafseerTarget=${!!contact.tafseerTarget}
- Recent Observations Count: ${existingObservations.length}

REAL_CATEGORIES (Use ONLY these exact UUIDs for categoryId):
${JSON.stringify(
  activeCategories.map((c) => ({
    id: c.id,
    name: c.name,
    banglaName: c.banglaName || c.name,
    description: c.description || "",
  })),
  null,
  2
)}

16 Growth Stages:
${stageList}

Administrator's Bengali Voice Note Transcription:
"""
${transcription}
"""
${consentedSelfReportSummary ? `
Member's Consented Recent Self Report Summary (shared by member consent — compare neutrally without verdict or judgment):
"""
${consentedSelfReportSummary}
"""` : ''}

Analyze the voice note carefully and return structured JSON matching the schema.`;

  let response: any;
  try {
    const ai = getAiClient();
    response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
          responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          observations: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Factual Bengali summary bullets of what the admin observed in the voice note.",
          },
          suggestedCategories: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                categoryId: {
                  type: Type.STRING,
                  description: "Exact UUID from REAL_CATEGORIES.",
                },
                reason: {
                  type: Type.STRING,
                  description: "Short Bengali explanation of why this category clearly matches.",
                },
                confidence: {
                  type: Type.NUMBER,
                  description: "Confidence from 0.0 to 1.0 (only >= 0.75 should be suggested here).",
                },
              },
              required: ["categoryId", "reason", "confidence"],
            },
          },
          uncertainObservations: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                statement: {
                  type: Type.STRING,
                  description: "The ambiguous/occasional statement from the transcription.",
                },
                possibleCategoryId: {
                  type: Type.STRING,
                  description: "Optional exact UUID from REAL_CATEGORIES if partially relevant, or empty string.",
                },
                question: {
                  type: Type.STRING,
                  description: "Confirmation question in Bengali for the admin.",
                },
              },
              required: ["statement", "question"],
            },
          },
          suggestedStage: {
            type: Type.INTEGER,
            description: "Suggested stage number 1-16 only if clearly indicated, else 0.",
          },
          stageReason: {
            type: Type.STRING,
            description: "Reason in Bengali for suggested stage change, or empty string.",
          },
          suggestedPriority: {
            type: Type.STRING,
            description: "One of: growing, stable, needs_attention, high_priority, or empty string if unchanged.",
          },
          fajrTarget: { type: Type.BOOLEAN, description: "True if voice note indicates regular Fajr connection, else false." },
          jummahTarget: { type: Type.BOOLEAN, description: "True if voice note indicates regular/early Jumu'ah, else false." },
          deeniyatTarget: { type: Type.BOOLEAN, description: "True if voice note indicates Diniyat / Quran class, else false." },
          tafseerTarget: { type: Type.BOOLEAN, description: "True if voice note indicates Tafsir / Study circle / Ilmi Muhajara, else false." },
          selfVsAdminComparison: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                area: { type: Type.STRING, description: "Short Bengali label of the habit/area compared." },
                selfReport: { type: Type.STRING, description: "What member's consented self-report indicates, in Bengali." },
                adminObservation: { type: Type.STRING, description: "What admin voice note observes, in Bengali." },
                status: { type: Type.STRING, description: "One of: agree, differ, unknown." },
              },
              required: ["area", "selfReport", "adminObservation", "status"],
            },
          },
        },
        required: ["observations", "suggestedCategories", "uncertainObservations"],
      },
    },
      }),
      22000,
      "ভয়েস AI বিশ্লেষণ"
    );
  } catch (err: any) {
    console.warn("[AI Voice Analyze Fallback] Gemini unavailable, using deterministic Bengali matcher:", err?.message || err);
    return buildDeterministicVoiceFallback({
      transcription,
      activeCategories,
      consentedSelfReportSummary,
    });
  }

  const raw = JSON.parse((response.text ?? "{}").trim());

  // Strictly validate category IDs against real database records
  const seenCategoryIds = new Set<string>();
  const validatedSuggestions: VoiceAnalysisOutput["suggestedCategories"] = [];

  for (const item of Array.isArray(raw.suggestedCategories) ? raw.suggestedCategories : []) {
    const cat = categoryById.get(String(item.categoryId || "").trim());
    if (cat && !seenCategoryIds.has(cat.id)) {
      seenCategoryIds.add(cat.id);
      validatedSuggestions.push({
        categoryId: cat.id,
        name: cat.name,
        banglaName: cat.banglaName,
        reason: String(item.reason || ""),
        confidence: typeof item.confidence === "number" ? item.confidence : 0.85,
      });
    }
  }

  const validatedUncertain: VoiceAnalysisOutput["uncertainObservations"] = [];
  for (const item of Array.isArray(raw.uncertainObservations) ? raw.uncertainObservations : []) {
    const possId = String(item.possibleCategoryId || "").trim();
    const cat = possId ? categoryById.get(possId) : undefined;
    validatedUncertain.push({
      statement: String(item.statement || ""),
      possibleCategoryId: cat ? cat.id : null,
      possibleCategoryName: cat ? (cat.banglaName || cat.name) : null,
      question: String(item.question || "এই বিষয়টি কি ক্যাটাগরি হিসেবে যুক্ত করতে চান?"),
    });
  }

  const validPriorities = new Set(["growing", "stable", "needs_attention", "high_priority"]);
  const suggestedStageNum =
    typeof raw.suggestedStage === "number" && raw.suggestedStage >= 1 && raw.suggestedStage <= 16
      ? raw.suggestedStage
      : null;

  const validStatuses = new Set(["agree", "differ", "unknown"]);
  const comparison = consentedSelfReportSummary && Array.isArray(raw.selfVsAdminComparison)
    ? raw.selfVsAdminComparison.slice(0, 6).map((c: any) => ({
        area: String(c.area || ""),
        selfReport: String(c.selfReport || "জানা যায়নি"),
        adminObservation: String(c.adminObservation || "পর্যবেক্ষণ নেই"),
        status: (validStatuses.has(c.status) ? c.status : "unknown") as "agree" | "differ" | "unknown",
      }))
    : undefined;

  return {
    observations: Array.isArray(raw.observations) ? raw.observations.map(String) : [],
    suggestedCategories: validatedSuggestions,
    uncertainObservations: validatedUncertain,
    indicatorUpdates: {
      suggestedStage: suggestedStageNum,
      stageReason: raw.stageReason ? String(raw.stageReason) : null,
      suggestedPriority: validPriorities.has(raw.suggestedPriority) ? raw.suggestedPriority : null,
      fajrTarget: typeof raw.fajrTarget === "boolean" && raw.fajrTarget ? true : null,
      jummahTarget: typeof raw.jummahTarget === "boolean" && raw.jummahTarget ? true : null,
      deeniyatTarget: typeof raw.deeniyatTarget === "boolean" && raw.deeniyatTarget ? true : null,
      tafseerTarget: typeof raw.tafseerTarget === "boolean" && raw.tafseerTarget ? true : null,
    },
    ...(comparison ? { selfVsAdminComparison: comparison } : {}),
  };
}

function buildDeterministicVoiceFallback(params: {
  transcription: string;
  activeCategories: DbCategory[];
  consentedSelfReportSummary?: string | null;
}): VoiceAnalysisOutput {
  const text = params.transcription.trim();
  const lower = text.toLowerCase();
  const isUncertainTone = /মাঝে মাঝে|কখনো|চেষ্টা|হয়তো|মনে হয়/.test(lower);

  const observations = text
    .split(/[।.\n]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 4)
    .slice(0, 5);
  if (observations.length === 0 && text) observations.push(text);

  const suggestedCategories: VoiceAnalysisOutput["suggestedCategories"] = [];
  const uncertainObservations: VoiceAnalysisOutput["uncertainObservations"] = [];

  for (const cat of params.activeCategories) {
    const terms = [cat.name, cat.banglaName || ""]
      .join(" ")
      .toLowerCase()
      .split(/[\s,/()-]+/)
      .filter((w) => w.length >= 3);
    const matched = terms.some((w) => lower.includes(w));
    if (matched) {
      if (isUncertainTone) {
        uncertainObservations.push({
          statement: observations[0] || text,
          possibleCategoryId: cat.id,
          possibleCategoryName: cat.banglaName || cat.name,
          question: `কথাটিতে "${cat.banglaName || cat.name}" উল্লেখ আছে — এটি কি নিশ্চিত ক্যাটাগরি হিসেবে যুক্ত করবেন?`,
        });
      } else {
        suggestedCategories.push({
          categoryId: cat.id,
          name: cat.name,
          banglaName: cat.banglaName,
          reason: `নোটের বক্তব্যে "${cat.banglaName || cat.name}" বিষয়ের মিল পাওয়া গেছে।`,
          confidence: 0.78,
        });
      }
    }
  }

  const fajrTarget = /ফজর|fajr/.test(lower) ? true : null;
  const jummahTarget = /জুমা|জুমুআ|jumuah|jummah/.test(lower) ? true : null;
  const deeniyatTarget = /দীনিয়াত|কুরআন|quran|deeniyat/.test(lower) ? true : null;
  const tafseerTarget = /তাফসির|তাফসীর|মুহাজারা|পাঠচক্র|tafseer/.test(lower) ? true : null;

  return {
    observations,
    suggestedCategories: suggestedCategories.slice(0, 6),
    uncertainObservations: uncertainObservations.slice(0, 4),
    indicatorUpdates: {
      suggestedStage: null,
      stageReason: null,
      suggestedPriority: null,
      fajrTarget,
      jummahTarget,
      deeniyatTarget,
      tafseerTarget,
    },
    ...(params.consentedSelfReportSummary
      ? {
          selfVsAdminComparison: [
            {
              area: "সামগ্রিক নিয়মিততা",
              selfReport: params.consentedSelfReportSummary,
              adminObservation: observations[0] || text,
              status: "unknown" as const,
            },
          ],
        }
      : {}),
  };
}

/**
 * Generate AI Gap Analysis & Personalized Dawah Guidance based on observed records.
 * Never interprets missing data as proof of inactivity; never judges faith or sincerity.
 */
export async function generateGapAnalysisAndGuidance(params: {
  contact: any;
  categories: DbCategory[];
  observations: any[];
  salahRecords: any[];
  followUps: any[];
  activityRecords: any[];
}): Promise<GapAndGuidanceOutput> {
  const { contact, categories, observations, salahRecords, followUps, activityRecords } = params;

  const buildFallback = (): GapAndGuidanceOutput => {
    const nextStage = STAGES[Math.min(15, contact.currentStage || 1)] || STAGES[15];
    return {
      gapAnalysis: {
        achieved: observations.slice(0, 3).map((o: any) => o.observation),
        needsAttention: followUps.length === 0 ? ["এখনো প্রথম ফলো-আপ রেকর্ড যুক্ত হয়নি।"] : [],
        unknownInfo: [!contact.phone ? "ফোন নম্বর রেকর্ড করা হয়নি" : "", !contact.area ? "এলাকা উল্লেখ নেই" : ""].filter(Boolean),
        nextSteps: [`${contact.name}-এর সাথে সৌজন্যমূলক খোঁজখবর নিন ও পরবর্তী প্রোগ্রামে আমন্ত্রণ জানান।`],
      },
      dawahGuidance: {
        nextStage,
        topicToDiscuss: "নামাজের গুরুত্ব ও দ্বীনি পরিবেশে যুক্ত থাকার উপকারিতা",
        adviceOrInvitation: `${contact.name}-কে আন্তরিকভাবে মসজিদ ও সপ্তাহের ইলমি আলোচনায় আসার দাওয়াত দিন।`,
        activityToEncourage: "ফজর ও মাগরিবে জামাতে উপস্থিত থাকার চেষ্টা",
        followUpQuestions: ["বাসা ও কাজের ব্যস্ততা কেমন যাচ্ছে?", "কোন সময় আমাদের বসা সহজ হবে?"],
        practicalNextAction: "আগামী ২-৩ দিনের মধ্যে ছোট একটি কল বা সরাসরি সাক্ষাৎ",
      },
    };
  };

  if (!resolveGeminiApiKey()) {
    return buildFallback();
  }

  const systemInstruction = `You are a wise, gentle, and respectful Dawah mentor for Kotbari Dawah Movement.
Analyze the member's recorded information and generate:
1. Gap Analysis (what is observed/achieved, areas needing gentle attention, information still unknown, and suggested next steps).
2. Personalized Dawah Guidance (appropriate next stage, discussion topic, respectful advice/invitation, activity to encourage, follow-up questions, practical next action).

STRICT ETHICAL & DATA RULES:
- Respond in clear, warm, respectful Bengali.
- NEVER judge a member's faith (iman), sincerity (ikhlas), or spiritual worth.
- NEVER interpret missing or unrecorded information as proof that the member does not perform an activity. Frame missing data neutrally as "তথ্য এখনো জানা যায়নি / রেকর্ড করা হয়নি" (Information not yet known/recorded).
- Recommendations must be gradual, encouraging, practical, and free of pressure.`;

  const prompt = `Member Profile:
- Name: ${contact.name}
- Area: ${contact.area || "অনির্ধারিত (Not recorded)"}
- Phone: ${contact.phone ? "Recorded" : "Not recorded"}
- Current Stage: ${contact.currentStage}/16 (${STAGES[(contact.currentStage || 1) - 1] || "Unknown"})
- Growth Score: ${contact.growthScore}%
- Priority Level: ${contact.priorityLevel}
- Assigned Categories: ${JSON.stringify(contact.categoryTags || [])}
- Targets: Fajr=${!!contact.fajrTarget}, Jumu'ah=${!!contact.jummahTarget}, Diniyat=${!!contact.deeniyatTarget}, Tafseer=${!!contact.tafseerTarget}

Available System Categories:
${categories.map((c) => `- ${c.banglaName || c.name} (${c.name})`).join("\n")}

Recent Observations (${observations.length}):
${observations.slice(0, 12).map((o) => `- [${o.date}] (${o.category}): ${o.observation}`).join("\n") || "কোনো পর্যবেক্ষণ এখনো রেকর্ড করা হয়নি"}

Recent Salah Records Count: ${salahRecords.length}
Recent Follow-ups (${followUps.length}):
${followUps.slice(0, 8).map((f) => `- [${f.date}] Topic: ${f.topic || "-"}, Response: ${f.response || "-"}, Next: ${f.nextAction || "-"}`).join("\n") || "কোনো ফলো-আপ রেকর্ড নেই"}

Recent Activity Records Count: ${activityRecords.length}

Generate structured Gap Analysis and Personalized Dawah Guidance in Bengali.`;

  let response: any;
  try {
    const ai = getAiClient();
    response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction,
          thinkingConfig: { thinkingLevel: ThinkingLevel.MEDIUM },
          responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          gapAnalysis: {
            type: Type.OBJECT,
            properties: {
              achieved: { type: Type.ARRAY, items: { type: Type.STRING } },
              needsAttention: { type: Type.ARRAY, items: { type: Type.STRING } },
              unknownInfo: { type: Type.ARRAY, items: { type: Type.STRING } },
              nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
            required: ["achieved", "needsAttention", "unknownInfo", "nextSteps"],
          },
          dawahGuidance: {
            type: Type.OBJECT,
            properties: {
              nextStage: { type: Type.STRING },
              topicToDiscuss: { type: Type.STRING },
              adviceOrInvitation: { type: Type.STRING },
              activityToEncourage: { type: Type.STRING },
              followUpQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
              practicalNextAction: { type: Type.STRING },
            },
            required: [
              "nextStage",
              "topicToDiscuss",
              "adviceOrInvitation",
              "activityToEncourage",
              "followUpQuestions",
              "practicalNextAction",
            ],
          },
        },
        required: ["gapAnalysis", "dawahGuidance"],
      },
    },
      }),
      20000,
      "গ্যাপ অ্যানালাইসিস"
    );
  } catch (err: any) {
    console.warn("[AI Gap Guidance Fallback] Gemini unavailable, using deterministic guidance:", err?.message || err);
    return buildFallback();
  }

  const parsed = JSON.parse((response.text ?? "{}").trim());
  return {
    gapAnalysis: {
      achieved: Array.isArray(parsed.gapAnalysis?.achieved) ? parsed.gapAnalysis.achieved : [],
      needsAttention: Array.isArray(parsed.gapAnalysis?.needsAttention) ? parsed.gapAnalysis.needsAttention : [],
      unknownInfo: Array.isArray(parsed.gapAnalysis?.unknownInfo) ? parsed.gapAnalysis.unknownInfo : [],
      nextSteps: Array.isArray(parsed.gapAnalysis?.nextSteps) ? parsed.gapAnalysis.nextSteps : [],
    },
    dawahGuidance: {
      nextStage: String(parsed.dawahGuidance?.nextStage || STAGES[Math.min(15, (contact.currentStage || 1))] || ""),
      topicToDiscuss: String(parsed.dawahGuidance?.topicToDiscuss || ""),
      adviceOrInvitation: String(parsed.dawahGuidance?.adviceOrInvitation || ""),
      activityToEncourage: String(parsed.dawahGuidance?.activityToEncourage || ""),
      followUpQuestions: Array.isArray(parsed.dawahGuidance?.followUpQuestions) ? parsed.dawahGuidance.followUpQuestions : [],
      practicalNextAction: String(parsed.dawahGuidance?.practicalNextAction || ""),
    },
  };
}

/**
 * Multi-turn Gemini Dawah Chatbot using ai.chats.create
 */
export async function chatWithDawahAssistant(params: {
  history: Array<{ role: "user" | "model"; text: string }>;
  message: string;
  userRole: UserRole;
  userName: string;
  modelMode?: "standard" | "fast";
  contextSummary?: string;
}): Promise<string> {
  const ai = getAiClient();
  const model = params.modelMode === "fast" ? "gemini-3.1-flash-lite" : "gemini-4-hydrogen";

  const systemInstruction =
    params.userRole === "admin" || params.userRole === "responsible"
      ? `আপনি কোটবাড়ি দাওয়াহ মুভমেন্ট (Kotbari Dawah Movement)-এর একজন প্রজ্ঞাবান, ভদ্র ও সহানুভূতিশীল দাওয়াহ সহায়ক (AI Dawah Assistant)।
বর্তমান ব্যবহারকারী একজন ${params.userRole === "admin" ? "অ্যাডমিন" : "দায়িত্বশীল"} (${params.userName})।
আপনার দায়িত্ব:
- দাওয়াহ সদস্যদের (ভাইদের) সাথে সুন্দর ও হিকমাহপূর্ণ যোগাযোগ, ফলো-আপ পরিকল্পনা, মিটিং/বয়ান/মুহাজারায় আমন্ত্রণ, এবং ১৬টি গ্রোথ স্টেজ অনুযায়ী ধাপে ধাপে অগ্রগতির পরামর্শ দেওয়া।
- কখনো কোনো ব্যক্তির ঈমান, ইখলাস বা আন্তরিকতা বিচার করবেন না। তথ্য না জানা থাকলে সেটিকে অনুমান করবেন না।
- বাংলায় (বা ব্যবহারকারী যে ভাষায় প্রশ্ন করেন) সংক্ষিপ্ত, কার্যকর ও সম্মানজনক উত্তর দিন।
${params.contextSummary ? `\nপ্রসঙ্গিক সারসংক্ষেপ:\n${params.contextSummary}` : ""}`
      : `আপনি কোটবাড়ি দাওয়াহ মুভমেন্ট (Kotbari Dawah Movement)-এর একজন বিনয়ী ও অনুপ্রেরণাদায়ক ব্যক্তিগত আমল ও দাওয়াহ সহায়ক।
বর্তমান ব্যবহারকারী একজন সদস্য (${params.userName})।
আপনার দায়িত্ব:
- সদস্য ভাইকে ৫ ওয়াক্ত সালাহ, ফজর, কুরআন তিলাওয়াত, দ্বীনি ইলম, ও দাওয়াহ কার্যক্রমে ধীরে ধীরে এগিয়ে যেতে উৎসাহিত করা।
- সর্বদা নম্র, সম্মানজনক ও ইতিবাচক ভাষায় কথা বলা; কখনো কঠোর সমালোচনা বা বিচারমূলক কথা না বলা।`;

  const formattedHistory = params.history
    .filter((h) => h.text && h.text.trim())
    .slice(-16)
    .map((h) => ({
      role: h.role,
      parts: [{ text: h.text }],
    }));

  const runChat = async (selectedModel: string) => {
    const chat = ai.chats.create({
      model: selectedModel,
      history: formattedHistory,
      config: {
        systemInstruction,
      },
    });
    const response = await chat.sendMessage({ message: params.message });
    return (response.text ?? "দুঃখিত, এই মুহূর্তে উত্তর তৈরি করা সম্ভব হয়নি। অনুগ্রহ করে আবার চেষ্টা করুন।").trim();
  };

  try {
    return await runChat(model);
  } catch (err: any) {
    if (params.modelMode === "fast") {
      // Fallback transparently to gemini-4-hydrogen if fast model experiences high demand
      return await runChat("gemini-4-hydrogen");
    }
    throw err;
  }
}

const careRefinementSchema = z.object({
  title: z.string().min(4).max(120),
  reason: z.string().min(4).max(260),
  suggestedAction: z.string().min(6).max(320),
  nextStepSummary: z.string().min(4).max(200),
});

export async function refineCareRadarWording(params: {
  memberName: string;
  currentStage: number;
  signals: string[];
  defaultTitle: string;
  defaultReason: string;
  defaultAction: string;
}): Promise<z.infer<typeof careRefinementSchema> | null> {
  if (!resolveGeminiApiKey()) return null;
  try {
    const ai = getAiClient();
    const prompt = `সদস্য: ${params.memberName} (ধাপ ${params.currentStage}/16)
শনাক্তকৃত সিগন্যাল: ${params.signals.join(", ")}
প্রাথমিক শিরোনাম: ${params.defaultTitle}
কারণ: ${params.defaultReason}
প্রাথমিক করণীয়: ${params.defaultAction}

উপরের তথ্যের ভিত্তিতে সম্মানজনক, উষ্ণ, অ-বিচারমূলক ও বাস্তবসম্মত বাংলায় দায়িত্বশীলের জন্য সংক্ষিপ্ত কেয়ার অ্যাকশন সাজিয়ে দিন। কখনোই ঈমান বা আমল নিয়ে বিচার করবেন না।`;

    const response = await ai.models.generateContent({
      model: "gemini-4-hydrogen",
      contents: prompt,
      config: {
        systemInstruction: "You refine Dawah follow-up task wording into gentle, respectful, actionable Bengali. Output JSON only.",
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            reason: { type: Type.STRING },
            suggestedAction: { type: Type.STRING },
            nextStepSummary: { type: Type.STRING },
          },
          required: ["title", "reason", "suggestedAction", "nextStepSummary"],
        },
      },
    });
    const parsed = JSON.parse((response.text ?? "{}").trim());
    const validated = careRefinementSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
}

export interface MyTrackVoiceResult {
  matchedItemKeys: string[];
  extractedDawahLogs: Array<{
    targetName: string | null;
    description: string;
    outcome: string | null;
  }>;
  extractedNote: string | null;
  summary: string;
}

export async function analyzeVoiceForMyTrack(params: {
  transcription: string;
  trackerItems: Array<{ key: string; banglaLabel: string; group: string }>;
}): Promise<MyTrackVoiceResult> {
  const text = params.transcription.trim();
  const validKeys = new Set(params.trackerItems.map((t) => t.key));

  const fallback = (): MyTrackVoiceResult => {
    const lower = text.toLowerCase();
    const matched = params.trackerItems
      .filter((item) => {
        const words = item.banglaLabel
          .toLowerCase()
          .split(/[\s,/()-]+/)
          .filter((w) => w.length >= 3);
        return words.some((w) => lower.includes(w));
      })
      .map((i) => i.key);

    const hasDawahCue = /দাওয়াত|দাওয়াহ|বই|উপহার|সাক্ষাৎ|কল|ভাই/.test(lower);
    return {
      matchedItemKeys: matched,
      extractedDawahLogs: hasDawahCue
        ? [{ targetName: null, description: text, outcome: null }]
        : [],
      extractedNote: text,
      summary:
        matched.length > 0
          ? `${matched.length}টি দৈনিক আমল/দাওয়াহ আইটেম শনাক্ত হয়েছে।`
          : "আপনার বক্তব্য ব্যক্তিগত নোট ও দাওয়াহ কার্যক্রমে সংরক্ষণের জন্য প্রস্তুত।",
    };
  };

  if (!resolveGeminiApiKey()) {
    return fallback();
  }

  try {
    const ai = getAiClient();
    const prompt = `Member's Bengali Voice Note about Today's Amal & Dawah Activities:
"""
${text}
"""

REAL_TRACKER_ITEMS (Only use exact "key" values from this list):
${JSON.stringify(params.trackerItems, null, 2)}

Match clearly performed items to matchedItemKeys, extract any Dawah interactions (speaking to a brother, inviting to mosque/program, gifting a book, phone call) into extractedDawahLogs, and summarize warmly in Bengali.`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: prompt,
        config: {
          systemInstruction:
            "You help a Dawah member log their own daily Amal and Dawah activities from a Bengali voice note. Only match keys that exist in REAL_TRACKER_ITEMS and are clearly mentioned as completed. Respond in JSON only.",
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              matchedItemKeys: { type: Type.ARRAY, items: { type: Type.STRING } },
              extractedDawahLogs: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    targetName: { type: Type.STRING },
                    description: { type: Type.STRING },
                    outcome: { type: Type.STRING },
                  },
                  required: ["description"],
                },
              },
              extractedNote: { type: Type.STRING },
              summary: { type: Type.STRING },
            },
            required: ["matchedItemKeys", "extractedDawahLogs", "summary"],
          },
        },
      }),
      18000,
      "আমার ট্র্যাক AI বিশ্লেষণ"
    );

    const parsed = JSON.parse((response.text ?? "{}").trim());
    const matchedItemKeys = Array.isArray(parsed.matchedItemKeys)
      ? parsed.matchedItemKeys.map(String).filter((k: string) => validKeys.has(k))
      : [];
    const extractedDawahLogs = Array.isArray(parsed.extractedDawahLogs)
      ? parsed.extractedDawahLogs
          .filter((l: any) => l && String(l.description || "").trim())
          .slice(0, 5)
          .map((l: any) => ({
            targetName: l.targetName ? String(l.targetName).trim() : null,
            description: String(l.description).trim(),
            outcome: l.outcome ? String(l.outcome).trim() : null,
          }))
      : [];

    return {
      matchedItemKeys,
      extractedDawahLogs,
      extractedNote: parsed.extractedNote ? String(parsed.extractedNote).trim() : null,
      summary: String(parsed.summary || "বিশ্লেষণ সম্পন্ন হয়েছে।"),
    };
  } catch (err: any) {
    console.warn("[MyTrack Voice Fallback]", err?.message || err);
    return fallback();
  }
}


