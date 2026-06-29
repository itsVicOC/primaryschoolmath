import {
  ArrowLeft,
  Blocks,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Home,
  Loader2,
  Minus,
  Play,
  Plus,
  RotateCcw,
  Scale,
  Send,
  TrainFront,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  calculateScore,
  countAnsweredQuestions,
  formatDuration,
  GAME_DURATION_SECONDS,
  generatePracticeSet,
  isAnswerInputValid,
  LAST_QUESTION_SIGNATURE_KEY,
  normalizePlayerId,
  TOTAL_QUESTIONS,
  type PracticeSet,
} from "@/features/arithmetic/arithmetic";
import {
  generateMiniGameSet,
  isCompareChoiceCorrect,
  isMakeTenSelectionCorrect,
  isPlaceValueAnswerCorrect,
  MINI_GAME_DURATION_SECONDS,
  MINI_GAME_TOTAL_QUESTIONS,
  type CompareChoice,
  type MakeTenQuestion,
  type MiniGameKey,
  type MiniGameQuestion,
  type MiniGameSet,
  type PlaceValueQuestion,
} from "@/features/mini-games/miniGames";
import { fetchLeaderboard, submitScore, type GameKey, type LeaderboardEntry } from "@/lib/scores";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Page = "home" | GameKey;
type PracticePhase = "ready" | "playing" | "finished";
type FinishReason = "completed" | "timeout";

interface GameResult {
  score: number;
  durationSeconds: number;
  reason: FinishReason;
}

interface GameCardConfig {
  key: GameKey;
  title: string;
  grade: string;
  status: string;
  description: string;
  details: string;
  icon: LucideIcon;
}

interface GameVisualConfig {
  badgeVariant: "success" | "warm" | "cool" | "fresh" | "secondary";
  border: string;
  accentBar: string;
  iconWrap: string;
  iconText: string;
  softPanel: string;
  softBorder: string;
  text: string;
  primaryButton: string;
  outlineHover: string;
}

const gameCards: GameCardConfig[] = [
  {
    key: "arithmetic",
    title: "口算练习",
    grade: "小学一年级",
    status: "已开放",
    description: "100 以内加减法",
    details: "100 题 / 10 分钟",
    icon: Calculator,
  },
  {
    key: "make-ten",
    title: "凑十小火车",
    grade: "小学一年级",
    status: "已开放",
    description: "选择两节车厢凑成 10",
    details: "20 题 / 3 分钟",
    icon: TrainFront,
  },
  {
    key: "place-value",
    title: "十位个位积木",
    grade: "小学一年级",
    status: "已开放",
    description: "用十位和个位拼数字",
    details: "20 题 / 3 分钟",
    icon: Blocks,
  },
  {
    key: "compare",
    title: "比大小鳄鱼",
    grade: "小学一年级",
    status: "已开放",
    description: "选择 >、< 或 =",
    details: "20 题 / 3 分钟",
    icon: Scale,
  },
];

const gameVisuals: Record<GameKey, GameVisualConfig> = {
  arithmetic: {
    badgeVariant: "success",
    border: "border-emerald-200",
    accentBar: "bg-emerald-500",
    iconWrap: "bg-emerald-100",
    iconText: "text-emerald-700",
    softPanel: "bg-emerald-50",
    softBorder: "border-emerald-100",
    text: "text-emerald-700",
    primaryButton: "bg-emerald-600 text-white hover:bg-emerald-700",
    outlineHover: "hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800",
  },
  "make-ten": {
    badgeVariant: "warm",
    border: "border-amber-200",
    accentBar: "bg-amber-500",
    iconWrap: "bg-amber-100",
    iconText: "text-amber-700",
    softPanel: "bg-amber-50",
    softBorder: "border-amber-100",
    text: "text-amber-700",
    primaryButton: "bg-amber-600 text-white hover:bg-amber-700",
    outlineHover: "hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800",
  },
  "place-value": {
    badgeVariant: "cool",
    border: "border-sky-200",
    accentBar: "bg-sky-500",
    iconWrap: "bg-sky-100",
    iconText: "text-sky-700",
    softPanel: "bg-sky-50",
    softBorder: "border-sky-100",
    text: "text-sky-700",
    primaryButton: "bg-sky-600 text-white hover:bg-sky-700",
    outlineHover: "hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800",
  },
  compare: {
    badgeVariant: "fresh",
    border: "border-lime-200",
    accentBar: "bg-lime-500",
    iconWrap: "bg-lime-100",
    iconText: "text-lime-700",
    softPanel: "bg-lime-50",
    softBorder: "border-lime-100",
    text: "text-lime-700",
    primaryButton: "bg-lime-700 text-white hover:bg-lime-800",
    outlineHover: "hover:border-lime-300 hover:bg-lime-50 hover:text-lime-800",
  },
};

