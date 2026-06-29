import { describe, expect, it } from "vitest";

import {
  countPairsWithSum,
  generateCompareQuestion,
  generateMakeTenQuestion,
  generateMiniGameSet,
  generatePlaceValueQuestion,
  isCompareChoiceCorrect,
  isMakeTenSelectionCorrect,
  isPlaceValueAnswerCorrect,
  MINI_GAME_TOTAL_QUESTIONS,
} from "./miniGames";

describe("mini game question generation", () => {
  it("generates make-ten train questions with exactly one correct pair", () => {
    for (let index = 0; index < 50; index += 1) {
      const question = generateMakeTenQuestion(index);

      expect(question.numbers).toHaveLength(6);
      expect(question.numbers.every((number) => number >= 0 && number <= 10)).toBe(true);
      expect(countPairsWithSum(question.numbers, 10)).toBe(1);
      expect(isMakeTenSelectionCorrect(question, question.answerIndexes)).toBe(true);
    }
  });

  it("generates place-value questions inside 0-100", () => {
    for (let index = 0; index < 50; index += 1) {
      const question = generatePlaceValueQuestion(index);

      expect(question.target).toBeGreaterThanOrEqual(0);
      expect(question.target).toBeLessThanOrEqual(100);
      expect(question.tens * 10 + question.ones).toBe(question.target);
      expect(question.ones).toBeGreaterThanOrEqual(0);
      expect(question.ones).toBeLessThanOrEqual(9);
      expect(isPlaceValueAnswerCorrect(question, question.tens, question.ones)).toBe(true);
    }
  });

  it("generates compare questions with matching comparison answers", () => {
    for (let index = 0; index < 50; index += 1) {
      const question = generateCompareQuestion(index);

      expect(question.left.value).toBeGreaterThanOrEqual(0);
      expect(question.left.value).toBeLessThanOrEqual(100);
      expect(question.right.value).toBeGreaterThanOrEqual(0);
      expect(question.right.value).toBeLessThanOrEqual(100);
      expect(isCompareChoiceCorrect(question, question.answer)).toBe(true);
    }
  });

  it("generates 20 questions for each mini game", () => {
    expect(generateMiniGameSet("make-ten").questions).toHaveLength(MINI_GAME_TOTAL_QUESTIONS);
    expect(generateMiniGameSet("place-value").questions).toHaveLength(MINI_GAME_TOTAL_QUESTIONS);
    expect(generateMiniGameSet("compare").questions).toHaveLength(MINI_GAME_TOTAL_QUESTIONS);
  });
});
