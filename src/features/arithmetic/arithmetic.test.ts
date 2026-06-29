import { describe, expect, it } from "vitest";

import {
  calculateScore,
  countAnsweredQuestions,
  formatDuration,
  generatePracticeSet,
  isAnswerInputValid,
  TOTAL_QUESTIONS,
} from "./arithmetic";

describe("arithmetic practice", () => {
  it("generates 100 questions within the first-grade bounds", () => {
    const practiceSet = generatePracticeSet();

    expect(practiceSet.questions).toHaveLength(TOTAL_QUESTIONS);
    expect(practiceSet.signature.length).toBeGreaterThan(0);

    for (const question of practiceSet.questions) {
      expect(question.left).toBeGreaterThanOrEqual(0);
      expect(question.left).toBeLessThanOrEqual(100);
      expect(question.right).toBeGreaterThanOrEqual(0);
      expect(question.right).toBeLessThanOrEqual(100);
      expect(question.answer).toBeGreaterThanOrEqual(0);
      expect(question.answer).toBeLessThanOrEqual(100);

      if (question.operator === "-") {
        expect(question.left).toBeGreaterThanOrEqual(question.right);
      }
    }
  });

  it("regenerates when a generated signature matches the previous session", () => {
    const first = generatePracticeSet(4, undefined, () => 0.1);
    const sequence = [
      ...Array.from({ length: 12 }, () => 0.1),
      ...Array.from({ length: 12 }, () => 0.9),
    ];
    let index = 0;

    const second = generatePracticeSet(4, first.signature, () => sequence[index++] ?? 0.9);

    expect(second.signature).not.toBe(first.signature);
  });

  it("scores only exact correct answers", () => {
    const practiceSet = generatePracticeSet(3, undefined, () => 0.2);
    const answers = practiceSet.questions.map((question, index) =>
      index === 1 ? question.answer + 1 : question.answer,
    );

    expect(calculateScore(practiceSet.questions, answers)).toBe(2);
  });

  it("counts only submitted answers", () => {
    expect(countAnsweredQuestions([0, null, 12, null, 100])).toBe(3);
  });

  it("formats durations as minutes and seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(600)).toBe("10:00");
  });

  it("validates answer input for 0-100 integer answers", () => {
    expect(isAnswerInputValid("0")).toBe(true);
    expect(isAnswerInputValid("100")).toBe(true);
    expect(isAnswerInputValid("101")).toBe(false);
    expect(isAnswerInputValid("")).toBe(false);
    expect(isAnswerInputValid("3.5")).toBe(false);
  });
});
