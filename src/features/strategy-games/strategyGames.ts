export const STRATEGY_GAME_KEYS = [
  "make-ten-strategy",
  "break-ten-strategy",
  "balance-ten-strategy",
] as const;

export type StrategyGameKey = (typeof STRATEGY_GAME_KEYS)[number];

export const STRATEGY_GAME_TOTAL_QUESTIONS = 12;
export const STRATEGY_GAME_DURATION_SECONDS = 4 * 60;

type RandomSource = () => number;

export interface MakeTenStrategyQuestion {
  kind: "make-ten-strategy";
  id: string;
  left: number;
  right: number;
  bridgeToTen: number;
  remaining: number;
  answer: number;
}

export interface BreakTenStrategyQuestion {
  kind: "break-ten-strategy";
  id: string;
  left: number;
  right: number;
  toTen: number;
  remaining: number;
  answer: number;
}

export interface BalanceTenStrategyQuestion {
  kind: "balance-ten-strategy";
  id: string;
  left: number;
  right: 8 | 9;
  compensation: number;
  answer: number;
}

export type StrategyQuestion =
  | MakeTenStrategyQuestion
  | BreakTenStrategyQuestion
  | BalanceTenStrategyQuestion;

export interface MakeTenStrategyAnswer {
  bridgeToTen: string;
  remaining: string;
  result: string;
}

export interface BreakTenStrategyAnswer {
  toTen: string;
  remaining: string;
  result: string;
}

export interface BalanceTenStrategyAnswer {
  compensation: string;
  result: string;
}

export type StrategyAnswer =
  | MakeTenStrategyAnswer
  | BreakTenStrategyAnswer
  | BalanceTenStrategyAnswer;

export interface StrategyGameSet {
  gameKey: StrategyGameKey;
  questions: StrategyQuestion[];
  signature: string;
}

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

function normalizeNumberInput(value: string): number | null {
  const normalized = value.trim();

  if (!/^\d+$/.test(normalized)) {
    return null;
  }

  return Number(normalized);
}

export function isStrategyGameKey(value: string): value is StrategyGameKey {
  return STRATEGY_GAME_KEYS.includes(value as StrategyGameKey);
}

export function generateMakeTenStrategyQuestion(
  index: number,
  random: RandomSource = randomUnit,
): MakeTenStrategyQuestion {
  const left = randomInteger(6, 9, random);
  const bridgeToTen = 10 - left;
  const right = randomInteger(bridgeToTen + 1, 9, random);
  const remaining = right - bridgeToTen;

  return {
    kind: "make-ten-strategy",
    id: `${index}-${left}+${right}`,
    left,
    right,
    bridgeToTen,
    remaining,
    answer: left + right,
  };
}

export function generateBreakTenStrategyQuestion(
  index: number,
  random: RandomSource = randomUnit,
): BreakTenStrategyQuestion {
  const left = randomInteger(11, 18, random);
  const toTen = left - 10;
  const right = randomInteger(toTen + 1, 9, random);
  const remaining = right - toTen;

  return {
    kind: "break-ten-strategy",
    id: `${index}-${left}-${right}`,
    left,
    right,
    toTen,
    remaining,
    answer: left - right,
  };
}

export function generateBalanceTenStrategyQuestion(
  index: number,
  random: RandomSource = randomUnit,
): BalanceTenStrategyQuestion {
  const left = randomInteger(11, 18, random);
  const right = randomInteger(8, 9, random) as 8 | 9;

  return {
    kind: "balance-ten-strategy",
    id: `${index}-${left}-${right}-balance`,
    left,
    right,
    compensation: 10 - right,
    answer: left - right,
  };
}

export function isMakeTenStrategyAnswerCorrect(
  question: MakeTenStrategyQuestion,
  answer: MakeTenStrategyAnswer,
): boolean {
  return (
    normalizeNumberInput(answer.bridgeToTen) === question.bridgeToTen &&
    normalizeNumberInput(answer.remaining) === question.remaining &&
    normalizeNumberInput(answer.result) === question.answer
  );
}

export function isBreakTenStrategyAnswerCorrect(
  question: BreakTenStrategyQuestion,
  answer: BreakTenStrategyAnswer,
): boolean {
  return (
    normalizeNumberInput(answer.toTen) === question.toTen &&
    normalizeNumberInput(answer.remaining) === question.remaining &&
    normalizeNumberInput(answer.result) === question.answer
  );
}

export function isBalanceTenStrategyAnswerCorrect(
  question: BalanceTenStrategyQuestion,
  answer: BalanceTenStrategyAnswer,
): boolean {
  return (
    normalizeNumberInput(answer.compensation) === question.compensation &&
    normalizeNumberInput(answer.result) === question.answer
  );
}

export function isStrategyAnswerCorrect(
  question: StrategyQuestion,
  answer: StrategyAnswer,
): boolean {
  if (question.kind === "make-ten-strategy") {
    return isMakeTenStrategyAnswerCorrect(question, answer as MakeTenStrategyAnswer);
  }

  if (question.kind === "break-ten-strategy") {
    return isBreakTenStrategyAnswerCorrect(question, answer as BreakTenStrategyAnswer);
  }

  return isBalanceTenStrategyAnswerCorrect(question, answer as BalanceTenStrategyAnswer);
}

function createSignature(questions: StrategyQuestion[]): string {
  return questions.map((question) => question.id).join("|");
}

export function generateStrategyGameSet(
  gameKey: StrategyGameKey,
  totalQuestions = STRATEGY_GAME_TOTAL_QUESTIONS,
  random: RandomSource = randomUnit,
): StrategyGameSet {
  const questions = Array.from({ length: totalQuestions }, (_, index): StrategyQuestion => {
    if (gameKey === "make-ten-strategy") {
      return generateMakeTenStrategyQuestion(index, random);
    }

    if (gameKey === "break-ten-strategy") {
      return generateBreakTenStrategyQuestion(index, random);
    }

    return generateBalanceTenStrategyQuestion(index, random);
  });

  return {
    gameKey,
    questions,
    signature: createSignature(questions),
  };
}
