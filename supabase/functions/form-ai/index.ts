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
    email?: string;
  };
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

    const { questions, userContext }: RequestBody = await req.json();

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return new Response(
        JSON.stringify({ error: "Questions are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing ${questions.length} questions with AI...`);

    const systemPrompt = `Kamu adalah AI assistant yang sangat pintar dalam menjawab soal ujian dan kuis. 
Tugasmu adalah memberikan jawaban yang BENAR dan AKURAT untuk setiap pertanyaan.

INSTRUKSI PENTING:
1. Untuk soal pilihan ganda, pilih jawaban yang PALING BENAR dari opsi yang tersedia
2. Untuk soal essay/isian, berikan jawaban yang singkat, padat, dan tepat
3. Gunakan pengetahuanmu untuk menjawab dengan akurat
4. Jika ada konteks user (nama, email), gunakan untuk pertanyaan identitas
5. Format jawaban dalam JSON array sesuai urutan pertanyaan

User Context:
- Nama: ${userContext?.fullName || "Tidak diketahui"}
- Email: ${userContext?.email || "Tidak diketahui"}`;

    const questionsText = questions.map((q, i) => {
      let text = `${i + 1}. ${q.question}`;
      if (q.type === "multiple_choice" && q.options) {
        text += `\n   Pilihan: ${q.options.join(", ")}`;
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

PENTING: Pastikan jawaban untuk pilihan ganda EXACTLY sama dengan salah satu opsi yang tersedia.`;

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

    console.log("AI Response received:", aiResponse.substring(0, 200));

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

    return new Response(
      JSON.stringify({ answers, raw: aiResponse }),
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
