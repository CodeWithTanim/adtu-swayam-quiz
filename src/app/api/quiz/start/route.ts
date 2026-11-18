import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { QuizSubmission } from "@/models/QuizSubmission";
import { validateEnrollment, normalizeEnrollment, shuffleArrayWithSeed } from "@/lib/utils";
import { ALL_QUESTIONS, sanitizeQuestions } from "@/lib/quizData";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEnrollment = body.enrollmentNumber;

    if (!rawEnrollment || !validateEnrollment(rawEnrollment)) {
      return NextResponse.json(
        {
          error:
            "Invalid Enrollment Number format. Use ADTU/0/2023-27/BTCS/XXX, ADTU/1/2023-27/BTCS/XXX, ADTU/L/0/2023-27/BTCS/XXX (000-300), or 'TEST'.",
        },
        { status: 400 }
      );
    }

    const enrollment = normalizeEnrollment(rawEnrollment);
    await connectToDatabase();

    const isTestAccount = enrollment === "TEST";

    // For test account: if user wants to test multiple times, delete old TEST run
    if (isTestAccount) {
      await QuizSubmission.deleteMany({ enrollmentNumber: "TEST" });
    }

    const existingSubmission = await QuizSubmission.findOne({
      enrollmentNumber: enrollment,
    });

    if (existingSubmission && !isTestAccount) {
      if (existingSubmission.status !== "IN_PROGRESS") {
        return NextResponse.json(
          {
            error:
              "You have already attempted or completed this exam. Retakes are not permitted.",
            status: existingSubmission.status,
            completed: true,
          },
          { status: 403 }
        );
      }

      // Check if time expired (1 hour = 3600 seconds)
      const now = new Date();
      const elapsedSeconds = Math.floor(
        (now.getTime() - new Date(existingSubmission.startedAt).getTime()) / 1000
      );
      const remainingSeconds = Math.max(0, 3600 - elapsedSeconds);

      if (remainingSeconds <= 0) {
        existingSubmission.status = "EXPIRED";
        existingSubmission.submittedAt = now;
        await existingSubmission.save();
        return NextResponse.json(
          {
            error: "Exam duration (1 hour) has expired.",
            status: "EXPIRED",
            completed: true,
          },
          { status: 403 }
        );
      }

      const qMap = new Map(ALL_QUESTIONS.map((q) => [q.id, q]));
      const orderedQuestions = existingSubmission.questionOrder
        .map((id: number) => qMap.get(id))
        .filter(Boolean);

      const response = NextResponse.json({
        success: true,
        isResumed: true,
        enrollmentNumber: enrollment,
        startedAt: existingSubmission.startedAt,
        remainingSeconds,
        tabSwitchCount: existingSubmission.tabSwitchCount || 0,
        savedAnswers: Object.fromEntries(existingSubmission.answers || []),
        questions: sanitizeQuestions(orderedQuestions as any),
      });

      response.cookies.set("adtu_enrollment", enrollment, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 3600 * 24,
      });

      return response;
    }

    // New Attempt:
    // If TEST account, pick 5 questions (e.g. first 5 after shuffle)
    let questionsPool = ALL_QUESTIONS;
    const shuffledQuestions = shuffleArrayWithSeed(questionsPool, enrollment);
    const assignedQuestions = isTestAccount
      ? shuffledQuestions.slice(0, 5)
      : shuffledQuestions;

    const questionOrder = assignedQuestions.map((q) => q.id);

    const newSubmission = await QuizSubmission.create({
      enrollmentNumber: enrollment,
      startedAt: new Date(),
      status: "IN_PROGRESS",
      tabSwitchCount: 0,
      totalQuestions: assignedQuestions.length,
      questionOrder,
      answers: {},
    });

    const response = NextResponse.json({
      success: true,
      isResumed: false,
      enrollmentNumber: enrollment,
      startedAt: newSubmission.startedAt,
      remainingSeconds: 3600,
      tabSwitchCount: 0,
      savedAnswers: {},
      questions: sanitizeQuestions(assignedQuestions),
    });

    response.cookies.set("adtu_enrollment", enrollment, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 3600 * 24,
    });

    return response;
  } catch (error: any) {
    console.error("Start quiz error:", error);
    return NextResponse.json(
      { error: "Internal server error occurred while starting the exam." },
      { status: 500 }
    );
  }
}
