export const SUMMER_HOMEWORK_GAME_KEYS = [
  "column-arithmetic",
  "multiplication-groups",
  "times-table",
] as const;

export type SummerHomeworkGameKey = (typeof SUMMER_HOMEWORK_GAME_KEYS)[number];

export const SUMMER_HOMEWORK_GAME_TOTAL_QUESTIONS = {
  "column-arithmetic": 12,
  "multiplication-groups": 15,
  "times-table": 24,
} satisfies Record<SummerHomeworkGameKey, number>;

export const SUMMER_HOMEWORK_GAME_DURATION_SECONDS = {
  "column-arithmetic": 8 * 60,
  "multiplication-groups": 5 * 60,
  "times-table": 4 * 60,
} satisfies Record<SummerHomeworkGameKey, number>;

export type ColumnOperator = "+" | "-";
export type ColumnArithmeticPattern =
  | "addition-carry"
  | "addition-no-carry"
  | "subtraction-borrow"
  | "subtraction-no-borrow";
export type MultiplicationGroupsMode = "addition" | "multiplication" | "product";
export type TimesTableMode = "product" | "missing-factor" | "phrase";

type RandomSource = () => number;

export interface ColumnArithmeticQuestion {
  kind: "column-arithmetic";
  id: string;
  left: number;
  right: number;
  operator: ColumnOperator;
  answer: number;
  pattern: ColumnArithmeticPattern;
  requiresRegroup: boolean;
}

export interface ColumnArithmeticAnswer {
  leftTens: string;
  leftOnes: string;
  operator: ColumnOperator | "";
  rightTens: string;
  rightOnes: string;
  regroup: string;
  resultHundreds: string;
  resultTens: string;
  resultOnes: string;
}

export interface MultiplicationGroupsQuestion {
  kind: "multiplication-groups";
  id: string;
  mode: MultiplicationGroupsMode;
  groups: number;
  perGroup: number;
  product: number;
  repeatedAddition: string;
  multiplicationExpression: string;
  prompt: string;
  options: string[];
  answer: string;
}

export interface TimesTableQuestion {
  kind: "times-table";
  id: string;
  mode: TimesTableMode;
  left: number;
  right: number;
  product: number;
  prompt: string;
  options: string[];
  answer: string;
}

export type SummerHomeworkQuestion =
  | ColumnArithmeticQuestion
  | MultiplicationGroupsQuestion
  | TimesTableQuestion;

export interface SummerHomeworkSet {
  gameKey: SummerHomeworkGameKey;
  questions: SummerHomeworkQuestion[];
  signature: string;
}

const COLUMN_PATTERNS: ColumnArithmeticPattern[] = [
  "addition-carry",
  "addition-no-carry",
  "subtraction-borrow",
  "subtraction-no-borrow",
];

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

function hasAdditionRegroup(left: number, right: number): boolean {
  const onesCarry = (left % 10) + (right % 10) >= 10;
  const tensCarry = Math.floor(left / 10) + Math.floor(right / 10) + (onesCarry ? 1 : 0) >= 10;

  return onesCarry || tensCarry;
}

function hasSubtractionBorrow(left: number, right: number): boolean {
  return left % 10 < right % 10;
}

function makeColumnQuestion(
  index: number,
  left: number,
  right: number,
  operator: ColumnOperator,
  pattern: ColumnArithmeticPattern,
): ColumnArithmeticQuestion {
  const answer = operator === "+" ? left + right : left - right;
  const requiresRegroup =
    operator === "+" ? hasAdditionRegroup(left, right) : hasSubtractionBorrow(left, right);

  return {
    kind: "column-arithmetic",
    id: `${index}-${left}${operator}${right}`,
    left,
    right,
    operator,
    answer,
    pattern,
    requiresRegroup,
  };
}

