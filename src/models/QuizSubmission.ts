import mongoose, { Schema, Document } from "mongoose";

export interface IQuizSubmission extends Document {
  enrollmentNumber: string;
  startedAt: Date;
  submittedAt?: Date;
  status: "IN_PROGRESS" | "COMPLETED" | "EXPELLED" | "EXPIRED";
  tabSwitchCount: number;
  score: number;
  totalQuestions: number;
  answers: Record<string, string>; // questionId -> selectedOption ("A", "B", "C", "D")
  questionOrder: number[]; // order of question IDs assigned to this student
  expelReason?: string;
}

const QuizSubmissionSchema = new Schema<IQuizSubmission>(
  {
    enrollmentNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      uppercase: true,
    },
    startedAt: {
      type: Date,
      default: Date.now,
    },
    submittedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["IN_PROGRESS", "COMPLETED", "EXPELLED", "EXPIRED"],
      default: "IN_PROGRESS",
    },
    tabSwitchCount: {
      type: Number,
      default: 0,
    },
    score: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 80,
    },
    answers: {
      type: Map,
      of: String,
      default: {},
    },
    questionOrder: {
      type: [Number],
      default: [],
    },
    expelReason: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export const QuizSubmission =
  mongoose.models.QuizSubmission ||
  mongoose.model<IQuizSubmission>("QuizSubmission", QuizSubmissionSchema);