const miniGameConfigs = {
  "make-ten": {
    title: "凑十小火车",
    description: "每题选择两节车厢，让它们刚好凑成 10。",
    icon: TrainFront,
  },
  "place-value": {
    title: "十位个位积木",
    description: "看目标数字，用十位积木和个位积木拼出来。",
    icon: Blocks,
  },
  compare: {
    title: "比大小鳄鱼",
    description: "比较左右两边，选择正确的 >、< 或 =。",
    icon: Scale,
  },
} satisfies Record<
  MiniGameKey,
  {
    title: string;
    description: string;
    icon: LucideIcon;
  }
>;

function getPageFromHash(): Page {
  const page = window.location.hash.replace(/^#\/?/, "");

  if (page === "arithmetic" || page === "make-ten" || page === "place-value" || page === "compare") {
    return page;
  }

  return "home";
}

function navigateTo(page: Page) {
  window.location.hash = page === "home" ? "#/" : `#/${page}`;
}

function createPracticeSetFromStorage(): PracticeSet {
  const previousSignature = window.localStorage.getItem(LAST_QUESTION_SIGNATURE_KEY);
  return generatePracticeSet(TOTAL_QUESTIONS, previousSignature);
}

function App() {
  const [page, setPage] = useState<Page>(getPageFromHash);

  useEffect(() => {
    if (!window.location.hash) {
      window.location.hash = "#/";
    }

    const handleHashChange = () => setPage(getPageFromHash());
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  if (page === "arithmetic") {
    return <ArithmeticPractice />;
  }

  if (page === "make-ten" || page === "place-value" || page === "compare") {
    return <MiniGamePractice key={page} gameKey={page} />;
  }

  return <HomePage />;
}

function HomePage() {
  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
        <section className="grid items-center gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-5">
            <Badge variant="cool" className="w-fit">
              小学一年级数学小游戏
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-bold leading-tight text-slate-950 sm:text-5xl">
                每天十分钟，练稳基础数感
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                从口算、凑十、数位和比较开始，用短局练习建立清楚的数学感觉。
              </p>
            </div>
            <Button
              size="lg"
              className={gameVisuals.arithmetic.primaryButton}
              onClick={() => navigateTo("arithmetic")}
            >
              <Play className="h-5 w-5" />
              开始口算练习
            </Button>
          </div>
          <div className="overflow-hidden rounded-lg border bg-white shadow-soft">
            <img
              src={`${import.meta.env.BASE_URL}math-practice.svg`}
              alt="彩色数学练习数字卡片"
              className="aspect-[16/11] h-full w-full object-cover"
            />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {gameCards.map((game) => {
            const Icon = game.icon;
            const visual = gameVisuals[game.key];
            return (
              <Card
                key={game.key}
                className={cn(
                  "group flex min-h-64 flex-col justify-between overflow-hidden bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-soft",
                  visual.border,
                )}
              >
                <div className={cn("h-1 w-full", visual.accentBar)} />
                <CardHeader className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-lg",
                        visual.iconWrap,
                        visual.iconText,
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant={visual.badgeVariant}>{game.status}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <CardTitle className="leading-tight">{game.title}</CardTitle>
                    <CardDescription>{game.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Badge variant="outline">{game.grade}</Badge>
                  <div className="text-sm text-muted-foreground">{game.details}</div>
                </CardContent>
                <CardFooter>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-between bg-white", visual.outlineHover)}
                    onClick={() => navigateTo(game.key)}
                  >
                    进入练习
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <button
          className="flex min-w-0 items-center gap-2 whitespace-nowrap text-left text-base font-bold text-slate-950 sm:text-lg"
          onClick={() => navigateTo("home")}
          type="button"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Calculator className="h-5 w-5" />
          </span>
          小学数学练习
        </button>
        <Button variant="ghost" size="sm" onClick={() => navigateTo("home")}>
          <Home className="h-4 w-4" />
          <span className="hidden sm:inline">首页</span>
        </Button>
      </div>
    </header>
  );
}

function ArithmeticPractice() {
  const visual = gameVisuals.arithmetic;
  const [practiceSet, setPracticeSet] = useState<PracticeSet>(createPracticeSetFromStorage);
  const questions = practiceSet.questions;
  const [phase, setPhase] = useState<PracticePhase>("ready");
  const phaseRef = useRef<PracticePhase>(phase);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerInput, setAnswerInput] = useState("");
  const [answers, setAnswers] = useState<Array<number | null>>(
    Array.from({ length: TOTAL_QUESTIONS }, () => null),
  );
  const answersRef = useRef<Array<number | null>>(answers);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardMessage, setLeaderboardMessage] = useState<string | undefined>();
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const answerInputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentIndex];
  const answeredCount = countAnsweredQuestions(answers);
  const remainingSeconds = Math.max(0, GAME_DURATION_SECONDS - elapsedSeconds);
  const answerIsValid = isAnswerInputValid(answerInput);
  const progressValue = Math.round((answeredCount / Math.max(questions.length, 1)) * 100);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    const result = await fetchLeaderboard("arithmetic", 10);
    setLeaderboard(result.entries);
    setLeaderboardMessage(result.message);
    setLeaderboardLoading(false);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LAST_QUESTION_SIGNATURE_KEY, practiceSet.signature);
  }, [practiceSet.signature]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const finishGame = useCallback(
    (reason: FinishReason, finalAnswers = answersRef.current) => {
      if (phaseRef.current !== "playing") {
        return;
      }

      const now = Date.now();
      const started = startedAtRef.current ?? now;
      const durationSeconds =
        reason === "timeout"
          ? GAME_DURATION_SECONDS
          : Math.min(GAME_DURATION_SECONDS, Math.max(0, Math.ceil((now - started) / 1000)));

      setElapsedSeconds(durationSeconds);
      phaseRef.current = "finished";
      setResult({
        score: calculateScore(questions, finalAnswers),
        durationSeconds,
        reason,
      });
      setPhase("finished");
    },
    [questions],
  );

  useEffect(() => {
    if (phase !== "playing" || !startedAt) {
      return;
    }

    const tick = () => {
      const nextElapsed = Math.min(
        GAME_DURATION_SECONDS,
        Math.floor((Date.now() - startedAt) / 1000),
      );
      setElapsedSeconds(nextElapsed);

      if (nextElapsed >= GAME_DURATION_SECONDS) {
        finishGame("timeout");
      }
    };

    tick();
    const timerId = window.setInterval(tick, 250);
    return () => window.clearInterval(timerId);
  }, [finishGame, phase, startedAt]);

  useEffect(() => {
    if (phase === "playing") {
      answerInputRef.current?.focus();
    }
  }, [currentIndex, phase]);

  const resetPractice = useCallback(() => {
    const previousSignature = window.localStorage.getItem(LAST_QUESTION_SIGNATURE_KEY);
    const nextPracticeSet = generatePracticeSet(TOTAL_QUESTIONS, previousSignature);

    setPracticeSet(nextPracticeSet);
    setPhase("ready");
    phaseRef.current = "ready";
    setCurrentIndex(0);
    setAnswerInput("");
    const emptyAnswers = Array.from({ length: TOTAL_QUESTIONS }, () => null);
    setAnswers(emptyAnswers);
    answersRef.current = emptyAnswers;
    setStartedAt(null);
    startedAtRef.current = null;
    setElapsedSeconds(0);
    setResult(null);
  }, []);

  const startPractice = () => {
    const now = Date.now();

    startedAtRef.current = now;
    setStartedAt(now);
    setElapsedSeconds(0);
    setCurrentIndex(0);
    setAnswerInput("");
    setPhase("playing");
  };

  const submitAnswer = () => {
    if (phase !== "playing" || !answerIsValid) {
      return;
    }

    const nextAnswers = [...answersRef.current];
    nextAnswers[currentIndex] = Number(answerInput.trim());
    setAnswers(nextAnswers);
    answersRef.current = nextAnswers;

    if (currentIndex >= questions.length - 1) {
      finishGame("completed", nextAnswers);
      return;
    }

    setCurrentIndex((index) => index + 1);
    setAnswerInput("");
  };

  const handleAnswerKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submitAnswer();
    }
  };

  return (
    <PracticeLayout
      badge="小学一年级"
      description="100 道 100 以内加减法，限时 10 分钟。"
      gameKey="arithmetic"
      icon={Calculator}
      leaderboard={leaderboard}
      leaderboardLoading={leaderboardLoading}
      leaderboardMessage={leaderboardMessage}
      title="口算练习"
    >
      <PracticeCardHeader
        current={`${answeredCount}/${TOTAL_QUESTIONS}`}
        durationLabel={formatDuration(remainingSeconds)}
        icon={Calculator}
        progressValue={progressValue}
        title="口算练习"
        description="100 道 100 以内加减法，限时 10 分钟。"
        visual={visual}
      />

      {phase === "ready" ? (
        <ReadyPanel
          onStart={startPractice}
          stats={[
            { label: "题量", value: `${TOTAL_QUESTIONS}` },
            { label: "范围", value: "100" },
            { label: "限时", value: "10:00" },
          ]}
          visual={visual}
        />
      ) : null}

      {phase === "playing" && currentQuestion ? (
        <CardContent className="space-y-7 p-5 sm:p-8">
          <div
            className={cn(
              "rounded-lg border p-5 text-center sm:p-8",
              visual.softPanel,
              visual.softBorder,
            )}
          >
            <div className={cn("text-sm font-semibold", visual.text)}>第 {currentIndex + 1} 题</div>
            <div className="mt-4 flex items-center justify-center gap-3 text-5xl font-bold text-slate-950 sm:text-7xl">
              <span>{currentQuestion.left}</span>
              <span>{currentQuestion.operator}</span>
              <span>{currentQuestion.right}</span>
              <span>=</span>
            </div>
          </div>

          <div className="mx-auto flex max-w-md flex-col gap-3">
            <Input
              ref={answerInputRef}
              value={answerInput}
              onChange={(event) => setAnswerInput(event.target.value)}
              onKeyDown={handleAnswerKeyDown}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={3}
              placeholder="答案"
              aria-label="答案"
              className="h-14 text-center text-2xl font-semibold"
            />
            <Button
              size="lg"
              className={visual.primaryButton}
              disabled={!answerIsValid}
              onClick={submitAnswer}
            >
              <CheckCircle2 className="h-5 w-5" />
              {currentIndex === TOTAL_QUESTIONS - 1 ? "完成" : "下一题"}
            </Button>
          </div>
        </CardContent>
      ) : null}

      {phase === "finished" && result ? (
        <FinishPanel
          gameKey="arithmetic"
          onLeaderboardRefresh={loadLeaderboard}
          onPracticeAgain={resetPractice}
          result={result}
          totalQuestions={TOTAL_QUESTIONS}
        />
      ) : null}
    </PracticeLayout>
  );
}

