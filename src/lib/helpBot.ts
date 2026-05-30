import { ADMIN_HELP_TOPICS, type HelpTopic } from "@/config/adminHelpContent";

export interface GenericTopic {
  id: string;
  category: string;
  title: string;
  keywords: string[];
  summary: string;
  steps: string[];
}

export interface BotAnswer<T = HelpTopic> {
  topics: T[];
  confidence: "high" | "medium" | "low";
}

const STOP_WORDS = new Set([
  "the", "a", "an", "is", "are", "to", "how", "do", "i", "can", "where", "what",
  "find", "in", "on", "for", "of", "and", "or", "my", "me", "this", "that", "it",
  "add", "see", "get", "go", "with", "from", "page", "dashboard", "admin",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Generic topic matcher — scores any topic list against the question.
 * Used by both the admin and agent help bots.
 */
export function matchTopics<T extends GenericTopic>(question: string, topics: T[]): BotAnswer<T> {
  const tokens = tokenize(question);
  if (tokens.length === 0) {
    return { topics: [], confidence: "low" };
  }

  const scored = topics.map((topic) => {
    let score = 0;
    const haystack = [
      topic.title.toLowerCase(),
      topic.summary.toLowerCase(),
      topic.category.toLowerCase(),
      ...topic.keywords.map((k) => k.toLowerCase()),
    ].join(" ");

    for (const token of tokens) {
      if (topic.keywords.some((k) => k.toLowerCase() === token)) score += 5;
      else if (topic.keywords.some((k) => k.toLowerCase().includes(token))) score += 3;
      if (topic.title.toLowerCase().includes(token)) score += 3;
      else if (haystack.includes(token)) score += 1;
    }

    const q = question.toLowerCase();
    for (const k of topic.keywords) {
      if (k.includes(" ") && q.includes(k.toLowerCase())) score += 4;
    }

    return { topic, score };
  });

  const ranked = scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
  if (ranked.length === 0) return { topics: [], confidence: "low" };

  const top = ranked[0].score;
  const confidence: BotAnswer["confidence"] = top >= 8 ? "high" : top >= 4 ? "medium" : "low";
  const results = ranked
    .filter((s) => s.score >= Math.max(2, top * 0.5))
    .slice(0, 3)
    .map((s) => s.topic);

  return { topics: results, confidence };
}

/**
 * Scores every ADMIN help topic against the user's question.
 * Pure client-side — no external API needed.
 */
export function askHelpBot(question: string): BotAnswer<HelpTopic> {
  return matchTopics(question, ADMIN_HELP_TOPICS);
}

export const SUGGESTED_QUESTIONS = [
  "How do I add a course video?",
  "Where do I approve a new agent?",
  "How do I upload floor plans to a listing?",
  "Where are the worksheet submissions?",
  "How do I create an event?",
  "Where do I chat with agents?",
];
