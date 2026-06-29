export const TOTAL_QUESTIONS = 100;
export const GAME_DURATION_SECONDS = 10 * 60;
export const LAST_QUESTION_SIGNATURE_KEY = "primaryschoolmath:last-arithmetic-signature";

export type Operator = "+" | "-";

export interface ArithmeticQuestion {
  id: string;
  left: number;
  right: number;
  operator: Operator;
  answer: number;
}

export interface PracticeSet {
  questions: ArithmeticQuestion[];
  signature: string;
}

type RandomSource = () => number;

function randomUnit(): number {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] / 2 ** 32;
  }

  return Math.random();
}

function randomInteger(min: number, max: number, random: RandomSource): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

function generateQuestion(index: number, random: RandomSource): ArithmeticQuestion {
  const operator: Operator = randomInteger(0, 1, random) === 0 ? "+" : "-";

  if (operator === "+") {
    const left = randomInteger(0, 100, random);
    const right = randomInteger(0, 100 - left, random);

    return {
      id: `${index}-${left}+${right}`,
      left,
      right,
      operator,
      answer: left + right,
    };
  }

  const left = randomInteger(0, 100, random);
  const right = randomInteger(0, left, random);

  return {
    id: `${index}-${left}-${right}`,
    left,
    right,
    operator,
    answer: left - right,
  };
}

function createSignature(questions: ArithmeticQuestion[]): string {
  return questions.map((question) => question.id).join("|");
}

export function generatePracticeSet(
  totalQuestions = TOTAL_QUESTIONS,
  previousSignature?: string | null,
  random: RandomSource = randomUnit,
): PracticeSet {
  let latest: PracticeSet | null = null;

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const questions = Array.from({ length: totalQuestions }, (_, index) =>
      generateQuestion(index, random),
    );
    latest = { questions, signature: createSignature(questions) };

    if (latest.signature !== previousSignature) {
      return latest;
    }
  }

  if (!latest) {
    return { questions: [], signature: "" };
  }

  const [firstQuestion, ...rest] = latest.questions;
  if (!firstQuestion) {
    return latest;
  }

  const replacement =
    firstQuestion.operator === "+"
      ? generateQuestion(0, () => 0.99)
      : generateQuestion(0, () => 0.01);
  const questions = [replacement, ...rest];

  return { questions, signature: createSignature(questions) };
}

export function calculateScore(
  questions: ArithmeticQuestion[],
  answers: Array<number | null>,
): number {
  return questions.reduce((score, question, index) => {
    return answers[index] === question.answer ? score + 1 : score;
  }, 0);
}

export function countAnsweredQuestions(answers: Array<number | null>): number {
  return answers.filter((answer) => answer !== null).length;
}

export function formatDuration(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function normalizePlayerId(playerId: string): string {
  return playerId.trim().slice(0, 24);
}

export function isAnswerInputValid(value: string): boolean {
  if (!/^\d{1,3}$/.test(value.trim())) {
    return false;
  }

  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 0 && numericValue <= 100;
}