function MiniGamePractice({ gameKey }: { gameKey: MiniGameKey }) {
  const config = miniGameConfigs[gameKey];
  const Icon = config.icon;
  const visual = gameVisuals[gameKey];
  const [practiceSet, setPracticeSet] = useState<MiniGameSet>(() => generateMiniGameSet(gameKey));
  const questions = practiceSet.questions;
  const [phase, setPhase] = useState<PracticePhase>("ready");
  const phaseRef = useRef<PracticePhase>(phase);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardMessage, setLeaderboardMessage] = useState<string | undefined>();
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [selectedTrainIndexes, setSelectedTrainIndexes] = useState<number[]>([]);
  const [placeTens, setPlaceTens] = useState(0);
  const [placeOnes, setPlaceOnes] = useState(0);

  const currentQuestion = questions[currentIndex];
  const remainingSeconds = Math.max(0, MINI_GAME_DURATION_SECONDS - elapsedSeconds);
  const progressValue = Math.round((answeredCount / Math.max(questions.length, 1)) * 100);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    const result = await fetchLeaderboard(gameKey, 10);
    setLeaderboard(result.entries);
    setLeaderboardMessage(result.message);
    setLeaderboardLoading(false);
  }, [gameKey]);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const resetQuestionState = useCallback(() => {
    setSelectedTrainIndexes([]);
    setPlaceTens(0);
    setPlaceOnes(0);
  }, []);

  const finishGame = useCallback(
    (reason: FinishReason, finalScore = scoreRef.current) => {
      if (phaseRef.current !== "playing") {
        return;
      }

      const now = Date.now();
      const started = startedAtRef.current ?? now;
      const durationSeconds =
        reason === "timeout"
          ? MINI_GAME_DURATION_SECONDS
          : Math.min(MINI_GAME_DURATION_SECONDS, Math.max(0, Math.ceil((now - started) / 1000)));

      setElapsedSeconds(durationSeconds);
      phaseRef.current = "finished";
      setResult({ score: finalScore, durationSeconds, reason });
      setPhase("finished");
    },
    [],
  );

  useEffect(() => {
    if (phase !== "playing" || !startedAt) {
      return;
    }

    const tick = () => {
      const nextElapsed = Math.min(
        MINI_GAME_DURATION_SECONDS,
        Math.floor((Date.now() - startedAt) / 1000),
      );
      setElapsedSeconds(nextElapsed);

      if (nextElapsed >= MINI_GAME_DURATION_SECONDS) {
        finishGame("timeout");
      }
    };

    tick();
    const timerId = window.setInterval(tick, 250);
    return () => window.clearInterval(timerId);
  }, [finishGame, phase, startedAt]);

  const startPractice = () => {
    const now = Date.now();

    startedAtRef.current = now;
    setStartedAt(now);
    setElapsedSeconds(0);
    setCurrentIndex(0);
    setAnsweredCount(0);
    setScore(0);
    scoreRef.current = 0;
    resetQuestionState();
    setPhase("playing");
  };

  const resetPractice = () => {
    setPracticeSet(generateMiniGameSet(gameKey));
    setPhase("ready");
    phaseRef.current = "ready";
    setCurrentIndex(0);
    setAnsweredCount(0);
    setScore(0);
    scoreRef.current = 0;
    setStartedAt(null);
    startedAtRef.current = null;
    setElapsedSeconds(0);
    setResult(null);
    resetQuestionState();
  };

  const submitMiniGameAnswer = (isCorrect: boolean) => {
    if (phaseRef.current !== "playing") {
      return;
    }

    const nextScore = scoreRef.current + (isCorrect ? 1 : 0);
    const nextAnsweredCount = answeredCount + 1;

    setScore(nextScore);
    scoreRef.current = nextScore;
    setAnsweredCount(nextAnsweredCount);

    if (currentIndex >= questions.length - 1) {
      finishGame("completed", nextScore);
      return;
    }

    setCurrentIndex((index) => index + 1);
    resetQuestionState();
  };

  return (
    <PracticeLayout
      badge="小学一年级"
      description={config.description}
      gameKey={gameKey}
      icon={Icon}
      leaderboard={leaderboard}
      leaderboardLoading={leaderboardLoading}
      leaderboardMessage={leaderboardMessage}
      title={config.title}
    >
      <PracticeCardHeader
        current={`${answeredCount}/${MINI_GAME_TOTAL_QUESTIONS}`}
        durationLabel={formatDuration(remainingSeconds)}
        icon={Icon}
        progressValue={progressValue}
        title={config.title}
        description={`${config.description} 每局 20 题，限时 3 分钟。`}
        visual={visual}
      />

      {phase === "ready" ? (
        <ReadyPanel
          onStart={startPractice}
          stats={[
            { label: "题量", value: `${MINI_GAME_TOTAL_QUESTIONS}` },
            { label: "限时", value: "3:00" },
            { label: "当前", value: `${score} 分` },
          ]}
          visual={visual}
        />
      ) : null}

      {phase === "playing" && currentQuestion ? (
        <CardContent className="space-y-6 p-5 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Badge variant={visual.badgeVariant}>第 {currentIndex + 1} 题</Badge>
            <div className={cn("text-sm font-semibold", visual.text)}>当前 {score} 分</div>
          </div>
          <MiniGameQuestionPanel
            question={currentQuestion}
            placeOnes={placeOnes}
            placeTens={placeTens}
            selectedTrainIndexes={selectedTrainIndexes}
            setPlaceOnes={setPlaceOnes}
            setPlaceTens={setPlaceTens}
            setSelectedTrainIndexes={setSelectedTrainIndexes}
            submitAnswer={submitMiniGameAnswer}
            visual={visual}
          />
        </CardContent>
      ) : null}

      {phase === "finished" && result ? (
        <FinishPanel
          gameKey={gameKey}
          onLeaderboardRefresh={loadLeaderboard}
          onPracticeAgain={resetPractice}
          result={result}
          totalQuestions={MINI_GAME_TOTAL_QUESTIONS}
        />
      ) : null}
    </PracticeLayout>
  );
}

