import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: "URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!apiKey) {
      console.error("FIRECRAWL_API_KEY not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    console.log("Scraping Google Form:", formattedUrl);

    const response = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: formattedUrl,
        formats: ["markdown", "html"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Firecrawl API error:", data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || "Failed to scrape form" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const markdown = data.data?.markdown || data.markdown || "";
    const html = data.data?.html || data.html || "";
    
    console.log("Scraped content length:", markdown.length);
    console.log("Raw markdown preview:", markdown.substring(0, 500));

    // Parse questions from the form content
    const questions = parseGoogleFormQuestions(markdown, html);
    console.log("Parsed questions:", JSON.stringify(questions, null, 2));

    return new Response(
      JSON.stringify({ 
        success: true, 
        questions,
        rawMarkdown: markdown,
        title: data.data?.metadata?.title || "Google Form"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error scraping form:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Failed to scrape" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

interface ParsedQuestion {
  id: string;
  question: string;
  type: string;
  options?: string[];
  required?: boolean;
}

// List of patterns to IGNORE (Google Form UI elements)
const IGNORE_PATTERNS = [
  /^sign in/i,
  /^login/i,
  /save your progress/i,
  /indicates required/i,
  /menunjukkan pertanyaan yang wajib/i,
  /your answer/i,
  /jawaban anda/i,
  /clear form/i,
  /hapus formulir/i,
  /submit/i,
  /kirim/i,
  /next/i,
  /berikutnya/i,
  /back/i,
  /kembali/i,
  /previous/i,
  /sebelumnya/i,
  /never submit passwords/i,
  /jangan pernah mengirimkan sandi/i,
  /this content is neither created/i,
  /terms of service/i,
  /privacy policy/i,
  /does this form look suspicious/i,
  /report/i,
  /google forms/i,
  /help and feedback/i,
  /contact form owner/i,
  /help forms improve/i,
  /^\[.*\]\(http/i, // Markdown links
  /^!\[.*\]\(/i, // Markdown images
  /^\*$/,
  /^\\+$/,
  /^-$/,
];

// Headings/sections that look like labels but are not actual questions
const SECTION_HEADING_PATTERNS = [
  /^pilihan ganda$/i,
  /^multiple choice$/i,
];

function shouldIgnoreLine(line: string): boolean {
  const trimmed = line.trim();
  const lower = trimmed.toLowerCase();

  // Too short
  if (lower.length < 3) return true;

  // Section headings (not questions)
  for (const pattern of SECTION_HEADING_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // Check against ignore patterns
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // Contains only special characters
  if (/^[\s\*\-\\_\[\]\(\)]+$/.test(lower)) return true;

  return false;
}

function parseGoogleFormQuestions(markdown: string, html: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = markdown.split("\n");

  let questionCount = 0;
  let i = 0;

  const normalize = (s: string) => s.replace(/\s+/g, " ").trim();

  const isRequiredMarkerLine = (s: string) => {
    const t = s.toLowerCase();
    return t.includes("indicates required") || t.includes("menunjukkan pertanyaan yang wajib");
  };

  const getNextNonEmptyIndex = (startIndex: number): number | null => {
    for (let k = startIndex; k < lines.length; k++) {
      const l = (lines[k] ?? "").trim();
      if (!l) continue;
      return k;
    }
    return null;
  };

  // Heuristic: treat the first meaningful line before the "required" marker as title (never a question)
  const requiredMarkerIndex = lines.findIndex((l) => isRequiredMarkerLine(l ?? ""));
  let titleLineIndex: number | null = null;
  let titleText: string | null = null;
  {
    const scanEnd = requiredMarkerIndex >= 0 ? requiredMarkerIndex : Math.min(lines.length, 20);
    for (let k = 0; k < scanEnd; k++) {
      const raw = (lines[k] ?? "").trim();
      if (!raw || shouldIgnoreLine(raw)) continue;
      const cleaned = normalize(
        raw
          .replace(/\\\*/g, "*")
          .replace(/^#+\s*/, "")
          .trim()
      );
      if (cleaned.length >= 3) {
        titleLineIndex = k;
        titleText = cleaned;
        break;
      }
    }
  }

  const getNextMeaningfulLine = (startIndex: number): string | null => {
    for (let k = startIndex; k < lines.length; k++) {
      const l = (lines[k] ?? "").trim();
      if (!l) continue;
      // NOTE: don't filter "Your answer" here because we use it as a signal
      if (shouldIgnoreLine(l)) continue;
      return l;
    }
    return null;
  };

  while (i < lines.length) {
    const rawLine = (lines[i] ?? "").trim();

    // Skip empty or ignored lines
    if (!rawLine || shouldIgnoreLine(rawLine)) {
      i++;
      continue;
    }

    // Clean the line
    let cleanedLine = normalize(
      rawLine
        .replace(/\\\*/g, "*") // Unescape asterisks
        .replace(/\s*\*\s*$/, "") // Remove trailing asterisk (required marker)
        .replace(/^\*\s*/, "") // Remove leading asterisk
        .replace(/^#+\s*/, "") // Remove markdown headers
        .trim()
    );

    // Remove leading numbering like "1. "
    cleanedLine = cleanedLine.replace(/^\d+\.\s+/, "");

    // Remove points label like "3 poin" / "3 points"
    cleanedLine = cleanedLine.replace(/\s+\d+\s*(poin|points)\s*$/i, "");

    // Skip title line if detected
    if (titleLineIndex === i && titleText && cleanedLine === titleText) {
      i++;
      continue;
    }

    // Check if this looks like a required field (has asterisk at end or escaped)
    const isRequired = rawLine.includes("*") || rawLine.includes("\\*");

    // Skip if still too short after cleaning
    if (cleanedLine.length < 3) {
      i++;
      continue;
    }

    // Skip if it's a known UI element after cleaning
    if (shouldIgnoreLine(cleanedLine)) {
      i++;
      continue;
    }

    // Look ahead for options
    const options: string[] = [];
    let j = i + 1;

    while (j < lines.length) {
      const rawNext = (lines[j] ?? "").trim();

      // Skip empty lines between options
      if (!rawNext) {
        j++;
        continue;
      }

      // Stop at navigation/footer UI
      if (/(^next$|^back$|^previous$|^submit$|^clear form$|^berikutnya$|^kembali$|^sebelumnya$|^kirim$|^hapus formulir$)/i.test(rawNext)) {
        break;
      }

      // Skip placeholders
      if (/^(your answer|jawaban anda)$/i.test(rawNext)) {
        j++;
        continue;
      }

      // Skip other ignored lines
      if (shouldIgnoreLine(rawNext)) {
        j++;
        continue;
      }

      const candidate = normalize(
        rawNext
          .replace(/\\\*/g, "*")
          .replace(/^\d+\.\s+/, "")
          .replace(/\s+\d+\s*(poin|points)\s*$/i, "")
          .trim()
      );

      // Next question detection
      const looksLikeNextQuestion =
        rawNext.includes("*") ||
        rawNext.includes("\\*") ||
        candidate.endsWith("?") ||
        candidate.endsWith(":") ||
        /^\d+\.\s+/.test(rawNext);

      // If we hit something that looks like the NEXT question, stop scanning options
      // (prevents options from a later question being attached to the current one)
      if (looksLikeNextQuestion) {
        break;
      }

      // Option detection
      const isOption =
        candidate.length > 0 &&
        candidate.length < 120 &&
        !candidate.endsWith("?") &&
        !candidate.endsWith(":") &&
        !candidate.includes("*") &&
        !candidate.toLowerCase().startsWith("[");

      if (isOption) {
        const cleanOption = candidate
          .replace(/^[-•○●]\s*/, "")
          .replace(/^[a-e][.)]\s*/i, "")
          .trim();

        if (cleanOption && !shouldIgnoreLine(cleanOption)) {
          options.push(cleanOption);
        }
        j++;
        continue;
      }

      if (options.length > 0) break;

      j++;
    }

    const isRealQuestion =
      cleanedLine.length >= 3 &&
      !cleanedLine.toLowerCase().includes("your answer") &&
      !cleanedLine.toLowerCase().includes("jawaban") &&
      !cleanedLine.toLowerCase().startsWith("[");

    if (isRealQuestion) {
      questionCount++;
      questions.push({
        id: `q${questionCount}`,
        question: cleanedLine,
        type: options.length >= 2 ? "multiple_choice" : "text",
        options: options.length >= 2 ? options : undefined,
        required: isRequired,
      });
    }

    i = j > i + 1 ? j : i + 1;
  }

  // Post-process: remove duplicates and clean up
  const seen = new Set<string>();
  const finalQuestions: ParsedQuestion[] = [];

  for (const q of questions) {
    const key = q.question.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      finalQuestions.push(q);
    }
  }

  console.log(`Found ${finalQuestions.length} questions after filtering`);

  return finalQuestions;
}

