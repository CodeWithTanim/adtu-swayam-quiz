"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  ShieldAlert,
  Clock,
  Shuffle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Terminal,
  Award,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { validateEnrollment, normalizeEnrollment } from "@/lib/utils";

export default function HomePage() {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState("");
  const [formatError, setFormatError] = useState("");
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);
  const [rulesAcknowledged, setRulesAcknowledged] = useState(false);

  const handleInitialProceed = (e: React.FormEvent) => {
    e.preventDefault();
    setFormatError("");
    setServerError("");

    if (!enrollment.trim()) {
      setFormatError("Please enter your Enrollment Number.");
      return;
    }

    if (!validateEnrollment(enrollment)) {
      setFormatError(
        "Invalid format. Enter ADTU/0/2023-27/BTCS/XXX, ADTU/1/2023-27/BTCS/XXX, or ADTU/L/0/2023-27/BTCS/XXX (000-300)."
      );
      return;
    }

    setShowWarningModal(true);
  };

  const handleStartExam = async () => {
    if (!rulesAcknowledged) return;

    setIsLoading(true);
    setServerError("");

    try {
      const normalized = normalizeEnrollment(enrollment);
      const res = await fetch("/api/quiz/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentNumber: normalized }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.completed) {
          router.push(`/result?enrollment=${encodeURIComponent(normalized)}`);
          return;
        }
        setServerError(data.error || "Could not begin exam. Please try again.");
        setShowWarningModal(false);
        setIsLoading(false);
        return;
      }

      try {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen error:", err);
      }

      router.push(`/quiz?enrollment=${encodeURIComponent(normalized)}`);
    } catch (err: any) {
      setServerError("Network error or connection issue. Please try again.");
      setShowWarningModal(false);
      setIsLoading(false);
    }
  };

  const isTest = enrollment.trim().toUpperCase() === "TEST";

  return (
    <div className="min-h-screen bg-[#fafbfc] text-slate-900 flex flex-col justify-between selection:bg-blue-900 selection:text-white font-sans antialiased">
      {/* Minimal Top Notice Bar */}
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-center text-xs text-amber-900 font-medium flex items-center justify-center gap-2">
        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
        <span>
          <strong>Notice:</strong> This is a <strong>self-test assessment</strong> designed for revision and practice. Nothing more than this.
        </span>
      </div>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center justify-center">
        {/* Clean Brand Header */}
        <div className="flex flex-col items-center text-center space-y-4 mb-10 max-w-2xl">
          <div className="p-3 bg-white rounded-2xl shadow-xs border border-slate-200/80 hover:shadow-sm transition-shadow">
            <div className="relative h-14 w-60 sm:w-72">
              <Image
                src="/adtu-logo.jpg"
                alt="Assam Down Town University"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              SWAYAM 7th Sem Assessment Portal
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight">
              Engineering Psychology
            </h1>
            <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">
              Official 8-Week Self-Test Examination. Randomized questions, proctored environment, and instant solutions.
            </p>
          </div>
        </div>

        {/* Minimalist Interactive Card */}
        <div className="w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/50 border border-slate-200/80 relative overflow-hidden backdrop-blur">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-900 via-indigo-600 to-amber-500" />

          <form onSubmit={handleInitialProceed} className="space-y-5">
            <div>
              <div className="mb-2">
                <label
                  htmlFor="enrollment"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Candidate Enrollment Number
                </label>
              </div>

              <div className="relative">
                <input
                  id="enrollment"
                  type="text"
                  value={enrollment}
                  onChange={(e) => {
                    setEnrollment(e.target.value);
                    if (formatError) setFormatError("");
                    if (serverError) setServerError("");
                  }}
                  placeholder="e.g. ADTU/0/2023-27/BTCS/042"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder-slate-400 font-mono text-sm tracking-wide uppercase transition-all focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent shadow-xs"
                  autoComplete="off"
                  required
                />
              </div>

              {formatError && (
                <p className="mt-2 text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 p-2.5 rounded-lg flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{formatError}</span>
                </p>
              )}

              {serverError && (
                <p className="mt-2 text-xs text-rose-600 font-medium bg-rose-50 border border-rose-200 p-2.5 rounded-lg flex items-start gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{serverError}</span>
                </p>
              )}
            </div>

            {/* Quick Rules Summary */}
            <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2 text-xs text-slate-600">
              <div className="flex items-center gap-1.5 font-bold text-slate-900">
                <ShieldAlert className="w-4 h-4 text-blue-900" />
                Key Examination Guidelines
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-400" /> 60-Minute Timer
                </div>
                <div className="flex items-center gap-1.5 text-slate-700">
                  <Shuffle className="w-3.5 h-3.5 text-slate-400" /> Shuffled Questions
                </div>
                <div className="flex items-center gap-1.5 text-rose-700 font-semibold col-span-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> 2 Tab Switches = Immediate Auto-Expel
                </div>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full bg-blue-900 hover:bg-blue-800 text-white font-bold h-12 rounded-xl text-sm shadow-md shadow-blue-900/15 flex items-center justify-center gap-2 group transition-all"
            >
              Start Exam
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </form>
        </div>

        {/* Minimal Feature Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 w-full max-w-3xl">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-5 h-5 text-blue-900" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Proctored Session</h4>
              <p className="text-[11px] text-slate-500">Auto-detects tab switching</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Instant Explanations</h4>
              <p className="text-[11px] text-slate-500">Detailed solutions from PDF</p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-slate-900">Instant Scorecard</h4>
              <p className="text-[11px] text-slate-500">Accurate grading & review</p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t border-slate-200/80 text-center text-xs text-slate-400 bg-white">
        © {new Date().getFullYear()} Assam Down Town University • SWAYAM NPTEL Assessment Portal
      </footer>

      {/* Modern Rules & Anti-Cheat Dialog */}
      <Dialog open={showWarningModal}>
        <div className="p-6 sm:p-8">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mb-3 text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-black text-slate-900">
              Anti-Cheat Rules & Examination Guidelines
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Please review these critical conditions before opening the examination environment.
            </DialogDescription>
          </DialogHeader>

          <div className="my-5 space-y-3 text-xs text-slate-700 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-start gap-2.5 text-rose-700 font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-600 mt-1.5 shrink-0" />
              <span>
                <strong>STRICT TAB SWITCH DETECTION:</strong> Navigating away, switching tabs, minimizing your browser, or opening developer tools triggers an anti-cheat strike. <strong>2 tab switches will immediately lock and expel your session with an auto-submit.</strong>
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>
                <strong>FULLSCREEN REQUIREMENT:</strong> The examination will launch in fullscreen. Exiting fullscreen mode is treated as an active tab-switch.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>
                <strong>SINGLE ATTEMPT RESTRICTION:</strong> Each enrollment number (<code>{normalizeEnrollment(enrollment)}</code>) can only take the test once. No second attempts are granted.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
              <span>
                <strong>TIMER:</strong> Standard 1-Hour (60 Minutes) maximum duration.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="w-2 h-2 rounded-full bg-amber-600 mt-1.5 shrink-0" />
              <span>
                <strong>NOTICE:</strong> This is a <strong>self test</strong> portal meant for self-evaluation and academic review.
              </span>
            </div>
          </div>

          <label className="flex items-center gap-3 p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl cursor-pointer hover:bg-blue-100/50 transition-colors">
            <input
              type="checkbox"
              checked={rulesAcknowledged}
              onChange={(e) => setRulesAcknowledged(e.target.checked)}
              className="w-4 h-4 text-blue-900 rounded focus:ring-blue-800"
            />
            <span className="text-xs font-semibold text-blue-950">
              I agree to all rules, tab-switch penalties, and confirm I am taking this self test.
            </span>
          </label>

          <DialogFooter className="mt-6 flex-col-reverse sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowWarningModal(false)}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleStartExam}
              disabled={!rulesAcknowledged || isLoading}
              className="w-full sm:w-auto bg-blue-900 hover:bg-blue-800 text-white font-bold"
            >
              {isLoading ? "Preparing Session..." : "Start Exam"}
            </Button>
          </DialogFooter>
        </div>
      </Dialog>
    </div>
  );
}