interface PracticeLayoutProps {
  badge: string;
  children: React.ReactNode;
  description: string;
  gameKey: GameKey;
  icon: LucideIcon;
  leaderboard: LeaderboardEntry[];
  leaderboardLoading: boolean;
  leaderboardMessage?: string;
  title: string;
}

function PracticeLayout({
  badge,
  children,
  description,
  gameKey,
  icon: Icon,
  leaderboard,
  leaderboardLoading,
  leaderboardMessage,
  title,
}: PracticeLayoutProps) {
  const visual = gameVisuals[gameKey];

  return (
    <div className="min-h-screen bg-[#f6f8fb]">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="ghost"
              className="text-slate-700 hover:bg-white hover:text-slate-950"
              onClick={() => navigateTo("home")}
            >
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Button>
            <Badge variant={visual.badgeVariant}>{badge}</Badge>
          </div>

          <Card className={cn("overflow-hidden bg-white shadow-soft", visual.border)}>
            <div className={cn("h-1 w-full", visual.accentBar)} />
            {children}
          </Card>
        </section>

        <LeaderboardPanel
          description={`${title}独立榜单`}
          entries={leaderboard}
          gameKey={gameKey}
          icon={Icon}
          loading={leaderboardLoading}
          message={leaderboardMessage}
          subtitle={description}
          title="排行榜"
          visual={visual}
        />
      </main>
    </div>
  );
}

