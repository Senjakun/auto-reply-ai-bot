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
  ArrowRight,
  User,
  Settings,
  AlertTriangle
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface Question {
  id: string;
  question: string;
  type: "multiple_choice" | "text" | "identity";
  options?: string[];
  required?: boolean;
  category?: "identity" | "quiz";
}

interface Answer {
  questionId: string;
  answer: string;
  isManual?: boolean;
}

interface UserIdentity {
  nama: string;
  kelas: string;
  nisn: string;
  custom: { [key: string]: string };
}

export default function Index() {
  const [input, setInput] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [scraping, setScraping] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "identity" | "questions" | "answers">("input");
  const [formTitle, setFormTitle] = useState("");
  
  // User identity for form filling
  const [userIdentity, setUserIdentity] = useState<UserIdentity>({
    nama: "",
    kelas: "",
    nisn: "",
    custom: {}
  });
  
  // Settings
  const [wrongAnswerCount, setWrongAnswerCount] = useState(0);
  const [manualEssay, setManualEssay] = useState(true);
  const [essayAnswers, setEssayAnswers] = useState<{ [key: string]: string }>({});

  // Detect if input is a URL
  const isUrl = (text: string): boolean => {
    const trimmed = text.trim();
    return trimmed.startsWith("http://") || 
           trimmed.startsWith("https://") || 
           trimmed.includes("docs.google.com/forms") ||
           trimmed.includes("forms.gle");
  };

  // Categorize questions
  const categorizeQuestions = (qs: Question[]): Question[] => {
    const identityKeywords = [
      "nama", "name", "kelas", "class", "nisn", "nis", "no absen", "nomor absen",
      "absensi", "absen", // Added to catch "Absensi" field
      "jenis kelamin", "gender", "tanggal lahir", "tempat lahir", "alamat",
      "sekolah", "jurusan", "email", "no hp", "telepon"
    ];
    
    return qs.map(q => {
      const lower = q.question.toLowerCase();
      const isIdentity = identityKeywords.some(kw => lower.includes(kw));
      return {
        ...q,
        category: isIdentity ? "identity" as const : "quiz" as const
      };
    });
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

      const categorized = categorizeQuestions(data.questions);
      setQuestions(categorized);
      setFormTitle(data.title || "Google Form");
      
      // Check if there are identity questions
      const hasIdentity = categorized.some(q => q.category === "identity");
      setStep(hasIdentity ? "identity" : "questions");
      
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

    const categorized = categorizeQuestions(parsed);
    setQuestions(categorized);
    setFormTitle("Soal Manual");
    
    const hasIdentity = categorized.some(q => q.category === "identity");
    setStep(hasIdentity ? "identity" : "questions");
    
    toast.success(`${parsed.length} pertanyaan terdeteksi!`);
  };

  // Get identity questions and quiz questions separately
  const identityQuestions = questions.filter(q => q.category === "identity");
  const quizQuestions = questions.filter(q => q.category === "quiz");
  const essayQuestions = quizQuestions.filter(q => q.type === "text");
  const multipleChoiceQuestions = quizQuestions.filter(q => q.type === "multiple_choice");

  const isStandardIdentityQuestion = (q: Question) => {
    const lower = q.question.toLowerCase();
    return (
      lower.includes("nama") ||
      lower.includes("name") ||
      lower.includes("kelas") ||
      lower.includes("class") ||
      lower.includes("nisn") ||
      lower.includes("nis") ||
      lower.includes("absen")
    );
  };

  const classQuestion = identityQuestions.find(
    (q) => (q.question.toLowerCase().includes("kelas") || q.question.toLowerCase().includes("class"))
  );

  // Auto-fill identity answers based on user input
  const getIdentityAnswer = (q: Question): string => {
    const lower = q.question.toLowerCase();
    if (lower.includes("nama") || lower.includes("name")) return userIdentity.nama;
    if (lower.includes("kelas") || lower.includes("class")) return userIdentity.kelas;
    if (lower.includes("nisn") || lower.includes("nis") || lower.includes("absen")) return userIdentity.nisn;
    return userIdentity.custom[q.id] || "";
  };

  const generateAnswers = async () => {
    // If there are no quiz questions, still proceed with identity answers only
    if (quizQuestions.length === 0) {
      const identityOnly: Answer[] = identityQuestions.map((q) => ({
        questionId: q.id,
        answer: getIdentityAnswer(q),
        isManual: true,
      }));

      setAnswers(identityOnly);
      setStep("answers");
      toast.info("Form ini tidak punya soal kuis—hanya pertanyaan identitas.");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("form-ai", {
        body: {
          questions: quizQuestions,
          userContext: {
            fullName: userIdentity.nama,
          },
          wrongAnswerCount,
          manualEssay,
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

      // Combine identity answers with AI answers
      const allAnswers: Answer[] = [];

      // Add identity answers
      for (const q of identityQuestions) {
        allAnswers.push({
          questionId: q.id,
          answer: getIdentityAnswer(q),
          isManual: true,
        });
      }

      // Add AI answers for quiz
      for (const aiAnswer of data.answers) {
        const question = quizQuestions.find((q) => q.id === aiAnswer.questionId);
        if (question?.type === "text" && manualEssay) {
          // For essay questions with manual mode, use user input or placeholder
          allAnswers.push({
            questionId: aiAnswer.questionId,
            answer: essayAnswers[aiAnswer.questionId] || aiAnswer.answer,
            isManual: !!essayAnswers[aiAnswer.questionId],
          });
        } else {
          allAnswers.push({
            questionId: aiAnswer.questionId,
            answer: aiAnswer.answer,
          });
        }
      }

      setAnswers(allAnswers);
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
    const text = questions.map((q, i) => {
      const answer = answers.find(a => a.questionId === q.id);
      return `${i + 1}. ${q.question}\nJawaban: ${answer?.answer || "-"}`;
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
    setUserIdentity({ nama: "", kelas: "", nisn: "", custom: {} });
    setEssayAnswers({});
    setWrongAnswerCount(0);
  };

  const proceedToQuestions = () => {
    // Validate identity
    if (!userIdentity.nama.trim()) {
      toast.error("Nama harus diisi");
      return;
    }
    setStep("questions");
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

        {/* Progress Steps */}
        {step !== "input" && (
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 text-sm">
              {["Input", "Identitas", "Review", "Jawaban"].map((s, i) => {
                const stepMap = ["input", "identity", "questions", "answers"];
                const currentIdx = stepMap.indexOf(step);
                const isActive = i <= currentIdx;
                const isCurrent = stepMap[i] === step;
                
                return (
                  <React.Fragment key={i}>
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${
                      isCurrent ? "bg-primary text-primary-foreground" : 
                      isActive ? "bg-primary/20 text-primary" : "bg-secondary/50 text-muted-foreground"
                    }`}>
                      <span className="text-xs font-medium">{s}</span>
                    </div>
                    {i < 3 && <div className={`w-8 h-0.5 ${isActive ? "bg-primary" : "bg-border"}`} />}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}

        {/* How it works - only show on input step */}
        {step === "input" && (
          <div className="mb-8 animate-fade-in">
            <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 text-sm">
              {["Paste link/soal", "Isi identitas", "AI jawab soal", "Copy jawaban"].map((s, i) => (
                <React.Fragment key={i}>
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border/50">
                    <div className="w-6 h-6 rounded-full gradient-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
                      {i + 1}
                    </div>
                    <span>{s}</span>
                  </div>
                  {i < 3 && <ArrowRight className="w-4 h-4 text-muted-foreground hidden md:block" />}
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
1. Nama lengkap:

2. Kelas:

3. Siapa presiden pertama Indonesia?
a. Soekarno
b. Soeharto
c. Habibie
d. Gus Dur

4. Tahun berapa Indonesia merdeka?
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

          {/* Step: Identity */}
          {step === "identity" && (
            <Card className="glass border-border/50 animate-fade-in">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <User className="w-5 h-5 text-primary" />
                      Isi Data Diri
                    </CardTitle>
                    <CardDescription>
                      Data ini akan digunakan untuk mengisi form identitas
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetForm}>
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Standard identity fields */}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="nama">Nama Lengkap *</Label>
                    <Input
                      id="nama"
                      placeholder="Masukkan nama lengkap"
                      value={userIdentity.nama}
                      onChange={(e) => setUserIdentity(prev => ({ ...prev, nama: e.target.value }))}
                      className="bg-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="kelas">Kelas</Label>
                    {classQuestion?.type === "multiple_choice" && classQuestion.options ? (
                      <select
                        id="kelas"
                        className="w-full p-2 rounded-md bg-input border border-border"
                        value={userIdentity.kelas}
                        onChange={(e) =>
                          setUserIdentity((prev) => ({ ...prev, kelas: e.target.value }))
                        }
                      >
                        <option value="">Pilih...</option>
                        {classQuestion.options.map((opt, i) => (
                          <option key={i} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        id="kelas"
                        placeholder="Contoh: XII IPA 1"
                        value={userIdentity.kelas}
                        onChange={(e) =>
                          setUserIdentity((prev) => ({ ...prev, kelas: e.target.value }))
                        }
                        className="bg-input"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nisn">NISN / No. Absen</Label>
                    <Input
                      id="nisn"
                      placeholder="Masukkan NISN atau nomor absen"
                      value={userIdentity.nisn}
                      onChange={(e) => setUserIdentity(prev => ({ ...prev, nisn: e.target.value }))}
                      className="bg-input"
                    />
                  </div>
                </div>

                {/* Detected identity questions */}
                {identityQuestions.length > 0 && (
                  <div className="space-y-4">
                    <Label className="text-muted-foreground">Pertanyaan identitas lainnya:</Label>
                    <div className="space-y-3">
                      {identityQuestions.map((q) => {
                        // Jangan tampilkan lagi pertanyaan identitas yang sudah punya kolom standar
                        // (contoh: "Kelas" akan pakai kolom Kelas di atas, bukan dobel)
                        if (isStandardIdentityQuestion(q)) return null;

                        const autoValue = getIdentityAnswer(q);
                        if (autoValue) return null; // Skip if already auto-filled

                        return (
                          <div key={q.id} className="space-y-2">
                            <Label className="text-sm">{q.question}</Label>
                            {q.type === "multiple_choice" && q.options ? (
                              <select
                                className="w-full p-2 rounded-md bg-input border border-border"
                                value={userIdentity.custom[q.id] || ""}
                                onChange={(e) =>
                                  setUserIdentity((prev) => ({
                                    ...prev,
                                    custom: { ...prev.custom, [q.id]: e.target.value },
                                  }))
                                }
                              >
                                <option value="">Pilih...</option>
                                {q.options.map((opt, i) => (
                                  <option key={i} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <Input
                                placeholder="Masukkan jawaban"
                                value={userIdentity.custom[q.id] || ""}
                                onChange={(e) =>
                                  setUserIdentity((prev) => ({
                                    ...prev,
                                    custom: { ...prev.custom, [q.id]: e.target.value },
                                  }))
                                }
                                className="bg-input"
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <Button
                  onClick={proceedToQuestions}
                  className="w-full gradient-primary text-primary-foreground font-semibold"
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Lanjut ke Soal ({quizQuestions.length} soal)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step: Review Questions */}
          {step === "questions" && (
            <div className="space-y-6 animate-fade-in">
              {/* Settings Card */}
              <Card className="glass border-border/50">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Settings className="w-5 h-5 text-primary" />
                    Pengaturan AI
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Wrong answer slider */}
                  {multipleChoiceQuestions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          <Label>Jumlah jawaban salah (anti-curiga)</Label>
                        </div>
                        <span className="text-sm font-medium px-2 py-1 rounded bg-secondary">
                          {wrongAnswerCount} dari {multipleChoiceQuestions.length} soal
                        </span>
                      </div>
                      <Slider
                        value={[wrongAnswerCount]}
                        onValueChange={(v) => setWrongAnswerCount(v[0])}
                        max={Math.min(5, multipleChoiceQuestions.length)}
                        step={1}
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        AI akan sengaja menjawab salah beberapa soal agar nilai tidak sempurna
                      </p>
                    </div>
                  )}

                  {/* Manual essay toggle */}
                  {essayQuestions.length > 0 && (
                    <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30">
                      <div className="space-y-1">
                        <Label>Isi jawaban uraian manual</Label>
                        <p className="text-xs text-muted-foreground">
                          Kamu bisa tulis jawaban uraian sendiri agar lebih personal
                        </p>
                      </div>
                      <Switch
                        checked={manualEssay}
                        onCheckedChange={setManualEssay}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Essay inputs if manual mode */}
              {manualEssay && essayQuestions.length > 0 && (
                <Card className="glass border-border/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5 text-primary" />
                      Jawaban Uraian Manual
                    </CardTitle>
                    <CardDescription>
                      Tulis jawabanmu sendiri untuk soal uraian (opsional, AI akan isi jika kosong)
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[300px] pr-4">
                      <div className="space-y-4">
                        {essayQuestions.map((q, i) => (
                          <div key={q.id} className="space-y-2">
                            <Label className="text-sm">
                              {i + 1}. {q.question}
                            </Label>
                            <Textarea
                              placeholder="Tulis jawabanmu di sini (kosongkan jika ingin AI yang menjawab)"
                              value={essayAnswers[q.id] || ""}
                              onChange={(e) => setEssayAnswers(prev => ({
                                ...prev,
                                [q.id]: e.target.value
                              }))}
                              className="bg-input min-h-[80px]"
                            />
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Questions preview */}
              <Card className="glass border-border/50">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {questions.length} Pertanyaan • {quizQuestions.length} Soal Kuis
                      </CardTitle>
                      <CardDescription>
                        {formTitle} • {identityQuestions.length} identitas • {multipleChoiceQuestions.length} pilihan ganda, {essayQuestions.length} uraian
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetForm}>
                      Reset
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[300px] pr-4">
                    <div className="space-y-4">
                      {quizQuestions.length === 0 ? (
                        <div className="p-4 rounded-lg bg-secondary/30">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="w-5 h-5 text-primary mt-0.5" />
                            <div className="space-y-1">
                              <p className="font-medium">Tidak ada soal kuis terdeteksi.</p>
                              <p className="text-sm text-muted-foreground">
                                Form ini berisi pertanyaan identitas saja. Kamu bisa lanjut untuk melihat/copy jawaban identitas.
                              </p>
                            </div>
                          </div>
                        </div>
                      ) : (
                        quizQuestions.map((q, i) => (
                          <div key={q.id} className="p-4 rounded-lg bg-secondary/30">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-medium">
                                {i + 1}. {q.question}
                              </p>
                              <span
                                className={`text-xs px-2 py-0.5 rounded ${
                                  q.type === "multiple_choice"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-purple-500/20 text-purple-400"
                                }`}
                              >
                                {q.type === "multiple_choice" ? "PG" : "Uraian"}
                              </span>
                            </div>
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
                        ))
                      )}
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
                    ) : quizQuestions.length === 0 ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Lanjutkan (Jawaban Identitas)
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
            </div>
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
                      const isIdentity = q.category === "identity";
                      
                      return (
                        <div 
                          key={q.id} 
                          className={`p-4 rounded-lg transition-colors cursor-pointer group ${
                            isIdentity ? "bg-blue-500/10 hover:bg-blue-500/20" : "bg-secondary/30 hover:bg-secondary/50"
                          }`}
                          onClick={() => copyAnswer(answer?.answer || "", q.id)}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <p className="font-medium text-muted-foreground text-sm">
                              {i + 1}. {q.question}
                            </p>
                            {isIdentity && (
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
                                Identitas
                              </span>
                            )}
                          </div>
                          <div className="flex items-start justify-between gap-4">
                            <p className="text-foreground font-medium">
                              {answer?.answer || "-"}
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
        <div className="mt-8 text-center text-xs text-muted-foreground">
          <p>
            Gunakan dengan bijak. AI bisa salah.
          </p>
        </div>
      </div>
    </div>
  );
}
