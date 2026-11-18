import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { QuizSubmission } from "@/models/QuizSubmission";
import { normalizeEnrollment } from "@/lib/utils";
import { ALL_QUESTIONS } from "@/lib/quizData";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { enrollmentNumber, answers, tabSwitchCount, action } = body;

    const cookieEnrollment = req.cookies.get("adtu_enrollment")?.value;
    const rawEnrollment = enrollmentNumber || cookieEnrollment;

    if (!rawEnrollment) {
      return NextResponse.json(
        { error: "Missing enrollment number." },
        { status: 400 }
      );
    }

    const enrollment = normalizeEnrollment(rawEnrollment);
    await connectToDatabase();

    const submission = await QuizSubmission.findOne({
      enrollmentNumber: enrollment,
    });

    if (!submission) {
      return NextResponse.json(
        { error: "Quiz session not found." },
        { status: 404 }
      );
    }

    if (submission.status !== "IN_PROGRESS") {
      return NextResponse.json(
        {
          error: "Exam has already been submitted or concluded.",
          status: submission.status,
        },
        { status: 400 }
      );
    }

    // Auto-save sync action (saves progress while user is taking the exam)
    if (action === "SYNC") {
      if (typeof tabSwitchCount === "number") {
        submission.tabSwitchCount = tabSwitchCount;
      }
      if (answers && typeof answers === "object") {
        submission.answers = new Map(Object.entries(answers));
      }

      // Check if tab switch limit reached (>= 2)
      if (submission.tabSwitchCount >= 2) {
        submission.status = "EXPELLED";
        submission.expelReason =
          "Candidate was disqualified and auto-submitted due to repeated tab switching (maximum 2 tab switches exceeded).";
        submission.submittedAt = new Date();
      }

      await submission.save();

      return NextResponse.json({
        success: true,
        status: submission.status,
        tabSwitchCount: submission.tabSwitchCount,
      });
    }

    // Submit or Expel
    const submittedAnswers: Record<string, string> = answers || {};
    let correctCount = 0;
    const questionMap = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));

    // Grade each question that was in the candidate's questionOrder
    for (const qId of submission.questionOrder) {
      const userOption = submittedAnswers[String(qId)];
      const question = questionMap.get(qId);
      if (question && question.correctAnswer === userOption) {
        correctCount++;
      }
    }

    const isExpelled =
      action === "EXPEL" || (tabSwitchCount !== undefined && tabSwitchCount >= 2);

    submission.submittedAt = new Date();
    submission.tabSwitchCount = tabSwitchCount ?? submission.tabSwitchCount;
    submission.answers = new Map(Object.entries(submittedAnswers));
    submission.score = correctCount;
    submission.totalQuestions = submission.questionOrder.length;

    if (isExpelled) {
      submission.status = "EXPELLED";
      submission.expelReason =
        "Candidate disqualified and auto-submitted for exceeding the 2 tab switch limit.";
    } else {
      submission.status = "COMPLETED";
    }

    await submission.save();

    return NextResponse.json({
      success: true,
      status: submission.status,
      score: correctCount,
      totalQuestions: submission.questionOrder.length,
      expelReason: submission.expelReason,
    });
  } catch (error: any) {
    console.error("Submit error:", error);
    return NextResponse.json(
      { error: "Internal server error submitting the exam." },
      { status: 500 }
    );
  }
}