export function generateColumnArithmeticQuestion(
  index: number,
  pattern: ColumnArithmeticPattern = COLUMN_PATTERNS[index % COLUMN_PATTERNS.length],
  random: RandomSource = randomUnit,
): ColumnArithmeticQuestion {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    if (pattern === "addition-carry" || pattern === "addition-no-carry") {
      const left = randomInteger(10, 99, random);
      const right = randomInteger(1, 100 - left, random);
      const requiresRegroup = hasAdditionRegroup(left, right);

      if (requiresRegroup === (pattern === "addition-carry")) {
        return makeColumnQuestion(index, left, right, "+", pattern);
      }
    } else {
      const left = randomInteger(10, 99, random);
      const right = randomInteger(1, left, random);
      const requiresRegroup = hasSubtractionBorrow(left, right);

      if (requiresRegroup === (pattern === "subtraction-borrow")) {
        return makeColumnQuestion(index, left, right, "-", pattern);
      }
    }
  }

  const fallbackByPattern = {
    "addition-carry": [58, 27, "+"] as const,
    "addition-no-carry": [34, 25, "+"] as const,
    "subtraction-borrow": [52, 35, "-"] as const,
    "subtraction-no-borrow": [78, 61, "-"] as const,
  };
  const [left, right, operator] = fallbackByPattern[pattern];

  return makeColumnQuestion(index, left, right, operator, pattern);
}

function optionalTensDigit(value: number): string {
  return value >= 10 ? Math.floor(value / 10).toString() : "";
}

function onesDigit(value: number): string {
  return (value % 10).toString();
}

function resultHundredsDigit(value: number): string {
  return value >= 100 ? Math.floor(value / 100).toString() : "";
}

function resultTensDigit(value: number): string {
  if (value >= 100) {
    return Math.floor((value % 100) / 10).toString();
  }

  return value >= 10 ? Math.floor(value / 10).toString() : "";
}

export function createEmptyColumnArithmeticAnswer(): ColumnArithmeticAnswer {
  return {
    leftTens: "",
    leftOnes: "",
    operator: "",
    rightTens: "",
    rightOnes: "",
    regroup: "",
    resultHundreds: "",
    resultTens: "",
    resultOnes: "",
  };
}

export function getColumnArithmeticExpectedAnswer(
  question: ColumnArithmeticQuestion,
): ColumnArithmeticAnswer {
  return {
    leftTens: optionalTensDigit(question.left),
    leftOnes: onesDigit(question.left),
    operator: question.operator,
    rightTens: optionalTensDigit(question.right),
    rightOnes: onesDigit(question.right),
    regroup: question.requiresRegroup ? "1" : "0",
    resultHundreds: resultHundredsDigit(question.answer),
    resultTens: resultTensDigit(question.answer),
    resultOnes: onesDigit(question.answer),
  };
}

function normalizeDigit(value: string): string {
  return value.trim();
}

function optionalDigitMatches(actual: string, expected: string): boolean {
  const normalized = normalizeDigit(actual);

  if (expected === "") {
    return normalized === "" || normalized === "0";
  }

  return normalized === expected;
}

function normalizeRegroup(value: string): string {
  return value.trim() === "1" ? "1" : "0";
}

export function isColumnArithmeticAnswerCorrect(
  question: ColumnArithmeticQuestion,
  answer: ColumnArithmeticAnswer,
): boolean {
  const expected = getColumnArithmeticExpectedAnswer(question);

  return (
    optionalDigitMatches(answer.leftTens, expected.leftTens) &&
    optionalDigitMatches(answer.leftOnes, expected.leftOnes) &&
    answer.operator === expected.operator &&
    optionalDigitMatches(answer.rightTens, expected.rightTens) &&
    optionalDigitMatches(answer.rightOnes, expected.rightOnes) &&
    normalizeRegroup(answer.regroup) === expected.regroup &&
    optionalDigitMatches(answer.resultHundreds, expected.resultHundreds) &&
    optionalDigitMatches(answer.resultTens, expected.resultTens) &&
    optionalDigitMatches(answer.resultOnes, expected.resultOnes)
  );
}

function formatRepeatedAddition(perGroup: number, groups: number): string {
  return Array.from({ length: groups }, () => perGroup.toString()).join(" + ");
}

