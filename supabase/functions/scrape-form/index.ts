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
        waitFor: 3000, // Wait for form to load
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

    // Extract questions from the scraped content
    const markdown = data.data?.markdown || data.markdown || "";
    const html = data.data?.html || data.html || "";
    
    console.log("Scraped content length:", markdown.length);

    // Parse questions from the form content
    const questions = parseGoogleFormQuestions(markdown, html);

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

function parseGoogleFormQuestions(markdown: string, html: string): ParsedQuestion[] {
  const questions: ParsedQuestion[] = [];
  
  // Split by common patterns that indicate new questions
  const lines = markdown.split("\n");
  let currentQuestion: Partial<ParsedQuestion> | null = null;
  let questionCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (!line) continue;
    
    // Skip common non-question elements
    if (line.includes("Submit") || 
        line.includes("Clear form") || 
        line.includes("Never submit passwords") ||
        line.includes("This form was created") ||
        line.includes("Google Forms") ||
        line.startsWith("*") && line.length < 5) {
      continue;
    }
    
    // Check if this looks like a question header (often bold or has asterisk for required)
    const isRequired = line.includes("*") || line.includes("(wajib)") || line.includes("(required)");
    const cleanLine = line.replace(/\*/g, "").replace(/\(wajib\)/gi, "").replace(/\(required\)/gi, "").trim();
    
    // If line ends with question mark or is followed by options, it's likely a question
    const isLikelyQuestion = cleanLine.endsWith("?") || 
                            cleanLine.endsWith(":") ||
                            (cleanLine.length > 10 && cleanLine.length < 500);
    
    // Check if next lines look like options (bullet points, letters, or short lines)
    const nextLines = lines.slice(i + 1, i + 10);
    const hasOptions = nextLines.some(nl => {
      const trimmed = nl.trim();
      return trimmed.match(/^[-•○●]\s/) || // Bullet points
             trimmed.match(/^[a-e][.)]\s/i) || // Letter options
             (trimmed.length > 0 && trimmed.length < 100 && !trimmed.endsWith("?"));
    });
    
    // If current line looks like a question
    if (cleanLine.length > 5 && isLikelyQuestion && !cleanLine.match(/^[-•○●a-e][.)]/i)) {
      // Save previous question if exists
      if (currentQuestion && currentQuestion.question) {
        questionCount++;
        questions.push({
          id: `q${questionCount}`,
          question: currentQuestion.question,
          type: currentQuestion.options?.length ? "multiple_choice" : "text",
          options: currentQuestion.options,
          required: currentQuestion.required,
        });
      }
      
      currentQuestion = {
        question: cleanLine,
        required: isRequired,
        options: [],
      };
    } 
    // Check if this is an option for current question
    else if (currentQuestion && cleanLine.length > 0 && cleanLine.length < 200) {
      // Check if it looks like an option
      const isOption = cleanLine.match(/^[-•○●]\s/) || 
                       cleanLine.match(/^[a-e][.)]\s/i) ||
                       (currentQuestion.options && currentQuestion.options.length > 0);
      
      if (isOption || !cleanLine.endsWith("?")) {
        const optionText = cleanLine
          .replace(/^[-•○●]\s*/, "")
          .replace(/^[a-e][.)]\s*/i, "")
          .trim();
        
        if (optionText && optionText.length > 0 && optionText.length < 200) {
          if (!currentQuestion.options) currentQuestion.options = [];
          currentQuestion.options.push(optionText);
        }
      }
    }
  }
  
  // Add last question
  if (currentQuestion && currentQuestion.question) {
    questionCount++;
    questions.push({
      id: `q${questionCount}`,
      question: currentQuestion.question,
      type: currentQuestion.options?.length ? "multiple_choice" : "text",
      options: currentQuestion.options,
      required: currentQuestion.required,
    });
  }
  
  // Filter out questions that are likely not real questions
  return questions.filter(q => 
    q.question.length > 5 && 
    !q.question.toLowerCase().includes("email address") &&
    !q.question.toLowerCase().includes("alamat email")
  );
}
