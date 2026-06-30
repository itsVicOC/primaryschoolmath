import { describe, expect, it } from "vitest";

import {
  generateColumnArithmeticQuestion,
  generateMultiplicationGroupsQuestion,
  generateSummerHomeworkSet,
  generateTimesTableQuestion,
  getColumnArithmeticExpectedAnswer,
  isColumnArithmeticAnswerCorrect,
  isSummerHomeworkChoiceCorrect,
  SUMMER_HOMEWORK_GAME_TOTAL_QUESTIONS,
  toChineseMultiplicationResult,
  type ColumnArithmeticQuestion,
} from "./summerHomeworkGames";

describe("summer homework game generation", () => {
  it("generates column arithmetic questions inside 100", () => {
    for (let index = 0; index < 80; index += 1) {
      const question = generateColumnArithmeticQuestion(index);

      expect(question.left).toBeGreaterThanOrEqual(10);
      expect(question.left).toBeLessThanOrEqual(99);
      expect(question.right).toBeGreaterThanOrEqual(1);
      expect(question.right).toBeLessThanOrEqual(99);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThanOrEqual(100);
      expect(
        question.operator === "+"
          ? question.left + question.right
          : question.left - question.right,
      ).toBe(question.answer);
    }
  });

  it("generates addition carry and subtraction borrow questions", () => {
    const addition = generateColumnArithmeticQuestion(0, "addition-carry");
    const subtraction = generateColumnArithmeticQuestion(1, "subtraction-borrow");

    expect(addition.operator).toBe("+");
    expect(addition.requiresRegroup).toBe(true);
    expect(subtraction.operator).toBe("-");
    expect(subtraction.requiresRegroup).toBe(true);
  });

  it("maps every column arithmetic answer cell correctly", () => {
    const question: ColumnArithmeticQuestion = {
      kind: "column-arithmetic",
      id: "manual-52-35",
      left: 52,
      right: 35,
      operator: "-",
      answer: 17,
      pattern: "subtraction-borrow",
      requiresRegroup: true,
    };

    const expected = getColumnArithmeticExpectedAnswer(question);

    expect(expected).toEqual({
      leftTens: "5",
      leftOnes: "2",
      operator: "-",
      rightTens: "3",
      rightOnes: "5",
      regroup: "1",
      resultHundreds: "",
      resultTens: "1",
      resultOnes: "7",
    });
    expect(isColumnArithmeticAnswerCorrect(question, expected)).toBe(true);
    expect(isColumnArithmeticAnswerCorrect(question, { ...expected, resultOnes: "8" })).toBe(
      false,
    );
  });

  it("generates multiplication group questions with one correct option", () => {
    for (let index = 0; index < 30; index += 1) {
      const question = generateMultiplicationGroupsQuestion(index);

      expect(question.product).toBe(question.groups * question.perGroup);
      expect(question.repeatedAddition.split(" + ")).toHaveLength(question.groups);
      expect(question.multiplicationExpression).toBe(`${question.perGroup} × ${question.groups}`);
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(question.options.length);
      expect(question.options.filter((option) => option === question.answer)).toHaveLength(1);
      expect(isSummerHomeworkChoiceCorrect(question, question.answer)).toBe(true);
    }
  });

  it("generates times table questions with unique answers and Chinese phrase results", () => {
    expect(toChineseMultiplicationResult(18)).toBe("十八");
    expect(toChineseMultiplicationResult(36)).toBe("三十六");

    for (let index = 0; index < 45; index += 1) {
      const question = generateTimesTableQuestion(index);

      expect(question.product).toBe(question.left * question.right);
      expect(question.options).toHaveLength(4);
      expect(new Set(question.options).size).toBe(question.options.length);
      expect(question.options.filter((option) => option === question.answer)).toHaveLength(1);
      expect(isSummerHomeworkChoiceCorrect(question, question.answer)).toBe(true);

      if (question.mode === "phrase") {
        expect(question.answer).toBe(toChineseMultiplicationResult(question.product));
      }
    }
  });

  it("generates configured question counts for all summer homework games", () => {
    expect(generateSummerHomeworkSet("column-arithmetic").questions).toHaveLength(
      SUMMER_HOMEWORK_GAME_TOTAL_QUESTIONS["column-arithmetic"],
    );
    expect(generateSummerHomeworkSet("multiplication-groups").questions).toHaveLength(
      SUMMER_HOMEWORK_GAME_TOTAL_QUESTIONS["multiplication-groups"],
    );
    expect(generateSummerHomeworkSet("times-table").questions).toHaveLength(
      SUMMER_HOMEWORK_GAME_TOTAL_QUESTIONS["times-table"],
    );
  });
});
