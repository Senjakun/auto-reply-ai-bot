import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FormQuestion {
  id: string;
  question: string;
  type: string;
  options?: string[];
  required?: boolean;
}

interface RequestBody {
  questions: FormQuestion[];
  userContext?: {
    fullName?: string;
  };
  wrongAnswerCount?: number;
  manualEssay?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { questions, userContext, wrongAnswerCount = 0, manualEssay = true }: RequestBody = await req.json();

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Questions are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${questions.length} questions with AI...`);
    console.log(`Wrong answer count requested: ${wrongAnswerCount}`);

    // Separate multiple choice and essay questions
    const mcQuestions = questions.filter(q => q.type === "multiple_choice");
    const essayQuestions = questions.filter(q => q.type === "text");

    // Randomly select which questions to answer incorrectly
    const wrongQuestionIds = new Set<string>();
    if (wrongAnswerCount > 0 && mcQuestions.length > 0) {
      const shuffled = [...mcQuestions].sort(() => Math.random() - 0.5);
      const toMakeWrong = shuffled.slice(0, Math.min(wrongAnswerCount, mcQuestions.length));
      toMakeWrong.forEach(q => wrongQuestionIds.add(q.id));
      console.log(`Will intentionally answer wrong: ${Array.from(wrongQuestionIds).join(", ")}`);
    }

    const systemPrompt = `Kamu adalah AI assistant yang sangat pintar dalam menjawab soal ujian dan kuis. 
Tugasmu adalah memberikan jawaban yang BENAR dan AKURAT untuk setiap pertanyaan.

INSTRUKSI PENTING:
1. Untuk soal pilihan ganda, pilih jawaban yang PALING BENAR dari opsi yang tersedia
2. Untuk soal essay/isian, berikan jawaban yang singkat, padat, dan tepat (2-3 kalimat)
3. Gunakan pengetahuanmu untuk menjawab dengan akurat
4. Format jawaban dalam JSON array sesuai urutan pertanyaan
5. PENTING: Untuk pilihan ganda, jawaban HARUS EXACT MATCH dengan salah satu opsi

${wrongQuestionIds.size > 0 ? `
KHUSUS untuk pertanyaan dengan ID berikut, berikan jawaban yang SALAH (pilih opsi yang bukan jawaban benar):
${Array.from(wrongQuestionIds).join(", ")}
` : ""}

User Context:
- Nama: ${userContext?.fullName || "Tidak diketahui"}`;

    const questionsText = questions.map((q, i) => {
      let text = `ID: ${q.id}\n${i + 1}. ${q.question}`;
      if (q.type === "multiple_choice" && q.options) {
        text += `\n   Pilihan: ${q.options.map((o, j) => `${String.fromCharCode(97 + j)}. ${o}`).join(", ")}`;
        if (wrongQuestionIds.has(q.id)) {
          text += "\n   [JAWAB SALAH]";
        }
      }
      if (q.required) {
        text += " (Wajib)";
      }
      return text;
    }).join("\n\n");

    const userPrompt = `Jawab pertanyaan-pertanyaan berikut ini:

${questionsText}

Berikan jawaban dalam format JSON array seperti ini:
[
  {"questionId": "id1", "answer": "jawaban1"},
  {"questionId": "id2", "answer": "jawaban2"}
]

PENTING: 
- Untuk pilihan ganda, jawaban HARUS SAMA PERSIS dengan salah satu opsi yang tersedia (termasuk huruf a/b/c/d nya)
- Untuk essay, jawab singkat dan jelas dalam 2-3 kalimat`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    console.log("AI Response received:", aiResponse.substring(0, 500));

    // Parse the JSON from AI response
    let answers;
    try {
      // Extract JSON array from response (handle markdown code blocks)
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        answers = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Could not find JSON array in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      // Fallback: create answers from raw response
      answers = questions.map((q, i) => ({
        questionId: q.id,
        answer: `Error parsing AI response for question ${i + 1}`
      }));
    }

    // Post-process answers for multiple choice to ensure exact match
    answers = answers.map((a: { questionId: string; answer: string }) => {
      const question = questions.find(q => q.id === a.questionId);
      if (question?.type === "multiple_choice" && question.options) {
        // Try to find exact match in options
        const answerLower = a.answer.toLowerCase().trim();
        
        // Check if answer starts with letter option (a., b., etc.)
        const letterMatch = answerLower.match(/^([a-e])[.)]\s*(.*)/);
        if (letterMatch) {
          const letterIndex = letterMatch[1].charCodeAt(0) - 97;
          if (letterIndex >= 0 && letterIndex < question.options.length) {
            return { ...a, answer: question.options[letterIndex] };
          }
        }
        
        // Try to find matching option
        const matchedOption = question.options.find(opt => 
          opt.toLowerCase().trim() === answerLower ||
          answerLower.includes(opt.toLowerCase().trim())
        );
        if (matchedOption) {
          return { ...a, answer: matchedOption };
        }
      }
      return a;
    });

    return new Response(
      JSON.stringify({ 
        answers, 
        raw: aiResponse,
        wrongQuestions: Array.from(wrongQuestionIds)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in form-ai function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