interface PracticeCardHeaderProps {
  current: string;
  description: string;
  durationLabel: string;
  icon: LucideIcon;
  progressValue: number;
  title: string;
  visual: GameVisualConfig;
}

function PracticeCardHeader({
  current,
  description,
  durationLabel,
  icon: Icon,
  progressValue,
  title,
  visual,
}: PracticeCardHeaderProps) {
  return (
    <CardHeader className="border-b bg-white">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div
            className={cn(
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-lg",
              visual.iconWrap,
              visual.iconText,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0 space-y-2">
            <CardTitle className="text-2xl leading-tight [word-break:keep-all] sm:text-3xl">
              {title}
            </CardTitle>
            <CardDescription className="leading-6">{description}</CardDescription>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm sm:w-56">
          <StatPill icon={Clock3} label="倒计时" value={durationLabel} visual={visual} />
          <StatPill icon={Calculator} label="进度" value={current} visual={visual} />
        </div>
      </div>
      <Progress
        value={progressValue}
        className="mt-4 bg-slate-100"
        indicatorClassName={visual.accentBar}
      />
    </CardHeader>
  );
}

interface ReadyPanelProps {
  onStart: () => void;
  stats: Array<{ label: string; value: string }>;
  visual: GameVisualConfig;
}

function ReadyPanel({ onStart, stats, visual }: ReadyPanelProps) {
  return (
    <CardContent className="grid gap-5 p-5 sm:p-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={cn("rounded-lg border bg-white p-4", visual.softBorder)}
          >
            <div className="text-sm text-muted-foreground">{stat.label}</div>
            <div className={cn("mt-2 text-3xl font-bold", visual.text)}>{stat.value}</div>
          </div>
        ))}
      </div>
      <Button size="lg" className={cn("w-full sm:w-fit", visual.primaryButton)} onClick={onStart}>
        <Play className="h-5 w-5" />
        开始答题
      </Button>
    </CardContent>
  );
}

