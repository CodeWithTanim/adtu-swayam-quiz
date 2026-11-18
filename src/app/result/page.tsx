"use client";

import { Suspense } from "react";


import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  XCircle,
  AlertOctagon,
  Clock,
  BookOpen,
  Filter,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UniversityHeader } from "@/components/UniversityHeader";

interface DetailedQuestion {
  id: number;
  week: string;
  questionNumber: number;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  isAttempted: boolean;
  explanation: string;
}

interface ResultData {
  enrollmentNumber: string;
  status: "COMPLETED" | "EXPELLED" | "EXPIRED";
  startedAt: string;
  submittedAt: string;
  tabSwitchCount: number;
  expelReason?: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unattemptedCount: number;
  detailedQuestions: DetailedQuestion[];
}

function ResultContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enrollment = searchParams.get("enrollment") || "";

  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "MISTAKES" | "CORRECT" | "UNATTEMPTED">("MISTAKES");
  const [expandedExplanations, setExpandedExplanations] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function loadResult() {
      try {
        const res = await fetch(`/api/quiz/result?enrollment=${encodeURIComponent(enrollment)}`);
        const result = await res.json();
        if (res.ok) {
          setData(result);
          if (result.status === "COMPLETED" && result.percentage >= 60) {
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
            });
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    if (enrollment) {
      loadResult();
    } else {
      setLoading(false);
    }
  }, [enrollment]);

  const toggleExplanation = (id: number) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-600">Calculating score & preparing detailed review...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-6 space-y-4">
          <XCircle className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">No Assessment Found</h2>
          <p className="text-sm text-slate-600">
            Could not retrieve results for the specified enrollment number.
          </p>
          <Button onClick={() => router.push("/")} className="w-full bg-blue-900 hover:bg-blue-800">
            Return to Homepage
          </Button>
        </Card>
      </div>
    );
  }

  const isExpelled = data.status === "EXPELLED";
  const filteredQuestions = data.detailedQuestions.filter((q) => {
    if (filter === "MISTAKES") return q.isAttempted && !q.isCorrect;
    if (filter === "CORRECT") return q.isCorrect;
    if (filter === "UNATTEMPTED") return !q.isAttempted;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-blue-50/10 to-slate-100 flex flex-col">
      <UniversityHeader
        enrollmentNumber={data.enrollmentNumber}
        showStatus
        statusBadge={
          isExpelled ? (
            <Badge variant="destructive" className="flex items-center gap-1">
              <AlertOctagon className="w-3.5 h-3.5" /> Disqualified (Expelled)
            </Badge>
          ) : (
            <Badge variant="success" className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
            </Badge>
          )
        }
      />

      {/* Top Banner Notice */}
      <div className="bg-amber-500/10 border-b border-amber-300/40 text-amber-900 px-4 py-2 text-xs sm:text-sm text-center font-medium flex items-center justify-center gap-2">
        <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
        <span>
          <strong>Notice:</strong> This is a <strong>self-test assessment</strong> designed for revision and practice. Nothing more than this.
        </span>
      </div>

      <main className="max-w-6xl w-full mx-auto px-4 py-8 flex-1 space-y-8">
        {/* Expel Alert if candidate was disqualified */}
        {isExpelled && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-6 text-rose-900 flex items-start gap-4 shadow-sm">
            <AlertOctagon className="w-8 h-8 text-rose-600 shrink-0 mt-1" />
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-rose-800">
                Examination Auto-Submitted & Disqualified
              </h2>
              <p className="text-sm font-medium">
                {data.expelReason ||
                  "The session was terminated due to exceeding the maximum permitted tab switches (2 tab switches)."}
              </p>
              <p className="text-xs text-rose-700 pt-1">
                Total Tab Switches Recorded: <strong>{data.tabSwitchCount}</strong>. Questions answered up to the moment of expulsion were graded below.
              </p>
            </div>
          </div>
        )}

        {/* Scorecard Hero */}
        <Card className="border-slate-200/90 shadow-xl overflow-hidden bg-white">
          <div className="h-2.5 bg-gradient-to-r from-blue-900 via-indigo-600 to-amber-500" />
          <CardContent className="p-6 sm:p-10">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Left Score Big */}
              <div className="md:col-span-5 text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-slate-200 pb-6 md:pb-0 md:pr-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100/70 text-blue-900 text-xs font-bold">
                  <Award className="w-4 h-4 text-blue-700" />
                  Performance Summary
                </div>
                <div className="flex items-baseline justify-center md:justify-start gap-2 pt-2">
                  <span className="text-5xl sm:text-6xl font-black text-slate-900 font-mono tracking-tight">
                    {data.score}
                  </span>
                  <span className="text-2xl sm:text-3xl font-bold text-slate-400">
                    / {data.totalQuestions}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  Total Marks Obtained • {data.percentage}% Accuracy
                </p>
                <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden mt-3">
                  <div
                    className={`h-full transition-all duration-700 ${
                      data.percentage >= 60 ? "bg-emerald-500" : "bg-blue-800"
                    }`}
                    style={{ width: `${data.percentage}%` }}
                  />
                </div>
              </div>

              {/* Right Stats Breakdown */}
              <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-emerald-50/70 border border-emerald-200 p-4 rounded-xl text-center">
                  <span className="text-2xl font-black text-emerald-700 font-mono block">
                    {data.correctCount}
                  </span>
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wide">
                    Correct
                  </span>
                </div>

                <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-xl text-center">
                  <span className="text-2xl font-black text-rose-700 font-mono block">
                    {data.incorrectCount}
                  </span>
                  <span className="text-xs font-bold text-rose-800 uppercase tracking-wide">
                    Mistakes
                  </span>
                </div>

                <div className="bg-slate-100/80 border border-slate-200 p-4 rounded-xl text-center">
                  <span className="text-2xl font-black text-slate-700 font-mono block">
                    {data.unattemptedCount}
                  </span>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    Skipped
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
                  <span>Candidate: <strong className="font-mono text-slate-900">{data.enrollmentNumber}</strong></span>
                  <span>Tab Switches: <strong className={data.tabSwitchCount >= 2 ? "text-rose-600" : "text-slate-900"}>{data.tabSwitchCount}</strong></span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Detailed Solutions & Mistakes Review Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-900" />
                Comprehensive Question Analysis & Explanations
              </h2>
              <p className="text-xs sm:text-sm text-slate-600">
                Detailed explanations and answers as officially prescribed in the IIT Guwahati Course PDF.
              </p>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-xl self-start sm:self-auto text-xs font-semibold">
              <button
                onClick={() => setFilter("MISTAKES")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === "MISTAKES"
                    ? "bg-white text-rose-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Mistakes ({data.incorrectCount})
              </button>
              <button
                onClick={() => setFilter("ALL")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === "ALL"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All (80)
              </button>
              <button
                onClick={() => setFilter("CORRECT")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === "CORRECT"
                    ? "bg-white text-emerald-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Correct ({data.correctCount})
              </button>
              <button
                onClick={() => setFilter("UNATTEMPTED")}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  filter === "UNATTEMPTED"
                    ? "bg-white text-slate-700 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Skipped ({data.unattemptedCount})
              </button>
            </div>
          </div>

          {/* List of Questions */}
          {filteredQuestions.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-500">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No questions found for this filter.</p>
              <p className="text-xs text-slate-400 mt-1">Select &apos;All&apos; or another tab to review questions.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuestions.map((q, idx) => {
                const isMistake = q.isAttempted && !q.isCorrect;
                const isCorrect = q.isCorrect;
                const isUnattempted = !q.isAttempted;
                const isExpanded = expandedExplanations[q.id] !== false; // default open

                return (
                  <Card
                    key={q.id}
                    className={`border transition-all ${
                      isMistake
                        ? "border-rose-300 bg-white"
                        : isCorrect
                        ? "border-emerald-300 bg-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    <CardContent className="p-6 space-y-4">
                      {/* Question Top Header */}
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-slate-100 text-slate-800">
                            Q#{q.id}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            {q.week} • Question {q.questionNumber}
                          </span>
                        </div>

                        {/* Status Badge */}
                        {isCorrect && (
                          <Badge variant="success" className="flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Correct (+1)
                          </Badge>
                        )}
                        {isMistake && (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> Mistake (0)
                          </Badge>
                        )}
                        {isUnattempted && (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            Unattempted
                          </Badge>
                        )}
                      </div>

                      {/* Question Prompt */}
                      <div className="text-base font-semibold text-slate-900 leading-snug">
                        {q.question}
                      </div>

                      {/* 4 Options Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                        {(["A", "B", "C", "D"] as const).map((optKey) => {
                          const isUserPicked = q.userAnswer === optKey;
                          const isRightAnswer = q.correctAnswer === optKey;

                          let optionStyle = "border-slate-200 bg-slate-50/50 text-slate-700";

                          if (isRightAnswer) {
                            optionStyle =
                              "border-emerald-500 bg-emerald-50/80 text-emerald-950 font-semibold ring-1 ring-emerald-500";
                          } else if (isUserPicked && !isRightAnswer) {
                            optionStyle =
                              "border-rose-400 bg-rose-50/80 text-rose-950 font-semibold ring-1 ring-rose-400";
                          }

                          return (
                            <div
                              key={optKey}
                              className={`p-3 rounded-xl border text-xs sm:text-sm flex items-start gap-2.5 transition-all ${optionStyle}`}
                            >
                              <span
                                className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${
                                  isRightAnswer
                                    ? "bg-emerald-600 text-white"
                                    : isUserPicked
                                    ? "bg-rose-600 text-white"
                                    : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                {optKey}
                              </span>
                              <div className="flex-1">
                                <span>{q.options[optKey]}</span>
                                {isRightAnswer && (
                                  <span className="block text-[11px] text-emerald-700 font-bold mt-0.5">
                                    ✓ Correct Answer
                                  </span>
                                )}
                                {isUserPicked && !isRightAnswer && (
                                  <span className="block text-[11px] text-rose-700 font-bold mt-0.5">
                                    ✗ Your Selection
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Detailed Explanation Accordion */}
                      <div className="mt-3 rounded-xl border border-blue-200/80 bg-blue-50/60 overflow-hidden">
                        <button
                          onClick={() => toggleExplanation(q.id)}
                          className="w-full px-4 py-2.5 flex items-center justify-between text-left text-xs font-bold text-blue-950 hover:bg-blue-100/50 transition-colors"
                        >
                          <span className="flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-blue-800" />
                            Detailed Explanation & Curriculum Reference
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-blue-800" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-blue-800" />
                          )}
                        </button>

                        {isExpanded && (
                          <div className="p-4 pt-1 text-xs text-slate-800 leading-relaxed border-t border-blue-200/60">
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 border-t border-slate-200 text-xs text-slate-500 bg-white">
        © {new Date().getFullYear()} Assam Down Town University • SWAYAM NPTEL Self-Test Portal
      </footer>
    </div>
  );
}


export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 space-y-4">
        <div className="w-12 h-12 border-4 border-blue-900 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-600">Loading results...</p>
      </div>
    }>
      <ResultContent />
    </Suspense>
  );
}
