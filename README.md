# 小学数学练习

一个面向小学生的数学练习小游戏网站。当前包含一年级口算练习、凑十小火车、十位个位积木、比大小鳄鱼、凑十/破十/平十算理拆步、关键词编题，以及暑假作业改编的竖式工坊、分组乘法、口诀快答，并通过 Supabase 保存计分游戏的独立排行榜。

## 本地开发

```bash
npm install
npm run dev
```

## Supabase 配置

1. 在 Supabase SQL Editor 中执行 `supabase/schema.sql`。
2. 复制 `.env.example` 为 `.env.local`。
3. 填入 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY`。

如果已经执行过旧版无前缀字段的表结构，先执行 `supabase/migrations/20260629_prefix_score_columns.sql`。

如果数据库已上线并且还没有 `score_game_key` 字段，再执行 `supabase/migrations/20260630_multi_game_scores.sql`。

如果数据库已上线并且还没有暑假作业小游戏的排行榜 key，再执行 `supabase/migrations/20260630_summer_homework_games.sql`。

如果数据库已上线并且还没有一年级算理小游戏的排行榜 key，再执行 `supabase/migrations/20260702_first_grade_strategy_games.sql`。

新项目可直接执行 `supabase/schema.sql`。

未配置 Supabase 时，网站仍可练习口算，但无法提交和读取线上排行榜。

## 构建

```bash
npm run build
```

构建产物在 `dist/`，可部署到 GitHub Pages。

## GitHub Pages

项目包含 `.github/workflows/deploy-pages.yml`。推送到 `main` 后会自动构建并发布到 GitHub Pages。

如需在线排行榜，在 GitHub 仓库的 Actions secrets 中添加：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
