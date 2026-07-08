export const WORD_PROBLEM_KEYWORDS = [
  "一共",
  "还剩",
  "比……多",
  "比……少",
  "至少",
  "超过",
] as const;

export type WordProblemKeyword = (typeof WORD_PROBLEM_KEYWORDS)[number];

type RandomSource = () => number;

export interface KeywordCard {
  id: string;
  keyword: WordProblemKeyword;
  scenario: string;
  numbers: number[];
  prompt: string;
  sentencePattern: string;
  checklist: string[];
  example: string;
}

export const KEYWORD_CARD_CHECKLIST = [
  "题目里用了关键词。",
  "题目里有清楚的数量。",
  "最后提出了一个数学问题。",
  "听题的人知道要算什么。",
];

export const KEYWORD_CARD_HELP = [
  "先选一个生活场景，再把两个数字放进去。",
  "说完题目后，让同伴复述“知道了什么、要求什么”。",
  "如果关键词是比较类，记得说清谁和谁比。",
];

const SCENARIOS = [
  "文具店",
  "操场",
  "图书角",
  "水果摊",
  "手工课",
  "积分榜",
  "花园",
  "早餐桌",
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

function buildNumbers(keyword: WordProblemKeyword, random: RandomSource): number[] {
  if (keyword === "一共") {
    return [randomInteger(3, 9, random), randomInteger(2, 9, random)];
  }

  if (keyword === "还剩") {
    const total = randomInteger(8, 18, random);
    return [total, randomInteger(1, total - 1, random)];
  }

  if (keyword === "比……多") {
    return [randomInteger(3, 12, random), randomInteger(1, 6, random)];
  }

  if (keyword === "比……少") {
    const larger = randomInteger(6, 16, random);
    return [larger, randomInteger(1, Math.min(6, larger - 1), random)];
  }

  if (keyword === "至少") {
    const target = randomInteger(6, 15, random);
    return [target, randomInteger(0, target - 1, random)];
  }

  return [randomInteger(6, 15, random), randomInteger(0, 15, random)];
}

function buildExample(keyword: WordProblemKeyword, scenario: string, numbers: number[]): string {
  const [first, second] = numbers;

  if (keyword === "一共") {
    return `${scenario}里有 ${first} 个红色物品和 ${second} 个蓝色物品，一共有多少个？`;
  }

  if (keyword === "还剩") {
    return `${scenario}里原来有 ${first} 个物品，拿走了 ${second} 个，还剩多少个？`;
  }

  if (keyword === "比……多") {
    return `${scenario}里小林有 ${first} 个物品，小雨比小林多 ${second} 个，小雨有多少个？`;
  }

  if (keyword === "比……少") {
    return `${scenario}里小林有 ${first} 个物品，小雨比小林少 ${second} 个，小雨有多少个？`;
  }

  if (keyword === "至少") {
    return `${scenario}里至少需要 ${first} 个物品，现在有 ${second} 个，还要准备几个才够？`;
  }

  return `${scenario}里目标是超过 ${first} 分，现在有 ${second} 分，最少还要得几分？`;
}

function buildPrompt(keyword: WordProblemKeyword): string {
  if (keyword === "一共") {
    return "编一道把两个数量合起来的应用题。";
  }

  if (keyword === "还剩") {
    return "编一道先有一些、用掉一些、求剩下的应用题。";
  }

  if (keyword === "比……多") {
    return "编一道比较两个数量，并求较多一方的应用题。";
  }

  if (keyword === "比……少") {
    return "编一道比较两个数量，并求较少一方的应用题。";
  }

  if (keyword === "至少") {
    return "编一道需要达到最低数量的应用题。";
  }

  return "编一道需要超过某个数量的应用题。";
}

function buildSentencePattern(keyword: WordProblemKeyword): string {
  if (keyword === "一共") {
    return "有 __ 个……，又有 __ 个……，一共有多少个？";
  }

  if (keyword === "还剩") {
    return "原来有 __ 个……，用掉 __ 个……，还剩多少个？";
  }

  if (keyword === "比……多") {
    return "……有 __ 个，……比……多 __ 个，……有多少个？";
  }

  if (keyword === "比……少") {
    return "……有 __ 个，……比……少 __ 个，……有多少个？";
  }

  if (keyword === "至少") {
    return "至少需要 __ 个……，现在有 __ 个……，还要几个才够？";
  }

  return "要超过 __ 个/分，现在有 __ 个/分，最少还要几个/几分？";
}

export function generateKeywordCard(
  index: number,
  previousKeyword?: WordProblemKeyword,
  random: RandomSource = randomUnit,
): KeywordCard {
  const availableKeywords = WORD_PROBLEM_KEYWORDS.filter((keyword) => keyword !== previousKeyword);
  const keywordOffset = randomInteger(0, availableKeywords.length - 1, random);
  const keyword = availableKeywords[(index + keywordOffset) % availableKeywords.length];
  const scenario = SCENARIOS[(index + randomInteger(0, SCENARIOS.length - 1, random)) % SCENARIOS.length];
  const numbers = buildNumbers(keyword, random);

  return {
    id: `${index}-${keyword}-${scenario}-${numbers.join("-")}`,
    keyword,
    scenario,
    numbers,
    prompt: buildPrompt(keyword),
    sentencePattern: buildSentencePattern(keyword),
    checklist: KEYWORD_CARD_CHECKLIST,
    example: buildExample(keyword, scenario, numbers),
  };
}
