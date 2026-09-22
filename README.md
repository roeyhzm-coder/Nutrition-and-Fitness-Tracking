# מעקב אימונים ותזונה

אפליקציית RTL בעברית למעקב אימונים, תזונה, הרגלים וייצוא נתונים ל-AI.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- React Router
- Lucide icons
- Open Food Facts (חיפוש מזון חי)
- Supabase schema (`supabase/schema.sql`)

## הרצה

```bash
npm install
npm run dev
```

## מודולים

| מסלול | תיאור |
| --- | --- |
| `/` | דשבורד |
| `/workouts` | שגרת 5 ימים, Key Lifts, רישום סטים וטיימר מנוחה |
| `/nutrition` | מאקרו, שקילה, חיפוש OFF, מתכונים |
| `/habits` | ניידות מפרקים ושליטה בדחפים |
| `/export` | פרומפט שבועי להעתקה ל-AI |
