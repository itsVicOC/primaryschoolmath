import {
  ArrowLeft,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Home,
  Loader2,
  Play,
  RotateCcw,
  Send,
  Trophy,
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
  formatDuration,
  GAME_DURATION_SECONDS,
  generatePracticeSet,
  isAnswerInputValid,
  LAST_QUESTION_SIGNATURE_KEY,
  normalizePlayerId,
  TOTAL_QUESTIONS,
  type PracticeSet,
} from "@/features/arithmetic/arithmetic";
import { fetchLeaderboard, submitScore, type LeaderboardEntry } from "@/lib/scores";
import { isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

type Page = "home" | "arithmetic";
type PracticePhase = "ready" | "playing" | "finished";
type FinishReason = "completed" | "timeout";

interface GameResult {
  score: number;
  durationSeconds: number;
  reason: FinishReason;
}

const gameCards = [
  {
    title: "口算练习",
    grade: "小学一年级",
    status: "已开放",
    description: "100 以内加减法",
    active: true,
    icon: Calculator,
    tone: "success",
  },
  {
    title: "乘法闯关",
    grade: "小学二年级",
    status: "准备中",
    description: "乘法口诀与速度训练",
    active: false,
    icon: Trophy,
    tone: "warm",
  },
  {
    title: "数位比较",
    grade: "小学三年级",
    status: "准备中",
    description: "大小比较与估算",
    active: false,
    icon: CheckCircle2,
    tone: "cool",
  },
] as const;

function getPageFromHash(): Page {
  return window.location.hash === "#/arithmetic" ? "arithmetic" : "home";
}

function navigateTo(page: Page) {
  window.location.hash = page === "home" ? "#/" : "#/arithmetic";
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

  return page === "arithmetic" ? <ArithmeticPractice /> : <HomePage />;
}

function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#ecfeff_0,transparent_36rem),linear-gradient(180deg,#f8fafc_0%,#fff_44%,#f8fafc_100%)]">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 sm:px-6 sm:py-10">
        <section className="grid items-center gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="space-y-5">
            <Badge variant="cool" className="w-fit">
              小学数学小游戏
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-4xl font-bold leading-tight text-slate-950 sm:text-5xl">
                每天十分钟，练稳基础口算
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                选择适合年级的练习小游戏，完成后查看成绩和排行榜。
              </p>
            </div>
            <Button size="lg" onClick={() => navigateTo("arithmetic")}>
              <Play className="h-5 w-5" />
              开始一年级口算
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

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gameCards.map((game) => {
            const Icon = game.icon;
            return (
              <Card
                key={game.title}
                className={cn(
                  "flex min-h-64 flex-col justify-between overflow-hidden",
                  game.active ? "border-emerald-200 shadow-soft" : "bg-slate-50/80",
                )}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className={cn(
                        "flex h-12 w-12 items-center justify-center rounded-lg",
                        game.active
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-200 text-slate-500",
                      )}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <Badge variant={game.tone}>{game.status}</Badge>
                  </div>
                  <CardTitle>{game.title}</CardTitle>
                  <CardDescription>{game.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant="outline">{game.grade}</Badge>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    disabled={!game.active}
                    variant={game.active ? "default" : "secondary"}
                    onClick={() => navigateTo("arithmetic")}
                  >
                    {game.active ? (
                      <>
                        进入练习
                        <ChevronRight className="h-4 w-4" />
                      </>
                    ) : (
                      "暂未开放"
                    )}
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
          className="flex items-center gap-2 text-left text-lg font-bold text-slate-950"
          onClick={() => navigateTo("home")}
          type="button"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Calculator className="h-5 w-5" />
          </span>
          小学数学练习
        </button>
        <Button variant="ghost" size="sm" onClick={() => navigateTo("home")}>
          <Home className="h-4 w-4" />
          首页
        </Button>
      </div>
    </header>
  );
}

function ArithmeticPractice() {
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
  const [playerId, setPlayerId] = useState("");
  const [scoreMessage, setScoreMessage] = useState<string | undefined>();
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const answerInputRef = useRef<HTMLInputElement>(null);

  const currentQuestion = questions[currentIndex];
  const remainingSeconds = Math.max(0, GAME_DURATION_SECONDS - elapsedSeconds);
  const answerIsValid = isAnswerInputValid(answerInput);
  const progressValue =
    phase === "finished"
      ? 100
      : Math.round((currentIndex / Math.max(questions.length, 1)) * 100);

  const loadLeaderboard = useCallback(async () => {
    setLeaderboardLoading(true);
    const result = await fetchLeaderboard(10);
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
    setPlayerId("");
    setScoreMessage(undefined);
    setScoreSubmitted(false);
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

  const handleSubmitScore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!result) {
      return;
    }

    const normalizedPlayerId = normalizePlayerId(playerId);
    if (!normalizedPlayerId) {
      setScoreMessage("请输入玩家 ID。");
      return;
    }

    setSubmitting(true);
    setScoreMessage(undefined);
    const response = await submitScore({
      playerId: normalizedPlayerId,
      score: result.score,
      totalQuestions: TOTAL_QUESTIONS,
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
    await loadLeaderboard();
  };

  const resultCards = useMemo(() => {
    if (!result) {
      return [];
    }

    return [
      { label: "成绩", value: `${result.score}/${TOTAL_QUESTIONS}`, tone: "text-emerald-700" },
      { label: "用时", value: formatDuration(result.durationSeconds), tone: "text-sky-700" },
      {
        label: "状态",
        value: result.reason === "completed" ? "已完成" : "时间到",
        tone: "text-amber-700",
      },
    ];
  }, [result]);

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button variant="ghost" onClick={() => navigateTo("home")}>
              <ArrowLeft className="h-4 w-4" />
              返回首页
            </Button>
            <Badge variant="success">小学一年级</Badge>
          </div>

          <Card className="overflow-hidden shadow-soft">
            <CardHeader className="border-b bg-white">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl sm:text-3xl">口算练习</CardTitle>
                  <CardDescription>100 道 100 以内加减法，限时 10 分钟。</CardDescription>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm sm:w-56">
                  <StatPill icon={Clock3} label="倒计时" value={formatDuration(remainingSeconds)} />
                  <StatPill
                    icon={Calculator}
                    label="进度"
                    value={`${Math.min(currentIndex + (phase === "finished" ? 1 : 0), TOTAL_QUESTIONS)}/${TOTAL_QUESTIONS}`}
                  />
                </div>
              </div>
              <Progress value={progressValue} className="mt-4" />
            </CardHeader>

            {phase === "ready" ? (
              <ReadyPanel onStart={startPractice} />
            ) : null}

            {phase === "playing" && currentQuestion ? (
              <CardContent className="space-y-7 p-5 sm:p-8">
                <div className="rounded-lg border bg-slate-50 p-5 text-center sm:p-8">
                  <div className="text-sm font-medium text-muted-foreground">
                    第 {currentIndex + 1} 题
                  </div>
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
                  <Button size="lg" disabled={!answerIsValid} onClick={submitAnswer}>
                    <CheckCircle2 className="h-5 w-5" />
                    {currentIndex === TOTAL_QUESTIONS - 1 ? "完成" : "下一题"}
                  </Button>
                </div>
              </CardContent>
            ) : null}

            {phase === "finished" && result ? (
              <CardContent className="space-y-6 p-5 sm:p-8">
                <div className="grid gap-3 sm:grid-cols-3">
                  {resultCards.map((item) => (
                    <div key={item.label} className="rounded-lg border bg-white p-4">
                      <div className="text-sm text-muted-foreground">{item.label}</div>
                      <div className={cn("mt-2 text-3xl font-bold", item.tone)}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <form className="space-y-3 rounded-lg border bg-slate-50 p-4" onSubmit={handleSubmitScore}>
                  <label className="text-sm font-semibold text-slate-900" htmlFor="player-id">
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
                      className="sm:w-36"
                      type="submit"
                      disabled={submitting || scoreSubmitted || !isSupabaseConfigured}
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      提交
                    </Button>
                  </div>
                  {!isSupabaseConfigured ? (
                    <p className="text-sm text-amber-700">配置 Supabase 后即可提交排行榜。</p>
                  ) : null}
                  {scoreMessage ? <p className="text-sm text-slate-600">{scoreMessage}</p> : null}
                </form>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button variant="secondary" onClick={resetPractice}>
                    <RotateCcw className="h-4 w-4" />
                    再练一次
                  </Button>
                  <Button variant="outline" onClick={() => navigateTo("home")}>
                    <Home className="h-4 w-4" />
                    回到首页
                  </Button>
                </div>
              </CardContent>
            ) : null}
          </Card>
        </section>

        <LeaderboardPanel
          entries={leaderboard}
          loading={leaderboardLoading}
          message={leaderboardMessage}
        />
      </main>
    </div>
  );
}

interface ReadyPanelProps {
  onStart: () => void;
}

function ReadyPanel({ onStart }: ReadyPanelProps) {
  return (
    <CardContent className="grid gap-5 p-5 sm:p-8">
      <div className="rounded-lg border bg-slate-50 p-5 sm:p-7">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-4">
            <div className="text-sm text-muted-foreground">题量</div>
            <div className="mt-2 text-3xl font-bold text-slate-950">{TOTAL_QUESTIONS}</div>
          </div>
          <div className="rounded-lg bg-white p-4">
            <div className="text-sm text-muted-foreground">范围</div>
            <div className="mt-2 text-3xl font-bold text-emerald-700">100</div>
          </div>
          <div className="rounded-lg bg-white p-4">
            <div className="text-sm text-muted-foreground">限时</div>
            <div className="mt-2 text-3xl font-bold text-sky-700">10:00</div>
          </div>
        </div>
      </div>
      <Button size="lg" className="w-full sm:w-fit" onClick={onStart}>
        <Play className="h-5 w-5" />
        开始答题
      </Button>
    </CardContent>
  );
}

interface StatPillProps {
  icon: typeof Clock3;
  label: string;
  value: string;
}

function StatPill({ icon: Icon, label, value }: StatPillProps) {
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-slate-50 px-3 py-2">
      <Icon className="h-4 w-4 text-emerald-700" />
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-semibold text-slate-950">{value}</div>
      </div>
    </div>
  );
}

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  loading: boolean;
  message?: string;
}

function LeaderboardPanel({ entries, loading, message }: LeaderboardPanelProps) {
  return (
    <aside className="lg:sticky lg:top-24 lg:self-start">
      <Card className="shadow-soft">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Trophy className="h-5 w-5 text-amber-600" />
                排行榜
              </CardTitle>
              <CardDescription>按成绩和用时排名</CardDescription>
            </div>
            {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : null}
          </div>
        </CardHeader>
        <CardContent>
          {message ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
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
                  key={entry.id}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-3 rounded-lg border bg-white p-3"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold",
                      index === 0
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700",
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-950">{entry.player_id}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDuration(entry.duration_seconds)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-emerald-700">{entry.score}</div>
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
