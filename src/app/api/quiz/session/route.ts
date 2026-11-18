import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { QuizSubmission } from "@/models/QuizSubmission";
import { normalizeEnrollment } from "@/lib/utils";
import { ALL_QUESTIONS, sanitizeQuestions } from "@/lib/quizData";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const enrollmentQuery = url.searchParams.get("enrollment");
    const cookieEnrollment = req.cookies.get("adtu_enrollment")?.value;
    const rawEnrollment = enrollmentQuery || cookieEnrollment;

    if (!rawEnrollment) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const enrollment = normalizeEnrollment(rawEnrollment);
    await connectToDatabase();

    const submission = await QuizSubmission.findOne({
      enrollmentNumber: enrollment,
    });

    if (!submission) {
      return NextResponse.json({ authenticated: false }, { status: 404 });
    }

    if (submission.status !== "IN_PROGRESS") {
      return NextResponse.json({
        authenticated: true,
        completed: true,
        status: submission.status,
        score: submission.score,
        totalQuestions: submission.totalQuestions,
        expelReason: submission.expelReason,
        enrollmentNumber: enrollment,
      });
    }

    const now = new Date();
    const elapsedSeconds = Math.floor(
      (now.getTime() - new Date(submission.startedAt).getTime()) / 1000
    );
    const remainingSeconds = Math.max(0, 3600 - elapsedSeconds);

    if (remainingSeconds <= 0) {
      submission.status = "EXPIRED";
      submission.submittedAt = now;
      await submission.save();

      return NextResponse.json({
        authenticated: true,
        completed: true,
        status: "EXPIRED",
        enrollmentNumber: enrollment,
      });
    }

    const qMap = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));
    const orderedQuestions = submission.questionOrder
      .map((id: number) => qMap.get(id))
      .filter(Boolean);

    return NextResponse.json({
      authenticated: true,
      completed: false,
      enrollmentNumber: enrollment,
      startedAt: submission.startedAt,
      remainingSeconds,
      tabSwitchCount: submission.tabSwitchCount || 0,
      savedAnswers: Object.fromEntries(submission.answers || []),
      questions: sanitizeQuestions(orderedQuestions as any),
    });
  } catch (error: any) {
    console.error("Session error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching quiz session." },
      { status: 500 }
    );
  }
}