function buildOptions(correct: string, candidates: string[], random: RandomSource): string[] {
  const options = [correct];

  for (const candidate of candidates) {
    if (options.length >= 4) {
      break;
    }

    if (candidate !== correct && !options.includes(candidate)) {
      options.push(candidate);
    }
  }

  return shuffle(options, random);
}

function buildNumericOptions(correct: number, candidates: number[], random: RandomSource): string[] {
  const expandedCandidates = [...candidates];

  for (let offset = 1; expandedCandidates.length < 12; offset += 1) {
    expandedCandidates.push(correct + offset, correct - offset);
  }

  const safeCandidates = expandedCandidates
    .map((candidate) => Math.max(1, Math.min(81, candidate)))
    .map((candidate) => candidate.toString());

  return buildOptions(correct.toString(), safeCandidates, random);
}

export function generateMultiplicationGroupsQuestion(
  index: number,
  random: RandomSource = randomUnit,
): MultiplicationGroupsQuestion {
  const groups = randomInteger(2, 6, random);
  const perGroup = randomInteger(2, 9, random);
  const product = groups * perGroup;
  const repeatedAddition = formatRepeatedAddition(perGroup, groups);
  const multiplicationExpression = `${perGroup} × ${groups}`;
  const mode: MultiplicationGroupsMode =
    index % 3 === 0 ? "addition" : index % 3 === 1 ? "multiplication" : "product";

  if (mode === "addition") {
    const nextGroups = groups >= 6 ? groups - 1 : groups + 1;
    const nextPerGroup = perGroup >= 9 ? perGroup - 1 : perGroup + 1;
    const previousGroups = groups <= 2 ? groups + 2 : groups - 1;
    const previousPerGroup = perGroup <= 2 ? perGroup + 2 : perGroup - 1;

    return {
      kind: "multiplication-groups",
      id: `${index}-${groups}x${perGroup}-addition`,
      mode,
      groups,
      perGroup,
      product,
      repeatedAddition,
      multiplicationExpression,
      prompt: "这幅图对应哪道连加算式？",
      options: buildOptions(
        repeatedAddition,
        [
          formatRepeatedAddition(perGroup, nextGroups),
          formatRepeatedAddition(nextPerGroup, groups),
          formatRepeatedAddition(previousPerGroup, groups),
          formatRepeatedAddition(perGroup, previousGroups),
          formatRepeatedAddition(Math.max(1, perGroup - 2), groups),
        ],
        random,
      ),
      answer: repeatedAddition,
    };
  }

  if (mode === "multiplication") {
    const nextGroups = groups >= 6 ? groups - 1 : groups + 1;
    const nextPerGroup = perGroup >= 9 ? perGroup - 1 : perGroup + 1;

    return {
      kind: "multiplication-groups",
      id: `${index}-${groups}x${perGroup}-multiplication`,
      mode,
      groups,
      perGroup,
      product,
      repeatedAddition,
      multiplicationExpression,
      prompt: "按“每组个数 × 组数”选择乘法式。",
      options: buildOptions(
        multiplicationExpression,
        [`${nextPerGroup} × ${groups}`, `${perGroup} × ${nextGroups}`, `${nextPerGroup} × ${nextGroups}`],
        random,
      ),
      answer: multiplicationExpression,
    };
  }

  return {
    kind: "multiplication-groups",
    id: `${index}-${groups}x${perGroup}-product`,
    mode,
    groups,
    perGroup,
    product,
    repeatedAddition,
    multiplicationExpression,
    prompt: "一共有多少个圆点？",
    options: buildNumericOptions(
      product,
      [product + perGroup, product - perGroup, product + groups, product - groups, product + 1],
      random,
    ),
    answer: product.toString(),
  };
}

const CHINESE_DIGITS = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

function toChineseDigit(value: number): string {
  return CHINESE_DIGITS[value] ?? "";
}

