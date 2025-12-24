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
  /your answer/i,
  /clear form/i,
  /submit/i,
  /next/i,
  /back/i,
  /previous/i,
  /never submit passwords/i,
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

function shouldIgnoreLine(line: string): boolean {
  const trimmed = line.trim().toLowerCase();
  
  // Too short
  if (trimmed.length < 3) return true;
  
  // Check against ignore patterns
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(line)) return true;
  }
  
  // Contains only special characters
  if (/^[\s\*\-\\_\[\]\(\)]+$/.test(trimmed)) return true;
  
  return false;
}

function parseGoogleFormQuestions(markdown: string, html: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  const lines = markdown.split("\n");
  
  let questionCount = 0;
  let i = 0;
  
  while (i < lines.length) {
    const line = lines[i].trim();
    
    // Skip empty or ignored lines
    if (!line || shouldIgnoreLine(line)) {
      i++;
      continue;
    }
    
    // Clean the line
    let cleanedLine = line
      .replace(/\\\*/g, "*") // Unescape asterisks
      .replace(/\s*\*\s*$/, "") // Remove trailing asterisk (required marker)
      .replace(/^\*\s*/, "") // Remove leading asterisk
      .replace(/^#+\s*/, "") // Remove markdown headers
      .trim();
    
    // Check if this looks like a required field (has asterisk at end)
    const isRequired = line.includes("*") || line.includes("\\*");
    
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
      const nextLine = lines[j].trim();
      
      // Stop at empty line or next question marker
      if (!nextLine) {
        j++;
        break;
      }
      
      // Skip "Your answer" placeholders
      if (/^your answer$/i.test(nextLine)) {
        j++;
        continue;
      }
      
      // Check if this is an option (short line, not a question)
      const isOption = nextLine.length > 0 && 
                       nextLine.length < 100 &&
                       !nextLine.endsWith("?") &&
                       !nextLine.includes("*") &&
                       !shouldIgnoreLine(nextLine);
      
      // Check if this looks like next question (ends with *, ?, or is longer)
      const looksLikeQuestion = nextLine.includes("*") || 
                                nextLine.endsWith("?") ||
                                nextLine.endsWith(":") ||
                                (nextLine.length > 50 && !options.length);
      
      if (isOption && !looksLikeQuestion) {
        const cleanOption = nextLine
          .replace(/^[-•○●]\s*/, "")
          .replace(/^[a-e][.)]\s*/i, "")
          .trim();
        
        if (cleanOption && cleanOption.length > 0 && !shouldIgnoreLine(cleanOption)) {
          options.push(cleanOption);
        }
        j++;
      } else if (looksLikeQuestion) {
        break;
      } else {
        j++;
      }
    }
    
    // Only add if it looks like a real question (not UI element)
    const isRealQuestion = cleanedLine.length >= 3 && 
                          !cleanedLine.toLowerCase().includes("your answer") &&
                          !cleanedLine.toLowerCase().startsWith("[");
    
    if (isRealQuestion) {
      questionCount++;
      questions.push({
        id: `q${questionCount}`,
        question: cleanedLine,
        type: options.length > 1 ? "multiple_choice" : "text",
        options: options.length > 1 ? options : undefined,
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
