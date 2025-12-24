import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  Sparkles, 
  Send, 
  Copy, 
  Check, 
  Link as LinkIcon,
  FileText,
  Zap,
  ArrowRight
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Question {
  id: string;
  question: string;
  type: string;
  options?: string[];
  required?: boolean;
}

interface Answer {
  questionId: string;
  answer: string;
}

export default function Index() {
  const [input, setInput] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "questions" | "answers">("input");
  const [formTitle, setFormTitle] = useState("");

  // Detect if input is a URL
  const isUrl = (text: string): boolean => {
    const trimmed = text.trim();
    return trimmed.startsWith("http://") || 
           trimmed.startsWith("https://") || 
           trimmed.includes("docs.google.com/forms") ||
           trimmed.includes("forms.gle");
  };

  // Handle the main action - either scrape URL or parse text
  const handleProcess = async () => {
    const trimmedInput = input.trim();
    
    if (!trimmedInput) {
      toast.error("Masukkan link Google Form atau pertanyaan");
      return;
    }

    if (isUrl(trimmedInput)) {
      await scrapeForm(trimmedInput);
    } else {
      parseQuestions(trimmedInput);
    }
  };

  // Scrape Google Form from URL
  const scrapeForm = async (url: string) => {
    setScraping(true);
    try {
      toast.info("Mengambil pertanyaan dari Google Form...");
      
      const { data, error } = await supabase.functions.invoke("scrape-form", {
        body: { url },
      });

      if (error) {
        console.error("Scrape error:", error);
        toast.error("Gagal mengambil form. Coba paste pertanyaan secara manual.");
        return;
      }

      if (!data.success || !data.questions || data.questions.length === 0) {
        toast.error("Tidak dapat mendeteksi pertanyaan. Coba paste pertanyaan secara manual.");
        return;
      }

      setQuestions(data.questions);
      setFormTitle(data.title || "Google Form");
      setStep("questions");
      toast.success(`${data.questions.length} pertanyaan ditemukan!`);
    } catch (err) {
      console.error("Error scraping:", err);
      toast.error("Gagal mengambil form. Coba paste pertanyaan secara manual.");
    } finally {
      setScraping(false);
    }
  };

  // Parse questions from pasted text
  const parseQuestions = (text: string) => {
    const lines = text.split("\n").filter(line => line.trim());
    const parsed: Question[] = [];
    let currentQuestion: Partial<Question> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      const questionMatch = trimmed.match(/^(\d+)[.)]\s*(.+)/);
      if (questionMatch) {
        if (currentQuestion && currentQuestion.question) {
          parsed.push({
            id: `q${parsed.length + 1}`,
            question: currentQuestion.question,
            type: currentQuestion.options?.length ? "multiple_choice" : "text",
            options: currentQuestion.options,
            required: true,
          });
        }
        currentQuestion = { question: questionMatch[2] };
      } else if (trimmed.match(/^[a-e][.)]/i)) {
        if (currentQuestion) {
          if (!currentQuestion.options) currentQuestion.options = [];
          currentQuestion.options.push(trimmed.replace(/^[a-e][.)]\s*/i, ""));
        }
      } else if (currentQuestion) {
        currentQuestion.question += " " + trimmed;
      }
    }

    if (currentQuestion && currentQuestion.question) {
      parsed.push({
        id: `q${parsed.length + 1}`,
        question: currentQuestion.question,
        type: currentQuestion.options?.length ? "multiple_choice" : "text",
        options: currentQuestion.options,
        required: true,
      });
    }

    if (parsed.length === 0) {
      toast.error("Tidak ada pertanyaan yang terdeteksi. Pastikan format benar.");
      return;
    }

    setQuestions(parsed);
    setFormTitle("Soal Manual");
    setStep("questions");
    toast.success(`${parsed.length} pertanyaan terdeteksi!`);
  };

  const generateAnswers = async () => {
    if (questions.length === 0) {
      toast.error("Tidak ada pertanyaan untuk dijawab");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("form-ai", {
        body: {
          questions,
          userContext: {},
        },
      });

      if (error) {
        if (error.message.includes("429")) {
          toast.error("Rate limit. Coba lagi dalam beberapa menit.");
        } else if (error.message.includes("402")) {
          toast.error("AI credits habis. Silakan tambah credits.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      if (data.error) {
        toast.error(data.error);
        return;
      }

      setAnswers(data.answers);
      setStep("answers");
      toast.success("Jawaban berhasil dibuat!");
    } catch (err) {
      console.error("Error generating answers:", err);
      toast.error("Gagal membuat jawaban. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  const copyAnswer = (answer: string, id: string) => {
    navigator.clipboard.writeText(answer);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
    toast.success("Jawaban disalin!");
  };

  const copyAllAnswers = () => {
    const text = answers.map((a, i) => {
      const q = questions.find(q => q.id === a.questionId);
      return `${i + 1}. ${q?.question || ""}\nJawaban: ${a.answer}`;
    }).join("\n\n");
    navigator.clipboard.writeText(text);
    toast.success("Semua jawaban disalin!");
  };

  const resetForm = () => {
    setInput("");
    setQuestions([]);
    setAnswers([]);
    setFormTitle("");
    setStep("input");
  };

  const isProcessing = loading || scraping;

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(186_100%_50%/0.15),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(270_100%_70%/0.1),transparent_50%)]" />
      
      {/* Grid pattern */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(186 100% 50%) 1px, transparent 1px),
                           linear-gradient(90deg, hsl(186 100% 50%) 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}
      />

      {/* Floating orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-[120px] animate-pulse" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">AI Form Filler</h1>
              <p className="text-sm text-muted-foreground">
                Jawab kuis & ujian otomatis dengan AI
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="w-4 h-4 text-primary" />
            <span>Powered by Gemini AI</span>
          </div>
        </div>

        {/* How it works - only show on input step */}
        {step === "input" && (
          <div className="mb-8 animate-fade-in">
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm">
              {["Paste link/soal", "AI analisis", "Copy jawaban"].map((s, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                    <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                      {i + 1}
                    </div>
                    <span>{s}</span>
                  </div>
                  {i < 2 && <ArrowRight className="w-4 h-4 text-muted-foreground hidden md:block" />}
                </React.Fragment>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Step: Input */}
          {step === "input" && (
            <Card className="glass border-border/50 animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Paste Link atau Soal
                </CardTitle>
                <CardDescription>
                  Paste link Google Form <span className="text-primary">(otomatis di-scrape)</span> atau langsung paste soal-soalnya.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* URL Input */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <LinkIcon className="w-4 h-4" />
                    <span>Link Google Form</span>
                  </div>
                  <Input
                    placeholder="https://docs.google.com/forms/d/e/..."
                    value={isUrl(input) ? input : ""}
                    onChange={(e) => setInput(e.target.value)}
                    className="bg-input border-border"
                  />
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-sm text-muted-foreground">atau</span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                {/* Text Input */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>Paste Soal Langsung</span>
                  </div>
                  <Textarea
                    placeholder={`Contoh format:
1. Siapa presiden pertama Indonesia?
a. Soekarno
b. Soeharto
c. Habibie
d. Gus Dur

2. Tahun berapa Indonesia merdeka?
a. 1945
b. 1946
c. 1944
d. 1950`}
                    value={isUrl(input) ? "" : input}
                    onChange={(e) => setInput(e.target.value)}
                    className="min-h-[200px] bg-input border-border font-mono text-sm"
                  />
                </div>

                <Button
                  onClick={handleProcess}
                  className="w-full gradient-primary text-primary-foreground font-semibold"
                  disabled={!input.trim() || isProcessing}
                >
                  {scraping ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Mengambil pertanyaan...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {isUrl(input.trim()) ? "Ambil Pertanyaan dari Form" : "Proses Pertanyaan"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step: Review Questions */}
          {step === "questions" && (
            <Card className="glass border-border/50 animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{questions.length} Pertanyaan Terdeteksi</CardTitle>
                    <CardDescription>
                      {formTitle} • Review sebelum AI membuat jawaban
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-4">
                    {questions.map((q, i) => (
                      <div key={q.id} className="p-4 rounded-lg bg-secondary/30">
                        <p className="font-medium">
                          {i + 1}. {q.question}
                        </p>
                        {q.options && q.options.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {q.options.map((opt, j) => (
                              <p key={j} className="text-sm text-muted-foreground pl-4">
                                {String.fromCharCode(97 + j)}. {opt}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <Button
                  onClick={generateAnswers}
                  className="w-full gradient-primary text-primary-foreground font-semibold"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      AI sedang menjawab...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Buat Jawaban dengan AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step: Answers */}
          {step === "answers" && (
            <Card className="glass border-border/50 animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Check className="w-5 h-5 text-green-500" />
                      Jawaban Siap!
                    </CardTitle>
                    <CardDescription>
                      {formTitle} • Klik pada jawaban untuk menyalin
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={copyAllAnswers}>
                      <Copy className="w-4 h-4 mr-2" />
                      Salin Semua
                    </Button>
                    <Button variant="ghost" size="sm" onClick={resetForm}>
                      Form Baru
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-4">
                    {questions.map((q, i) => {
                      const answer = answers.find(a => a.questionId === q.id);
                      return (
                        <div 
                          key={q.id} 
                          className="p-4 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors cursor-pointer group"
                          onClick={() => copyAnswer(answer?.answer || "", q.id)}
                        >
                          <p className="font-medium text-muted-foreground text-sm mb-2">
                            {i + 1}. {q.question}
                          </p>
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-foreground font-medium">
                              {answer?.answer || "Tidak ada jawaban"}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="shrink-0 opacity-0 group-hover:opacity-100"
                            >
                              {copied === q.id ? (
                                <Check className="w-4 h-4 text-green-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>© 2024 AI Form Filler. Built with Lovable.</p>
        </footer>
      </div>
    </div>
  );
}
