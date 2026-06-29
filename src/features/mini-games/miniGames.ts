export const MINI_GAME_TOTAL_QUESTIONS = 20;
export const MINI_GAME_DURATION_SECONDS = 3 * 60;

export type MiniGameKey = "make-ten" | "place-value" | "compare";
export type CompareChoice = ">" | "<" | "=";

type RandomSource = () => number;

export interface MakeTenQuestion {
  kind: "make-ten";
  id: string;
  numbers: number[];
  answerIndexes: [number, number];
}

export interface PlaceValueQuestion {
  kind: "place-value";
  id: string;
  target: number;
  tens: number;
  ones: number;
}

export interface CompareExpression {
  text: string;
  value: number;
}

export interface CompareQuestion {
  kind: "compare";
  id: string;
  left: CompareExpression;
  right: CompareExpression;
  answer: CompareChoice;
}

export type MiniGameQuestion = MakeTenQuestion | PlaceValueQuestion | CompareQuestion;

export interface MiniGameSet {
  gameKey: MiniGameKey;
  questions: MiniGameQuestion[];
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

function shuffle<T>(items: T[], random: RandomSource): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const targetIndex = randomInteger(0, index, random);
    [shuffled[index], shuffled[targetIndex]] = [shuffled[targetIndex], shuffled[index]];
  }

  return shuffled;
}

export function countPairsWithSum(numbers: number[], target: number): number {
  let count = 0;

  for (let left = 0; left < numbers.length; left += 1) {
    for (let right = left + 1; right < numbers.length; right += 1) {
      if (numbers[left] + numbers[right] === target) {
        count += 1;
      }
    }
  }

  return count;
}

function findPairWithSum(numbers: number[], target: number): [number, number] {
  for (let left = 0; left < numbers.length; left += 1) {
    for (let right = left + 1; right < numbers.length; right += 1) {
      if (numbers[left] + numbers[right] === target) {
        return [left, right];
      }
    }
  }

  return [0, 1];
}

export function generateMakeTenQuestion(
  index: number,
  random: RandomSource = randomUnit,
): MakeTenQuestion {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const first = randomInteger(0, 10, random);
    const numbers = [first, 10 - first];

    while (numbers.length < 6) {
      const candidates = Array.from({ length: 11 }, (_, value) => value).filter(
        (candidate) => countPairsWithSum([...numbers, candidate], 10) === 1,
      );

      if (candidates.length === 0) {
        break;
      }

      numbers.push(candidates[randomInteger(0, candidates.length - 1, random)]);
    }

    if (numbers.length === 6) {
      const shuffled = shuffle(numbers, random);
      if (countPairsWithSum(shuffled, 10) === 1) {
        return {
          kind: "make-ten",
          id: `${index}-${shuffled.join("-")}`,
          numbers: shuffled,
          answerIndexes: findPairWithSum(shuffled, 10),
        };
      }
    }
  }

  const fallback = [1, 9, 0, 2, 3, 4];
  return {
    kind: "make-ten",
    id: `${index}-${fallback.join("-")}`,
    numbers: fallback,
    answerIndexes: [0, 1],
  };
}

export function isMakeTenSelectionCorrect(
  question: MakeTenQuestion,
  selectedIndexes: number[],
): boolean {
  if (selectedIndexes.length !== 2) {
    return false;
  }

  const [left, right] = selectedIndexes;
  return question.numbers[left] + question.numbers[right] === 10;
}

export function generatePlaceValueQuestion(
  index: number,
  random: RandomSource = randomUnit,
): PlaceValueQuestion {
  const target = randomInteger(0, 100, random);

  return {
    kind: "place-value",
    id: `${index}-${target}`,
    target,
    tens: Math.floor(target / 10),
    ones: target % 10,
  };
}

export function isPlaceValueAnswerCorrect(
  question: PlaceValueQuestion,
  tens: number,
  ones: number,
): boolean {
  return tens === question.tens && ones === question.ones;
}

function makeExpressionForValue(value: number, random: RandomSource): CompareExpression {
  const expressionType = randomInteger(0, 2, random);

  if (expressionType === 0) {
    return { text: `${value}`, value };
  }

  if (expressionType === 1) {
    const left = randomInteger(0, value, random);
    return { text: `${left} + ${value - left}`, value };
  }

  const left = randomInteger(value, 100, random);
  return { text: `${left} - ${left - value}`, value };
}

function compareValues(left: number, right: number): CompareChoice {
  if (left > right) {
    return ">";
  }

  if (left < right) {
    return "<";
  }

  return "=";
}

export function generateCompareQuestion(
  index: number,
  random: RandomSource = randomUnit,
): CompareQuestion {
  const shouldBeEqual = randomInteger(0, 3, random) === 0;
  const leftValue = randomInteger(0, 100, random);
  let rightValue = shouldBeEqual ? leftValue : randomInteger(0, 100, random);

  while (!shouldBeEqual && rightValue === leftValue) {
    rightValue = randomInteger(0, 100, random);
  }

  return {
    kind: "compare",
    id: `${index}-${leftValue}-${rightValue}`,
    left: makeExpressionForValue(leftValue, random),
    right: makeExpressionForValue(rightValue, random),
    answer: compareValues(leftValue, rightValue),
  };
}

export function isCompareChoiceCorrect(question: CompareQuestion, choice: CompareChoice): boolean {
  return choice === question.answer;
}

function createSignature(questions: MiniGameQuestion[]): string {
  return questions.map((question) => question.id).join("|");
}

export function generateMiniGameSet(
  gameKey: MiniGameKey,
  totalQuestions = MINI_GAME_TOTAL_QUESTIONS,
  random: RandomSource = randomUnit,
): MiniGameSet {
  const questions = Array.from({ length: totalQuestions }, (_, index) => {
    if (gameKey === "make-ten") {
      return generateMakeTenQuestion(index, random);
    }

    if (gameKey === "place-value") {
      return generatePlaceValueQuestion(index, random);
    }

    return generateCompareQuestion(index, random);
  });

  return {
    gameKey,
    questions,
    signature: createSignature(questions),
  };
}
