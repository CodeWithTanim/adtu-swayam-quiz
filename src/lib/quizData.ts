import rawQuestions from "./questions.json";

export interface QuestionData {
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
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
}

export const ALL_QUESTIONS: QuestionData[] = rawQuestions as QuestionData[];

export function getQuestionById(id: number): QuestionData | undefined {
  return ALL_QUESTIONS.find((q) => q.id === id);
}

// Client-safe version without correct answers and explanations
export interface ClientQuestion {
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

export function sanitizeQuestions(questions: QuestionData[]): ClientQuestion[] {
  return questions.map(({ id, week, questionNumber, question, options }) => ({
    id,
    week,
    questionNumber,
    question,
    options,
  }));
}