interface MiniGameQuestionPanelProps {
  question: MiniGameQuestion;
  placeOnes: number;
  placeTens: number;
  selectedTrainIndexes: number[];
  setPlaceOnes: React.Dispatch<React.SetStateAction<number>>;
  setPlaceTens: React.Dispatch<React.SetStateAction<number>>;
  setSelectedTrainIndexes: React.Dispatch<React.SetStateAction<number[]>>;
  submitAnswer: (isCorrect: boolean) => void;
  visual: GameVisualConfig;
}

function MiniGameQuestionPanel({
  question,
  placeOnes,
  placeTens,
  selectedTrainIndexes,
  setPlaceOnes,
  setPlaceTens,
  setSelectedTrainIndexes,
  submitAnswer,
  visual,
}: MiniGameQuestionPanelProps) {
  if (question.kind === "make-ten") {
    return (
      <MakeTenPanel
        question={question}
        selectedIndexes={selectedTrainIndexes}
        setSelectedIndexes={setSelectedTrainIndexes}
        submitAnswer={submitAnswer}
        visual={visual}
      />
    );
  }

  if (question.kind === "place-value") {
    return (
      <PlaceValuePanel
        ones={placeOnes}
        question={question}
        setOnes={setPlaceOnes}
        setTens={setPlaceTens}
        submitAnswer={submitAnswer}
        tens={placeTens}
        visual={visual}
      />
    );
  }

  return <ComparePanel question={question} submitAnswer={submitAnswer} visual={visual} />;
}

interface MakeTenPanelProps {
  question: MakeTenQuestion;
  selectedIndexes: number[];
  setSelectedIndexes: React.Dispatch<React.SetStateAction<number[]>>;
  submitAnswer: (isCorrect: boolean) => void;
  visual: GameVisualConfig;
}

function MakeTenPanel({
  question,
  selectedIndexes,
  setSelectedIndexes,
  submitAnswer,
  visual,
}: MakeTenPanelProps) {
  const toggleIndex = (index: number) => {
    setSelectedIndexes((current) => {
      if (current.includes(index)) {
        return current.filter((item) => item !== index);
      }

      if (current.length >= 2) {
        return current;
      }

      return [...current, index];
    });
  };

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 text-center", visual.softPanel, visual.softBorder)}>
        <div className={cn("text-sm font-semibold", visual.text)}>选择两节车厢凑成 10</div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {question.numbers.map((number, index) => {
            const selected = selectedIndexes.includes(index);
            return (
              <button
                key={`${question.id}-${index}`}
                type="button"
                onClick={() => toggleIndex(index)}
                className={cn(
                  "flex h-20 items-center justify-center rounded-lg border-2 bg-white text-4xl font-bold shadow-sm transition-colors",
                  selected
                    ? "border-amber-500 bg-amber-100 text-amber-900"
                    : "border-amber-200 text-slate-950 hover:border-amber-400 hover:bg-white",
                )}
              >
                {number}
              </button>
            );
          })}
        </div>
      </div>
      <Button
        size="lg"
        className={cn("w-full", visual.primaryButton)}
        disabled={selectedIndexes.length !== 2}
        onClick={() => submitAnswer(isMakeTenSelectionCorrect(question, selectedIndexes))}
      >
        <CheckCircle2 className="h-5 w-5" />
        提交
      </Button>
    </div>
  );
}

interface PlaceValuePanelProps {
  ones: number;
  question: PlaceValueQuestion;
  setOnes: React.Dispatch<React.SetStateAction<number>>;
  setTens: React.Dispatch<React.SetStateAction<number>>;
  submitAnswer: (isCorrect: boolean) => void;
  tens: number;
  visual: GameVisualConfig;
}

function PlaceValuePanel({
  ones,
  question,
  setOnes,
  setTens,
  submitAnswer,
  tens,
  visual,
}: PlaceValuePanelProps) {
  const currentValue = tens * 10 + ones;

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5 text-center", visual.softPanel, visual.softBorder)}>
        <div className={cn("text-sm font-semibold", visual.text)}>拼出这个数字</div>
        <div className="mt-2 text-7xl font-bold text-slate-950">{question.target}</div>
        <div className="mt-2 text-sm text-slate-600">当前拼成 {currentValue}</div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <PlaceValueControl
          label="十位积木"
          max={10}
          min={0}
          setValue={setTens}
          value={tens}
          visual={visual}
        />
        <PlaceValueControl
          label="个位积木"
          max={9}
          min={0}
          setValue={setOnes}
          value={ones}
          visual={visual}
        />
      </div>

      <div className="rounded-lg border bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <BlockPreview count={tens} label="十位" type="ten" />
          <BlockPreview count={ones} label="个位" type="one" />
        </div>
      </div>

      <Button
        size="lg"
        className={cn("w-full", visual.primaryButton)}
        onClick={() => submitAnswer(isPlaceValueAnswerCorrect(question, tens, ones))}
      >
        <CheckCircle2 className="h-5 w-5" />
        提交
      </Button>
    </div>
  );
}

