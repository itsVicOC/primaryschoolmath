import { describe, expect, it } from "vitest";

import {
  generateBalanceTenStrategyQuestion,
  generateBreakTenStrategyQuestion,
  generateMakeTenStrategyQuestion,
  generateStrategyGameSet,
  isBalanceTenStrategyAnswerCorrect,
  isBreakTenStrategyAnswerCorrect,
  isMakeTenStrategyAnswerCorrect,
  isStrategyAnswerCorrect,
  STRATEGY_GAME_TOTAL_QUESTIONS,
} from "./strategyGames";

describe("strategy game question generation", () => {
  it("generates make-ten strategy questions with valid bridge steps", () => {
    for (let index = 0; index < 50; index += 1) {
      const question = generateMakeTenStrategyQuestion(index);

      expect(question.left).toBeGreaterThanOrEqual(6);
      expect(question.left).toBeLessThanOrEqual(9);
      expect(question.right).toBeGreaterThanOrEqual(2);
      expect(question.right).toBeLessThanOrEqual(9);
      expect(question.left + question.right).toBeGreaterThan(10);
      expect(question.left + question.bridgeToTen).toBe(10);
      expect(question.bridgeToTen + question.remaining).toBe(question.right);
      expect(question.answer).toBe(question.left + question.right);
      expect(
        isMakeTenStrategyAnswerCorrect(question, {
          bridgeToTen: question.bridgeToTen.toString(),
          remaining: question.remaining.toString(),
          result: question.answer.toString(),
        }),
      ).toBe(true);
      expect(
        isMakeTenStrategyAnswerCorrect(question, {
          bridgeToTen: question.bridgeToTen.toString(),
          remaining: question.remaining.toString(),
          result: (question.answer + 1).toString(),
        }),
      ).toBe(false);
    }
  });

  it("generates break-ten strategy questions with valid subtraction steps", () => {
    for (let index = 0; index < 50; index += 1) {
      const question = generateBreakTenStrategyQuestion(index);

      expect(question.left).toBeGreaterThanOrEqual(11);
      expect(question.left).toBeLessThanOrEqual(18);
      expect(question.right).toBeGreaterThan(question.left - 10);
      expect(question.right).toBeLessThanOrEqual(9);
      expect(question.left - question.toTen).toBe(10);
      expect(question.toTen + question.remaining).toBe(question.right);
      expect(question.answer).toBe(question.left - question.right);
      expect(
        isBreakTenStrategyAnswerCorrect(question, {
          toTen: question.toTen.toString(),
          remaining: question.remaining.toString(),
          result: question.answer.toString(),
        }),
      ).toBe(true);
      expect(
        isBreakTenStrategyAnswerCorrect(question, {
          toTen: question.toTen.toString(),
          remaining: (question.remaining + 1).toString(),
          result: question.answer.toString(),
        }),
      ).toBe(false);
    }
  });

  it("generates balance-ten strategy questions by subtracting ten and compensating", () => {
    for (let index = 0; index < 50; index += 1) {
      const question = generateBalanceTenStrategyQuestion(index);

      expect(question.left).toBeGreaterThanOrEqual(11);
      expect(question.left).toBeLessThanOrEqual(18);
      expect([8, 9]).toContain(question.right);
      expect(question.compensation).toBe(10 - question.right);
      expect(question.left - 10 + question.compensation).toBe(question.answer);
      expect(question.answer).toBe(question.left - question.right);
      expect(
        isBalanceTenStrategyAnswerCorrect(question, {
          compensation: question.compensation.toString(),
          result: question.answer.toString(),
        }),
      ).toBe(true);
      expect(
        isBalanceTenStrategyAnswerCorrect(question, {
          compensation: question.compensation.toString(),
          result: (question.answer + 1).toString(),
        }),
      ).toBe(false);
    }
  });

  it("generates configured question counts for every strategy game", () => {
    expect(generateStrategyGameSet("make-ten-strategy").questions).toHaveLength(
      STRATEGY_GAME_TOTAL_QUESTIONS,
    );
    expect(generateStrategyGameSet("break-ten-strategy").questions).toHaveLength(
      STRATEGY_GAME_TOTAL_QUESTIONS,
    );
    expect(generateStrategyGameSet("balance-ten-strategy").questions).toHaveLength(
      STRATEGY_GAME_TOTAL_QUESTIONS,
    );
  });

  it("checks generic strategy answers against the matching question kind", () => {
    const makeTen = generateMakeTenStrategyQuestion(0, () => 0);
    const breakTen = generateBreakTenStrategyQuestion(0, () => 0);
    const balanceTen = generateBalanceTenStrategyQuestion(0, () => 0);

    expect(
      isStrategyAnswerCorrect(makeTen, {
        bridgeToTen: "4",
        remaining: "1",
        result: "11",
      }),
    ).toBe(true);
    expect(
      isStrategyAnswerCorrect(breakTen, {
        toTen: "1",
        remaining: "1",
        result: "9",
      }),
    ).toBe(true);
    expect(
      isStrategyAnswerCorrect(balanceTen, {
        compensation: "2",
        result: "3",
      }),
    ).toBe(true);
  });
});
