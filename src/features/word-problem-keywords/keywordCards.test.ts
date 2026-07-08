import { describe, expect, it } from "vitest";

import {
  generateKeywordCard,
  KEYWORD_CARD_CHECKLIST,
  WORD_PROBLEM_KEYWORDS,
  type WordProblemKeyword,
} from "./keywordCards";

describe("word problem keyword cards", () => {
  it("can generate a card for every configured keyword", () => {
    const generatedKeywords = new Set<WordProblemKeyword>();

    for (let index = 0; index < WORD_PROBLEM_KEYWORDS.length; index += 1) {
      generatedKeywords.add(generateKeywordCard(index, undefined, () => 0).keyword);
    }

    expect(generatedKeywords).toEqual(new Set(WORD_PROBLEM_KEYWORDS));
  });

  it("generates complete card content", () => {
    const card = generateKeywordCard(0, undefined, () => 0.25);

    expect(WORD_PROBLEM_KEYWORDS).toContain(card.keyword);
    expect(card.id).toContain(card.keyword);
    expect(card.scenario.length).toBeGreaterThan(0);
    expect(card.numbers.length).toBeGreaterThanOrEqual(2);
    expect(card.prompt.length).toBeGreaterThan(0);
    expect(card.sentencePattern).toContain("__");
    expect(card.checklist).toEqual(KEYWORD_CARD_CHECKLIST);
    expect(card.example).toContain(card.scenario);
  });

  it("avoids repeating the previous keyword", () => {
    for (const previousKeyword of WORD_PROBLEM_KEYWORDS) {
      const card = generateKeywordCard(0, previousKeyword, () => 0);

      expect(card.keyword).not.toBe(previousKeyword);
    }
  });
});
