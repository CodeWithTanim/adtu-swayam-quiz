"use client";

import { Suspense } from "react";


import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Clock,
  AlertTriangle,
  Send,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  ShieldAlert,
  HelpCircle,
  Bookmark,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

interface ClientQuestion {
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
}

function QuizContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const enrollmentQuery = searchParams.get("enrollment") || "";

  const [loading, setLoading] = useState(true);
  const [enrollment, setEnrollment] = useState(enrollmentQuery);
  const [questions, setQuestions] = useState<ClientQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<Record<number, boolean>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(3600);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);

  // Modals & Warnings
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fullscreenWarning, setFullscreenWarning] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenModalOpen, setFullscreenModalOpen] = useState(false);

  const tabSwitchCountRef = useRef(tabSwitchCount);
  tabSwitchCountRef.current = tabSwitchCount;

  const answersRef = useRef(answers);
  answersRef.current = answers;

  // Request Fullscreen
  const ensureFullscreen = useCallback(async () => {
    try {
      const elem = document.documentElement as any;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.mozRequestFullScreen) {
        await elem.mozRequestFullScreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setIsFullscreen(true);
      setFullscreenModalOpen(false);
      setFullscreenWarning(false);
    } catch (err) {
      console.warn("Fullscreen request error:", err);
      // Browser blocked programmatic call without direct click: show modal overlay
      setFullscreenModalOpen(true);
    }
  }, []);

  // Submit exam handler
  const submitExam = useCallback(
    async (reason?: "EXPEL" | "TIMEOUT" | "USER") => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        const payload = {
          enrollmentNumber: enrollment,
          answers: answersRef.current,
          tabSwitchCount: tabSwitchCountRef.current,
          action: reason === "EXPEL" ? "EXPEL" : "SUBMIT",
        };

        await fetch("/api/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (document.fullscreenElement && document.exitFullscreen) {
          try {
            await document.exitFullscreen();
          } catch (e) {}
        }

        router.replace(`/result?enrollment=${encodeURIComponent(enrollment)}`);
      } catch (err) {
        console.error("Submission failed:", err);
        router.replace(`/result?enrollment=${encodeURIComponent(enrollment)}`);
      }
    },
    [enrollment, isSubmitting, router]
  );

  // Sync state periodically with backend
  const syncProgress = useCallback(
    async (curAnswers: Record<string, string>, switches: number) => {
      try {
        const res = await fetch("/api/quiz/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enrollmentNumber: enrollment,
            answers: curAnswers,
            tabSwitchCount: switches,
            action: "SYNC",
          }),
        });
        const data = await res.json();
        if (data.status === "EXPELLED") {
          submitExam("EXPEL");
        }
      } catch (e) {
        console.error("Sync error:", e);
      }
    },
    [enrollment, submitExam]
  );

  // Handle Tab Switch Detection
  const handleTabSwitch = useCallback(() => {
    const nextCount = tabSwitchCountRef.current + 1;
    setTabSwitchCount(nextCount);
    tabSwitchCountRef.current = nextCount;

    // Immediately sync with backend
    syncProgress(answersRef.current, nextCount);

    if (nextCount >= 2) {
      // 2 strikes -> Auto submit & expel immediately
      submitExam("EXPEL");
    } else {
      setShowWarningModal(true);
    }
  }, [syncProgress, submitExam]);

  // Initial load
  useEffect(() => {
    let isMounted = true;

    async function loadQuizSession() {
      try {
        const res = await fetch(
          `/api/quiz/session?enrollment=${encodeURIComponent(enrollmentQuery)}`
        );
        const data = await res.json();

        if (!res.ok || !data.authenticated) {
          router.replace("/");
          return;
        }

        if (data.completed) {
          router.replace(`/result?enrollment=${encodeURIComponent(data.enrollmentNumber)}`);
          return;
        }

        if (isMounted) {
          setEnrollment(data.enrollmentNumber);
          setQuestions(data.questions || []);
          setRemainingSeconds(data.remainingSeconds || 3600);
          setTabSwitchCount(data.tabSwitchCount || 0);
          tabSwitchCountRef.current = data.tabSwitchCount || 0;
          if (data.savedAnswers) {
            setAnswers(data.savedAnswers);
            answersRef.current = data.savedAnswers;
          }
          setLoading(false);
          // Check fullscreen state
          if (!document.fullscreenElement) {
            setFullscreenModalOpen(true);
          } else {
            setIsFullscreen(true);
          }
        }
      } catch (e) {
        console.error(e);
        router.replace("/");
      }
    }

    loadQuizSession();

    return () => {
      isMounted = false;
    };
  }, [enrollmentQuery, ensureFullscreen, router]);

  // Anti-Cheat: Visibility & Focus change detection
  useEffect(() => {
    if (loading) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleTabSwitch();
      }
    };

    const handleWindowBlur = () => {
      // Small debounce to avoid momentary OS glitch
      handleTabSwitch();
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreenWarning(true);
      } else {
        setFullscreenWarning(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Prevent right click and inspect shortcuts
    const preventContextMenu = (e: MouseEvent) => e.preventDefault();
    const preventKeys = (e: KeyboardEvent) => {
      if (
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "J" || e.key === "C")) ||
        (e.ctrlKey && e.key === "u")
      ) {
        e.preventDefault();
      }
    };

    window.addEventListener("contextmenu", preventContextMenu);
    window.addEventListener("keydown", preventKeys);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      window.removeEventListener("contextmenu", preventContextMenu);
      window.removeEventListener("keydown", preventKeys);
    };
  }, [loading, handleTabSwitch]);

  // 1-Hour Timer countdown
  useEffect(() => {
    if (loading) return;

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          submitExam("TIMEOUT");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loading, submitExam]);

  // Periodic Auto-Sync Every 20 seconds
  useEffect(() => {
    if (loading) return;

    const syncInterval = setInterval(() => {
      syncProgress(answersRef.current, tabSwitchCountRef.current);
    }, 20000);

    return () => clearInterval(syncInterval);
  }, [loading, syncProgress]);

  const handleSelectOption = (optKey: string) => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;

    const updated = {
      ...answers,
      [String(currentQ.id)]: optKey,
    };
    setAnswers(updated);
    answersRef.current = updated;
    syncProgress(updated, tabSwitchCountRef.current);
  };

  const handleToggleFlag = () => {
    const currentQ = questions[currentIndex];
    if (!currentQ) return;
    setFlagged((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-mono text-slate-300">Verifying session & initializing secure test environment...</p>
      </div>
    );
  }

  const currentQ = questions[currentIndex];
  const answeredCount = Object.keys(answers).length;
  const isTimeCritical = remainingSeconds <= 300; // less than 5 minutes

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col select-none">
      {/* Top Bar for Quiz */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo and Exam info */}
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-36 bg-white rounded-sm px-1 py-0.5 overflow-hidden">
              <Image
                src="/adtu-logo.jpg"
                alt="ADTU"
                fill
                className="object-contain"
                priority
              />
            </div>
            <div className="hidden sm:block border-l border-slate-700 pl-3">
              <h2 className="text-xs font-bold text-slate-200">Engineering Psychology</h2>
              <p className="text-[10px] text-amber-400 font-medium">Self Test • 80 Questions</p>
            </div>
          </div>

          {/* Tab Switch Warning Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                tabSwitchCount === 0
                  ? "bg-slate-800 border-slate-700 text-slate-300"
                  : "bg-red-950/80 border-red-700 text-red-300 animate-pulse"
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>Tab Switches: {tabSwitchCount}/2</span>
            </div>

            {/* Timer */}
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg font-mono text-sm font-extrabold border shadow-inner ${
                isTimeCritical
                  ? "bg-rose-950/80 border-rose-600 text-rose-300 animate-pulse"
                  : "bg-slate-800 border-slate-700 text-emerald-400"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTimer(remainingSeconds)}</span>
            </div>

            {/* Submit / Finish Action */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm("Are you sure you want to log out of your session?")) {
                  fetch("/api/auth/logout", { method: "POST" }).then(() => {
                    router.replace("/");
                  });
                }
              }}
              className="text-slate-300 hover:text-white border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs px-3 h-9"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Floating Notice when fullscreen is exited */}
      {fullscreenWarning && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>You have exited Fullscreen mode! Please return to Fullscreen immediately to avoid expulsion.</span>
          </div>
          <Button
            size="sm"
            onClick={ensureFullscreen}
            className="bg-slate-900 text-white hover:bg-slate-800 text-xs h-7 px-3"
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1" /> Re-enter Fullscreen
          </Button>
        </div>
      )}

      {/* Main Workspace */}
      <div className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Question Area (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <Card className="flex-1 flex flex-col justify-between border-slate-200 shadow-sm bg-white">
            <CardContent className="p-6 sm:p-8 space-y-6 flex-1 flex flex-col">
              {/* Question Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Badge variant="default" className="bg-blue-900 font-mono text-xs">
                    Question {currentIndex + 1} of {questions.length}
                  </Badge>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {currentQ.week}
                  </Badge>
                </div>

                <button
                  onClick={handleToggleFlag}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                    flagged[currentQ.id]
                      ? "bg-amber-100 border-amber-300 text-amber-900"
                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Bookmark
                    className={`w-3.5 h-3.5 ${
                      flagged[currentQ.id] ? "fill-amber-600 text-amber-600" : ""
                    }`}
                  />
                  <span>{flagged[currentQ.id] ? "Marked for Review" : "Mark for Review"}</span>
                </button>
              </div>

              {/* Question Text */}
              <div className="text-base sm:text-lg font-semibold text-slate-900 leading-relaxed">
                {currentQ.question}
              </div>

              {/* Options */}
              <div className="space-y-3 pt-2">
                {(["A", "B", "C", "D"] as const).map((optKey) => {
                  const optText = currentQ.options[optKey];
                  const isSelected = answers[String(currentQ.id)] === optKey;

                  return (
                    <button
                      key={optKey}
                      onClick={() => handleSelectOption(optKey)}
                      className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                        isSelected
                          ? "bg-blue-50/80 border-blue-600 shadow-sm ring-1 ring-blue-600"
                          : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isSelected
                            ? "bg-blue-900 text-white"
                            : "bg-slate-100 text-slate-700 border border-slate-200"
                        }`}
                      >
                        {optKey}
                      </span>
                      <span
                        className={`text-sm sm:text-base leading-snug pt-0.5 ${
                          isSelected ? "font-semibold text-blue-950" : "text-slate-700"
                        }`}
                      >
                        {optText}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Clear Selection */}
              {answers[String(currentQ.id)] && (
                <div className="pt-1">
                  <button
                    onClick={() => {
                      const updated = { ...answers };
                      delete updated[String(currentQ.id)];
                      setAnswers(updated);
                      answersRef.current = updated;
                      syncProgress(updated, tabSwitchCountRef.current);
                    }}
                    className="text-xs text-slate-400 hover:text-rose-600 underline"
                  >
                    Clear selected option
                  </button>
                </div>
              )}
            </CardContent>

            {/* Navigation Bottom Controls */}
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between rounded-b-2xl">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
                className="gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </Button>

              <div className="text-xs font-medium text-slate-500">
                Enrollment: <span className="font-mono font-semibold text-slate-800">{enrollment}</span>
              </div>

              {currentIndex === questions.length - 1 ? (
                <Button
                  size="sm"
                  onClick={() => setShowSubmitModal(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1.5 shadow-md shadow-emerald-700/20 px-5"
                >
                  Submit Exam
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() =>
                    setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))
                  }
                  className="bg-blue-900 hover:bg-blue-800 text-white gap-1.5"
                >
                  Next <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </Card>
        </div>

        {/* Right: Question Palette & Overview (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <Card className="border-slate-200 shadow-sm bg-white">
            <CardContent className="p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b pb-2">
                Question Palette
              </h3>

              {/* Legend */}
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-blue-900 text-white text-[9px] flex items-center justify-center font-bold">
                    ✓
                  </div>
                  <span>Answered ({answeredCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300" />
                  <span>Unanswered ({questions.length - answeredCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded bg-amber-400" />
                  <span>Marked for Review ({Object.values(flagged).filter(Boolean).length})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 rounded ring-2 ring-blue-500 bg-white" />
                  <span>Current Question</span>
                </div>
              </div>

              {/* Number Grid */}
              <div className="grid grid-cols-8 sm:grid-cols-10 gap-1.5 max-h-[340px] overflow-y-auto p-1 border rounded-lg bg-slate-50/50">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex;
                  const isAnswered = Boolean(answers[String(q.id)]);
                  const isFlagged = Boolean(flagged[q.id]);

                  let btnStyle = "bg-white border-slate-200 text-slate-700 hover:bg-slate-100";
                  if (isAnswered) {
                    btnStyle = "bg-blue-900 border-blue-900 text-white font-bold";
                  }
                  if (isFlagged) {
                    btnStyle = "bg-amber-400 border-amber-500 text-amber-950 font-bold";
                  }
                  if (isCurrent) {
                    btnStyle += " ring-2 ring-offset-1 ring-blue-500 font-extrabold";
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-8 rounded text-xs font-mono border transition-all cursor-pointer flex items-center justify-center ${btnStyle}`}
                      title={`Question ${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Summary Stats */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex justify-between text-xs text-slate-600">
                  <span>Completion Rate:</span>
                  <span className="font-bold text-slate-900">
                    {Math.round((answeredCount / questions.length) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-900 h-full transition-all duration-300"
                    style={{
                      width: `${(answeredCount / questions.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal: Tab Switch Strike 1 Warning */}
      <Dialog open={showWarningModal}>
        <div className="p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 animate-bounce" />
            </div>
            <DialogTitle className="text-rose-700">
              ANTI-CHEAT WARNING: Tab Switch Detected!
            </DialogTitle>
            <DialogDescription className="text-slate-700 font-medium pt-2">
              You navigated away or switched tabs. This is <strong>Strike 1 of 2</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-2 font-medium">
            <p>
              ⚠️ <strong>ONE MORE TAB SWITCH WILL EXPEL YOU IMMEDIATELY.</strong>
            </p>
            <p>
              Your exam will be locked and automatically submitted as disqualified. Please return to fullscreen mode and keep your focus on this examination window at all times.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                setShowWarningModal(false);
                ensureFullscreen();
              }}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-bold"
            >
              I Understand, Resume Exam
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* Modal: Final Submit Confirmation */}
      <Dialog open={showSubmitModal}>
        <div className="p-6">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6 text-blue-900" />
            </div>
            <DialogTitle>Submit Examination?</DialogTitle>
            <DialogDescription>
              Are you sure you want to finish and submit your test?
            </DialogDescription>
          </DialogHeader>

          <div className="my-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-2">
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>Candidate Enrollment:</span>
              <span className="font-mono font-bold text-slate-900">{enrollment}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200">
              <span>Questions Answered:</span>
              <span className="font-bold text-blue-900">
                {answeredCount} / {questions.length}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span>Unanswered Questions:</span>
              <span className="font-bold text-rose-600">
                {questions.length - answeredCount}
              </span>
            </div>
            <p className="text-[11px] text-amber-700 font-medium pt-2">
              Note: Submissions are final. You cannot retake or re-enter after submitting.
            </p>
          </div>

          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowSubmitModal(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Return to Questions
            </Button>
            <Button
              type="button"
              onClick={() => submitExam("USER")}
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800 text-white font-bold"
            >
              {isSubmitting ? "Submitting..." : "Yes, Submit Exam"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>

      {/* Mandatory Fullscreen Activation Modal */}
      <Dialog open={fullscreenModalOpen}>
        <div className="p-6 sm:p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-center mx-auto">
            <Maximize2 className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-xl font-black text-slate-900">
              Enter Fullscreen Mode
            </h3>
            <p className="text-xs text-slate-600 max-w-sm mx-auto">
              To ensure examination integrity, this assessment must be completed in Fullscreen Mode. Please click the button below to lock in.
            </p>
          </div>
          <div className="pt-2">
            <Button
              type="button"
              size="lg"
              onClick={ensureFullscreen}
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold text-sm h-12 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" /> Activate Fullscreen & Continue
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}


export default function QuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white space-y-4">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-mono text-slate-300">Initializing test session...</p>
      </div>
    }>
      <QuizContent />
    </Suspense>
  );
}
