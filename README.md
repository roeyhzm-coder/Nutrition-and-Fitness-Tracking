# מעקב אימונים ותזונה

אפליקציית RTL בעברית למעקב אימונים, תזונה, הרגלים וייצוא נתונים ל-AI.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- React Router
- Lucide icons
- Open Food Facts
- Netlify (`netlify.toml`)
- Supabase schema (`supabase/schema.sql`)

## הרצה

```bash
npm install
npm run dev
```

## מודולים

| מסלול | תיאור |
| --- | --- |
| `/` | דשבורד — יעדים, משקל/שומן, התקדמות בתהליך |
| `/workouts` | שגרת Push/Pull מותאמת אישית + רישום סטים |
| `/nutrition` | מאקרו, ארוחות קבועות, מתכונים לפי סוג ארוחה, ייבוא JSON |
| `/habits` | מנהל הרגלים גמיש |
| `/export` | פרומפט שבועי ל-AI |
