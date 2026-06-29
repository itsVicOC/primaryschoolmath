# 小学数学练习

一个面向小学生的数学练习小游戏网站。第一版实现“一年级口算练习”：100 道 100 以内加减法，限时 10 分钟，并通过 Supabase 保存排行榜。

## 本地开发

```bash
npm install
npm run dev
```

## Supabase 配置

1. 在 Supabase SQL Editor 中执行 `supabase/schema.sql`。
2. 复制 `.env.example` 为 `.env.local`。
3. 填入 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_ANON_KEY`。

未配置 Supabase 时，网站仍可练习口算，但无法提交和读取线上排行榜。

## 构建

```bash
npm run build
```

构建产物在 `dist/`，可部署到 GitHub Pages。