export function toChineseMultiplicationResult(value: number): string {
  if (value < 10) {
    return toChineseDigit(value);
  }

  if (value === 10) {
    return "一十";
  }

  const tens = Math.floor(value / 10);
  const ones = value % 10;
  const tensText = tens === 1 ? "十" : `${toChineseDigit(tens)}十`;

  return ones === 0 ? tensText : `${tensText}${toChineseDigit(ones)}`;
}

function buildChineseResultOptions(
  correct: number,
  candidates: number[],
  random: RandomSource,
): string[] {
  const expandedCandidates = [...candidates];

  for (let offset = 1; expandedCandidates.length < 12; offset += 1) {
    expandedCandidates.push(correct + offset, correct - offset);
  }

  const safeCandidates = expandedCandidates.map((candidate) => Math.max(1, Math.min(81, candidate)));

  return buildOptions(
    toChineseMultiplicationResult(correct),
    safeCandidates.map(toChineseMultiplicationResult),
    random,
  );
}

export function generateTimesTableQuestion(
  index: number,
  random: RandomSource = randomUnit,
): TimesTableQuestion {
  const left = randomInteger(1, 9, random);
  const right = randomInteger(1, 9, random);
  const product = left * right;
  const mode: TimesTableMode =
    index % 3 === 0 ? "product" : index % 3 === 1 ? "missing-factor" : "phrase";

  if (mode === "missing-factor") {
    const blankLeft = randomInteger(0, 1, random) === 0;
    const answer = blankLeft ? left : right;

    return {
      kind: "times-table",
      id: `${index}-${left}x${right}-missing-${blankLeft ? "left" : "right"}`,
      mode,
      left,
      right,
      product,
      prompt: blankLeft ? `(  ) × ${right} = ${product}` : `${left} × (  ) = ${product}`,
      options: buildNumericOptions(answer, [answer + 1, answer - 1, 10 - answer, answer + 2], random),
      answer: answer.toString(),
    };
  }

  if (mode === "phrase") {
    return {
      kind: "times-table",
      id: `${index}-${left}x${right}-phrase`,
      mode,
      left,
      right,
      product,
      prompt: `${toChineseDigit(left)}${toChineseDigit(right)}（  ）`,
      options: buildChineseResultOptions(
        product,
        [product + left, product - right, product + 1, product - 1, product + right],
        random,
      ),
      answer: toChineseMultiplicationResult(product),
    };
  }

  return {
    kind: "times-table",
    id: `${index}-${left}x${right}-product`,
    mode,
    left,
    right,
    product,
    prompt: `${left} × ${right} = ?`,
    options: buildNumericOptions(product, [product + left, product - right, product + 1, product - 1], random),
    answer: product.toString(),
  };
}

export function isSummerHomeworkChoiceCorrect(
  question: MultiplicationGroupsQuestion | TimesTableQuestion,
  choice: string,
): boolean {
  return choice === question.answer;
}

function createSignature(questions: SummerHomeworkQuestion[]): string {
  return questions.map((question) => question.id).join("|");
}

export function isSummerHomeworkGameKey(value: string): value is SummerHomeworkGameKey {
  return SUMMER_HOMEWORK_GAME_KEYS.includes(value as SummerHomeworkGameKey);
}

export function generateSummerHomeworkSet(
  gameKey: SummerHomeworkGameKey,
  totalQuestions = SUMMER_HOMEWORK_GAME_TOTAL_QUESTIONS[gameKey],
  random: RandomSource = randomUnit,
): SummerHomeworkSet {
  const questions = Array.from({ length: totalQuestions }, (_, index): SummerHomeworkQuestion => {
    if (gameKey === "column-arithmetic") {
      return generateColumnArithmeticQuestion(index, COLUMN_PATTERNS[index % COLUMN_PATTERNS.length], random);
    }

    if (gameKey === "multiplication-groups") {
      return generateMultiplicationGroupsQuestion(index, random);
    }

    return generateTimesTableQuestion(index, random);
  });

  return {
    gameKey,
    questions,
    signature: createSignature(questions),
  };
}