interface PlaceValueControlProps {
  label: string;
  max: number;
  min: number;
  setValue: React.Dispatch<React.SetStateAction<number>>;
  value: number;
  visual: GameVisualConfig;
}

function PlaceValueControl({ label, max, min, setValue, value, visual }: PlaceValueControlProps) {
  return (
    <div className={cn("rounded-lg border bg-white p-4", visual.softBorder)}>
      <div className={cn("mb-3 text-sm font-semibold", visual.text)}>{label}</div>
      <div className="grid grid-cols-[3rem_1fr_3rem] items-center gap-3">
        <Button
          aria-label={`${label}减少`}
          size="icon"
          variant="outline"
          className={visual.outlineHover}
          disabled={value <= min}
          onClick={() => setValue((current) => Math.max(min, current - 1))}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <div className="text-center text-3xl font-bold text-slate-950">{value}</div>
        <Button
          aria-label={`${label}增加`}
          size="icon"
          variant="outline"
          className={visual.outlineHover}
          disabled={value >= max}
          onClick={() => setValue((current) => Math.min(max, current + 1))}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface BlockPreviewProps {
  count: number;
  label: string;
  type: "ten" | "one";
}

function BlockPreview({ count, label, type }: BlockPreviewProps) {
  const color = type === "ten" ? "bg-sky-500" : "bg-emerald-500";

  return (
    <div>
      <div className="mb-2 text-sm font-semibold text-slate-700">
        {label}：{count}
      </div>
      {count === 0 ? (
        <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">还没有积木</div>
      ) : (
        <div className="grid grid-cols-5 gap-2">
          {Array.from({ length: count }, (_, index) => (
            <div
              key={`${type}-${index}`}
              className={cn(
                "rounded-md",
                type === "ten" ? "h-12" : "aspect-square",
                color,
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ComparePanelProps {
  question: Extract<MiniGameQuestion, { kind: "compare" }>;
  submitAnswer: (isCorrect: boolean) => void;
  visual: GameVisualConfig;
}

function ComparePanel({ question, submitAnswer, visual }: ComparePanelProps) {
  const choices: CompareChoice[] = [">", "<", "="];

  return (
    <div className="space-y-5">
      <div className={cn("rounded-lg border p-5", visual.softPanel, visual.softBorder)}>
        <div className="grid items-center gap-4 sm:grid-cols-[1fr_auto_1fr]">
          <ExpressionCard expression={question.left.text} />
          <div className={cn("text-center text-sm font-semibold", visual.text)}>选择符号</div>
          <ExpressionCard expression={question.right.text} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {choices.map((choice) => (
          <Button
            key={choice}
            variant="outline"
            className={cn("h-20 bg-white text-4xl font-bold", visual.outlineHover)}
            onClick={() => submitAnswer(isCompareChoiceCorrect(question, choice))}
          >
            {choice}
          </Button>
        ))}
      </div>
    </div>
  );
}

function ExpressionCard({ expression }: { expression: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-lg border bg-white p-4 text-center text-4xl font-bold text-slate-950">
      {expression}
    </div>
  );
}

interface FinishPanelProps {
  gameKey: GameKey;
  onLeaderboardRefresh: () => Promise<void>;
  onPracticeAgain: () => void;
  result: GameResult;
  totalQuestions: number;
}

function FinishPanel({
  gameKey,
  onLeaderboardRefresh,
  onPracticeAgain,
  result,
  totalQuestions,
}: FinishPanelProps) {
  const visual = gameVisuals[gameKey];
  const resultCards = useMemo(
    () => [
      { label: "成绩", value: `${result.score}/${totalQuestions}`, tone: visual.text },
      { label: "用时", value: formatDuration(result.durationSeconds), tone: "text-sky-700" },
      {
        label: "状态",
        value: result.reason === "completed" ? "已完成" : "时间到",
        tone: "text-amber-700",
      },
    ],
    [result, totalQuestions, visual.text],
  );

  return (
    <CardContent className="space-y-6 p-5 sm:p-8">
      <div className="grid gap-3 sm:grid-cols-3">
        {resultCards.map((item) => (
          <div key={item.label} className={cn("rounded-lg border bg-white p-4", visual.softBorder)}>
            <div className="text-sm text-muted-foreground">{item.label}</div>
            <div className={cn("mt-2 text-3xl font-bold", item.tone)}>{item.value}</div>
          </div>
        ))}
      </div>

      <ScoreSubmissionForm
        gameKey={gameKey}
        onSubmitted={onLeaderboardRefresh}
        result={result}
        totalQuestions={totalQuestions}
        visual={visual}
      />

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button className={visual.primaryButton} onClick={onPracticeAgain}>
          <RotateCcw className="h-4 w-4" />
          再练一次
        </Button>
        <Button
          variant="outline"
          className={cn("bg-white", visual.outlineHover)}
          onClick={() => navigateTo("home")}
        >
          <Home className="h-4 w-4" />
          回到首页
        </Button>
      </div>
    </CardContent>
  );
}

interface ScoreSubmissionFormProps {
  gameKey: GameKey;
  onSubmitted: () => Promise<void>;
  result: GameResult;
  totalQuestions: number;
  visual: GameVisualConfig;
}

function ScoreSubmissionForm({
  gameKey,
  onSubmitted,
  result,
  totalQuestions,
  visual,
}: ScoreSubmissionFormProps) {
  const [playerId, setPlayerId] = useState("");
  const [scoreMessage, setScoreMessage] = useState<string | undefined>();
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitScore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const normalizedPlayerId = normalizePlayerId(playerId);
    if (!normalizedPlayerId) {
      setScoreMessage("请输入玩家 ID。");
      return;
    }

    setSubmitting(true);
    setScoreMessage(undefined);
    const response = await submitScore({
      gameKey,
      playerId: normalizedPlayerId,
      score: result.score,
      totalQuestions,
      durationSeconds: result.durationSeconds,
    });
    setSubmitting(false);

    if (response.message) {
      setScoreMessage(response.message);
      return;
    }

    setScoreSubmitted(true);
    setPlayerId(normalizedPlayerId);
    setScoreMessage("成绩已提交。");
    await onSubmitted();
  };

  return (
    <form
      className={cn("space-y-3 rounded-lg border p-4", visual.softPanel, visual.softBorder)}
      onSubmit={handleSubmitScore}
    >
      <label className={cn("text-sm font-semibold", visual.text)} htmlFor="player-id">
        玩家 ID
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="player-id"
          value={playerId}
          onChange={(event) => {
            setPlayerId(event.target.value.slice(0, 24));
            setScoreMessage(undefined);
          }}
          maxLength={24}
          placeholder="输入 ID"
          disabled={scoreSubmitted}
        />
        <Button
          className={cn("sm:w-36", visual.primaryButton)}
          type="submit"
          disabled={submitting || scoreSubmitted || !isSupabaseConfigured}
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          提交
        </Button>
      </div>
      {!isSupabaseConfigured ? (
        <p className="text-sm text-amber-700">配置 Supabase 后即可提交排行榜。</p>
      ) : null}
      {scoreMessage ? (
        <p className="break-words text-sm text-slate-600 [overflow-wrap:anywhere]">
          {scoreMessage}
        </p>
      ) : null}
    </form>
  );
}

interface StatPillProps {
  icon: LucideIcon;
  label: string;
  value: string;
  visual: GameVisualConfig;
}

function StatPill({ icon: Icon, label, value, visual }: StatPillProps) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg border bg-white px-3 py-2", visual.softBorder)}>
      <Icon className={cn("h-4 w-4", visual.text)} />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-semibold text-slate-950">{value}</div>
      </div>
    </div>
  );
}

interface LeaderboardPanelProps {
  description: string;
  entries: LeaderboardEntry[];
  gameKey: GameKey;
  icon: LucideIcon;
  loading: boolean;
  message?: string;
  subtitle: string;
  title: string;
  visual: GameVisualConfig;
}

function LeaderboardPanel({
  description,
  entries,
  gameKey,
  icon: Icon,
  loading,
  message,
  subtitle,
  title,
  visual,
}: LeaderboardPanelProps) {
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <Card className={cn("overflow-hidden bg-white shadow-soft", visual.border)}>
        <div className={cn("h-1 w-full", visual.accentBar)} />
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg",
                    visual.iconWrap,
                    visual.iconText,
                  )}
                >
                  <Trophy className="h-4 w-4" />
                </span>
                {title}
              </CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
          </div>
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground",
              visual.softPanel,
              visual.softBorder,
            )}
          >
            <Icon className={cn("h-4 w-4", visual.text)} />
            {subtitle}
          </div>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 [overflow-wrap:anywhere]">
              {message}
            </div>
          ) : null}

          {!message && entries.length === 0 && !loading ? (
            <div className="rounded-lg border bg-slate-50 p-4 text-sm text-muted-foreground">
              暂无成绩。
            </div>
          ) : null}

          {entries.length > 0 ? (
            <div className="space-y-2">
              {entries.map((entry, index) => (
                <div
                  key={`${gameKey}-${entry.id}`}
                  className={cn(
                    "grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-lg border bg-white p-3",
                    visual.softBorder,
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold",
                      index === 0
                        ? cn(visual.iconWrap, visual.iconText)
                        : "bg-slate-100 text-slate-700",
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-950">{entry.playerId}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(entry.durationSeconds)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={cn("text-lg font-bold", visual.text)}>{entry.score}</div>
                    <div className="text-xs text-muted-foreground">分</div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </aside>
  );
}

export default App;
