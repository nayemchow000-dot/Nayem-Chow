import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { STAGES } from "../types";

let _aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured on the server.");
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

/**
 * Transcribe Bengali voice note audio using Gemini 3.5 Transcribe.
 */
export async function transcribeBengaliAudio(base64Audio: string, mimeType: string): Promise<string> {
  const ai = getAiClient();
  const cleanBase64 = base64Audio.replace(/^data:[^;]+;base64,/, "");

  const audioPart = {
    inlineData: {
      mimeType: mimeType || "audio/webm",
      data: cleanBase64,
    },
  };

  const response = await ai.models.generateContent({
    model: "gemini-3.5-transcribe",
    contents: {
      parts: [
        audioPart,
        {
          text: "Transcribe this Bengali voice note accurately in natural Bengali script. Preserve Islamic and Dawah terms accurately (such as সালাহ, জামাত, ফজর, ইলমি মুহাজারা, পাঠচক্র, বয়ান, তাফসির, দীনিয়াত, তাহাজ্জুদ, নফল রোজা, দাওয়াহ). Return only the transcribed text without extra commentary.",
        },
      ],
    },
  });

  const text = (response.text ?? "").trim();
  if (!text) {
    throw new Error("ভয়েস নোট থেকে কোনো স্পষ্ট কথা শনাক্ত করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।");
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
}): Promise<VoiceAnalysisOutput> {
  const ai = getAiClient();
  const { contact, categories, existingObservations, transcription } = params;

  const activeCategories = categories.filter((c) => c.isActive !== false);
  const categoryById = new Map(activeCategories.map((c) => [c.id, c]));

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

Analyze the voice note carefully and return structured JSON matching the schema.`;

  const response = await ai.models.generateContent({
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
        },
        required: ["observations", "suggestedCategories", "uncertainObservations"],
      },
    },
  });

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
  const ai = getAiClient();
  const { contact, categories, observations, salahRecords, followUps, activityRecords } = params;

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

  const response = await ai.models.generateContent({
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
  });

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
  userRole: "admin" | "member";
  userName: string;
  modelMode?: "standard" | "fast";
  contextSummary?: string;
}): Promise<string> {
  const ai = getAiClient();
  const model = params.modelMode === "fast" ? "gemini-3.1-flash-lite" : "gemini-4-hydrogen";

  const systemInstruction =
    params.userRole === "admin"
      ? `আপনি কোটবাড়ি দাওয়াহ মুভমেন্ট (Kotbari Dawah Movement)-এর একজন প্রজ্ঞাবান, ভদ্র ও সহানুভূতিশীল দাওয়াহ সহায়ক (AI Dawah Assistant)।
বর্তমান ব্যবহারকারী একজন অ্যাডমিন (${params.userName})।
আপনার দায়িত্ব:
- অ্যাডমিনকে দাওয়াহ সদস্যদের (ভাইদের) সাথে সুন্দর ও হিকমাহপূর্ণ যোগাযোগ, ফলো-আপ পরিকল্পনা, মিটিং/বয়ান/মুহাজারায় আমন্ত্রণ, এবং ১৬টি গ্রোথ স্টেজ অনুযায়ী ধাপে ধাপে অগ্রগতির পরামর্শ দেওয়া।
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
