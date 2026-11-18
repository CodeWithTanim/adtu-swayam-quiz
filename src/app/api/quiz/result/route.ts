import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { QuizSubmission } from "@/models/QuizSubmission";
import { normalizeEnrollment } from "@/lib/utils";
import { ALL_QUESTIONS } from "@/lib/quizData";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const enrollmentQuery = url.searchParams.get("enrollment");
    const cookieEnrollment = req.cookies.get("adtu_enrollment")?.value;
    const rawEnrollment = enrollmentQuery || cookieEnrollment;

    if (!rawEnrollment) {
      return NextResponse.json(
        { error: "Enrollment number is required." },
        { status: 400 }
      );
    }

    const enrollment = normalizeEnrollment(rawEnrollment);
    await connectToDatabase();

    // Find the latest completed/submitted submission for this candidate
    const submission = await QuizSubmission.findOne({
      enrollmentNumber: enrollment,
      status: { $in: ["COMPLETED", "EXPELLED", "EXPIRED"] },
    }).sort({ createdAt: -1 });

    if (!submission) {
      // Check if an IN_PROGRESS session exists
      const inProgress = await QuizSubmission.findOne({
        enrollmentNumber: enrollment,
        status: "IN_PROGRESS",
      });
      if (inProgress) {
        return NextResponse.json(
          { error: "Exam is currently in progress." },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: "No submission record found for this enrollment number." },
        { status: 404 }
      );
    }

    const savedAnswers = Object.fromEntries(submission.answers || []);
    const questionMap = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));

    // Construct detailed review list in order of assigned questions
    const detailedQuestions = submission.questionOrder.map((qId: number) => {
      const q = questionMap.get(qId)!;
      const userAnswer = savedAnswers[String(qId)] || null;
      const isCorrect = userAnswer === q.correctAnswer;
      const isAttempted = Boolean(userAnswer);

      return {
        id: q.id,
        week: q.week,
        questionNumber: q.questionNumber,
        question: q.question,
        options: q.options,
        userAnswer,
        correctAnswer: q.correctAnswer,
        isCorrect,
        isAttempted,
        explanation: q.explanation,
      };
    });

    const totalAssigned = submission.questionOrder.length;
    const correctCount = detailedQuestions.filter((q: any) => q.isCorrect).length;
    const incorrectCount = detailedQuestions.filter(
      (q: any) => q.isAttempted && !q.isCorrect
    ).length;
    const unattemptedCount = detailedQuestions.filter((q: any) => !q.isAttempted).length;

    return NextResponse.json({
      enrollmentNumber: submission.enrollmentNumber,
      status: submission.status,
      startedAt: submission.startedAt,
      submittedAt: submission.submittedAt,
      tabSwitchCount: submission.tabSwitchCount,
      expelReason: submission.expelReason,
      score: correctCount,
      totalQuestions: totalAssigned,
      percentage: Number(((correctCount / totalAssigned) * 100).toFixed(2)),
      correctCount,
      incorrectCount,
      unattemptedCount,
      detailedQuestions,
    });
  } catch (error: any) {
    console.error("Result fetch error:", error);
    return NextResponse.json(
      { error: "Internal server error fetching results." },
      { status: 500 }
    );
  }
}
