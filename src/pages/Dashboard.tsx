import React, { useState } from "react";
import type { Json } from "@/integrations/supabase/types";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { 
  Loader2, 
  Sparkles, 
  LogOut, 
  Send, 
  Copy, 
  Check, 
  History as HistoryIcon,
  PlusCircle,
  Trash2
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

interface HistoryItem {
  id: string;
  form_url: string;
  form_title: string | null;
  questions: Question[];
  answers: Answer[];
  created_at: string;
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [questionsInput, setQuestionsInput] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [step, setStep] = useState<"input" | "questions" | "answers">("input");

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const parseQuestions = () => {
    // Parse questions from text input
    const lines = questionsInput.trim().split("\n").filter(line => line.trim());
    const parsed: Question[] = [];
    let currentQuestion: Partial<Question> | null = null;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // Check if it's a numbered question
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
        // It's an option
        if (currentQuestion) {
          if (!currentQuestion.options) currentQuestion.options = [];
          currentQuestion.options.push(trimmed.replace(/^[a-e][.)]\s*/i, ""));
        }
      } else if (currentQuestion) {
        // Append to current question
        currentQuestion.question += " " + trimmed;
      }
    }

    // Add last question
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
          userContext: {
            fullName: user?.user_metadata?.full_name,
            email: user?.email,
          },
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

      // Save to history
      const historyEntry = {
        user_id: user!.id,
        form_url: "manual-input",
        form_title: `Form ${new Date().toLocaleDateString("id-ID")}`,
        questions: questions as unknown as Json,
        answers: data.answers as unknown as Json,
      };
      await supabase.from("form_history").insert(historyEntry);
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

  const loadHistory = async () => {
    const { data, error } = await supabase
      .from("form_history")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setHistory(data as unknown as HistoryItem[]);
    }
    setShowHistory(true);
  };

  const deleteHistory = async (id: string) => {
    await supabase.from("form_history").delete().eq("id", id);
    setHistory(history.filter(h => h.id !== id));
    toast.success("Riwayat dihapus");
  };

  const loadFromHistory = (item: HistoryItem) => {
    setQuestions(item.questions);
    setAnswers(item.answers);
    setStep("answers");
    setShowHistory(false);
    toast.success("Riwayat dimuat");
  };

  const resetForm = () => {
    setQuestionsInput("");
    setQuestions([]);
    setAnswers([]);
    setStep("input");
  };

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(186_100%_50%/0.08),transparent_50%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,hsl(270_100%_70%/0.05),transparent_50%)]" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">AI Form Filler</h1>
              <p className="text-sm text-muted-foreground">
                Halo, {user?.user_metadata?.full_name || user?.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={loadHistory}
              className="text-muted-foreground hover:text-foreground"
            >
              <HistoryIcon className="w-4 h-4 mr-2" />
              Riwayat
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Keluar
            </Button>
          </div>
        </div>

        {/* History Modal */}
        {showHistory && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-2xl glass-strong border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Riwayat Form</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)}>
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {history.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      Belum ada riwayat
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {history.map((item) => (
                        <div
                          key={item.id}
                          className="p-4 rounded-lg bg-secondary/50 hover:bg-secondary/80 transition-colors cursor-pointer group"
                          onClick={() => loadFromHistory(item)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-medium">{item.form_title || "Form"}</h4>
                              <p className="text-sm text-muted-foreground">
                                {item.questions?.length || 0} pertanyaan • {new Date(item.created_at).toLocaleDateString("id-ID")}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="opacity-0 group-hover:opacity-100 text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteHistory(item.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content */}
        <div className="space-y-6">
          {/* Step: Input Questions */}
          {step === "input" && (
            <Card className="glass border-border/50 animate-fade-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-primary" />
                  Masukkan Pertanyaan
                </CardTitle>
                <CardDescription>
                  Copy-paste pertanyaan dari Google Form, kuis, atau ujian kamu. 
                  Format yang didukung: pertanyaan bernomor dengan pilihan ganda (a, b, c, d).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
                  value={questionsInput}
                  onChange={(e) => setQuestionsInput(e.target.value)}
                  className="min-h-[300px] bg-input border-border font-mono text-sm"
                />
                <Button
                  onClick={parseQuestions}
                  className="w-full gradient-primary text-primary-foreground font-semibold"
                  disabled={!questionsInput.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Proses Pertanyaan
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
                      Review pertanyaan sebelum AI membuat jawaban
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
                        {q.options && (
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
                      <Check className="w-5 h-5 text-success" />
                      Jawaban Siap!
                    </CardTitle>
                    <CardDescription>
                      Klik pada jawaban untuk menyalin
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
                                <Check className="w-4 h-4 text-success" />
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
      </div>
    </div>
  );
}
