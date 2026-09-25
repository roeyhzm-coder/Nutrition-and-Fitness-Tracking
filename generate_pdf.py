import asyncio
from playwright.async_api import async_playwright

html_content = """<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>ניסוי הרגלי קריאה</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      color: #1e293b;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: 210mm;
      height: 297mm;
      max-height: 297mm;
      padding: 10mm 12mm;
      box-sizing: border-box;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .page:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .header h1 { font-size: 19px; font-weight: 800; color: #0f172a; margin-bottom: 2px; }
    .header p { font-size: 11px; color: #64748b; margin-bottom: 7px; }
    .principles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-bottom: 7px; }
    .p-card { background: #f8fafc; border: 1px solid #e2e8f0; border-top: 3px solid #2563eb; border-radius: 4px; padding: 5px 7px; }
    .p-card h4 { font-size: 10px; font-weight: 700; color: #1e3a8a; margin-bottom: 2px; }
    .p-card p { font-size: 8.5px; color: #475569; line-height: 1.2; }
    .section-badge { background: #eff6ff; border-right: 4px solid #2563eb; padding: 3px 8px; font-size: 12px; font-weight: 700; color: #1d4ed8; margin: 5px 0; border-radius: 0 4px 4px 0; }
    .grid-2x2 { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
    .book-card { border: 1px solid #cbd5e1; border-radius: 5px; padding: 6px 8px; background: #fff; }
    .bc-head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #e2e8f0; padding-bottom: 3px; margin-bottom: 3px; }
    .bc-title { font-size: 11px; font-weight: 700; color: #0f172a; }
    .bc-num { background: #1e293b; color: #fff; font-size: 9.5px; font-weight: 700; padding: 1px 5px; border-radius: 3px; margin-left: 5px; }
    .bc-en { font-size: 9px; color: #94a3b8; font-style: italic; direction: ltr; }
    .bc-desc { font-size: 9.5px; color: #334155; margin-bottom: 3px; line-height: 1.25; }
    .bc-why { font-size: 9px; color: #475569; background: #f8fafc; padding: 3px 5px; border-radius: 3px; margin-bottom: 3px; line-height: 1.2; }
    .bc-selected { font-size: 10px; font-weight: 700; color: #1d4ed8; background: #dbeafe; padding: 2px 6px; border-radius: 3px; }
    .golden { background: #fef3c7; border: 1px solid #fde047; border-right: 4px solid #d97706; border-radius: 4px; padding: 5px 8px; font-size: 9.5px; color: #78350f; margin: 5px 0; }
    .table-title { font-size: 11px; font-weight: 800; color: #0f172a; margin-top: 5px; margin-bottom: 2px; }
    .table-sub { font-size: 9px; color: #64748b; margin-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 9px; text-align: right; }
    th { background: #1e293b; color: #fff; padding: 4px 6px; font-weight: 600; border: 1px solid #334155; }
    td { padding: 3px 5px; border: 1px solid #cbd5e1; }
    tr:nth-child(even) { background: #f8fafc; }
    .center { text-align: center; }
    .b-bold { font-weight: 600; }
    .protocol { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 5px; padding: 5px 8px; margin-top: 5px; }
    .protocol h4 { font-size: 10px; font-weight: 800; color: #0f172a; margin-bottom: 3px; border-bottom: 1px solid #e2e8f0; padding-bottom: 2px; }
    .p-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; }
    .p-grid h5 { font-size: 9px; font-weight: 700; color: #1d4ed8; margin-bottom: 1px; }
    .p-grid p { font-size: 8px; color: #475569; line-height: 1.2; }
    .footer { border-top: 1px solid #e2e8f0; padding-top: 3px; display: flex; justify-content: space-between; font-size: 8.5px; color: #94a3b8; }
  </style>
</head>
<body>

  <!-- עמוד 1 -->
  <div class="page">
    <div>
      <div class="header">
        <h1>ניסוי הרגלי קריאה: מפת 12 הקטגוריות והספרים הנבחרים</h1>
        <p>מדריך מובנה למציאת סגנון הקריאה האישי. הספרים נבחרו בקפידה באורך ממוקד לקריאה קולחת ללא מריחות.</p>
      </div>

      <div class="principles">
        <div class="p-card">
          <h4>1. שגרת מיקרו (10 עמ')</h4>
          <p>יעד יומי מוגדר וקל: 10 עמודים או 15 דקות, ללא עומס וללא פשרות על עקביות.</p>
        </div>
        <div class="p-card">
          <h4>2. חוק 50 העמודים</h4>
          <p>הספר לא תפס אותך עד עמוד 50? נוטשים מיד וללא אשמה. זהו מידע חיוני לניסוי.</p>
        </div>
        <div class="p-card">
          <h4>3. בדיקת ז'אנר ממוקדת</h4>
          <p>הספרים ברשימה מייצגים את שיא הז'אנר כדי לקבל תמונה אמיתית על כל תחום.</p>
        </div>
        <div class="p-card">
          <h4>4. דירוג והמשכיות</h4>
          <p>מתעדים בטבלה. קטגוריה שקיבלה ציון 4-5 הופכת לבסיס הקריאה המרכזי שלך הלאה.</p>
        </div>
      </div>

      <div class="section-badge">חלק א': תחומי העניין המקוריים (בסיס הניסוי)</div>
      <div class="grid-2x2">
        <div class="book-card">
          <div class="bc-head">
            <div><span class="bc-num">01</span><span class="bc-title">כלים מעשיים והרגלים</span></div>
            <span class="bc-en">Practical Habits & Systems</span>
          </div>
          <div class="bc-desc">ספרים שמפרקים התנהגות אנושית לפעולות חדות, מסגרות עבודה ותהליכים מדידים ללא תיאוריות מיותרות.</div>
          <div class="bc-why"><strong>למה זה עובד:</strong> מתמקד בפעולה האחת שביצועה הופך את כל השאר לקל או מיותר.</div>
          <div class="bc-selected">ספר נבחר: The ONE Thing / גארי קלר (~240 עמ')</div>
        </div>

        <div class="book-card">
          <div class="bc-head">
            <div><span class="bc-num">02</span><span class="bc-title">משלים עם מסר</span></div>
            <span class="bc-en">Business & Life Parables</span>
          </div>
          <div class="bc-desc">סיפורים קצרים, קולחים וממוקדים, המעבירים עקרונות פסיכולוגיים ועסקיים דרך עלילה פשוטה שאינה מעייפת.</div>
          <div class="bc-why"><strong>למה זה עובד:</strong> מאותו מחבר של "מי הזיז את הגבינה שלי?", מסתיים בערב אחד (~110 עמ').</div>
          <div class="bc-selected">ספר נבחר: The One Minute Manager / בלנצ'רד וג'ונסון (~110 עמ')</div>
        </div>

        <div class="book-card">
          <div class="bc-head">
            <div><span class="bc-num">03</span><span class="bc-title">פנטזיה ועולמות דמיוניים</span></div>
            <span class="bc-en">Immersive Fantasy & Adventure</span>
          </div>
          <div class="bc-desc">בריחה מוחלטת מהמציאות לעולמות עם חוקים חדשים, מסעות גבורה וקונפליקטים עמוקים, לפיתוח דמיון וניקוי ראש.</div>
          <div class="bc-why"><strong>למה זה עובד:</strong> קלאסיקת מופת קולחת, מהירה ומהודקת (ללא מאות עמודי תיאור איטיים של סדרות ענק).</div>
          <div class="bc-selected">ספר נבחר: ההוביט / ג'.ר.ר טולקין (260–280 עמ')</div>
        </div>

        <div class="book-card">
          <div class="bc-head">
            <div><span class="bc-num">04</span><span class="bc-title">שפת גוף והתנהגות</span></div>
            <span class="bc-en">Body Language & Behavioral Cues</span>
          </div>
          <div class="bc-desc">פענוח כוונות, תנועות גוף, מימיקות ורמזים סמויים באינטראקציות, מתוך ניסיון שטח מעשי ומחקרי של חוקרים.</div>
          <div class="bc-why"><strong>למה זה עובד:</strong> נכתב ע"י 3 חוקרי CIA בכירים; כלים מדויקים לזיהוי שקרים ורמזי שפת גוף.</div>
          <div class="bc-selected">ספר נבחר: Spy the Lie / יוסטון, פלויד וקרונברג (~240 עמ')</div>
        </div>
      </div>

      <div class="golden">
        <strong>כלל זהב לניסוי:</strong> כל 12 הספרים ברשימה נבחרו באורך ממוקד ומדוד (כ-110 עד 280 עמודים) כדי לאפשר לך לסיים ספרים במהירות ולבדוק את המשיכה הטבעית שלך לכל ז'אנר.
      </div>

      <div class="section-badge">חלק ב': קצה היכולת ופיצוח מערכות (ביצועים ובנייה)</div>
      <div class="grid-2x2">
        <div class="book-card">
          <div class="bc-head">
            <div><span class="bc-num">05</span><span class="bc-title">חוסן קיצוני וקצה היכולת</span></div>
            <span class="bc-en">Extreme Grit & Resilience</span>
          </div>
          <div class="bc-desc">אוטוביוגרפיות וסיפורי שטח של לוחמי עלית וספורטאי קצה. כתיבה ישירה ולא מתייפייפת על משמעת, כאב ואיפוק.</div>
          <div class="bc-why"><strong>למה זה עובד:</strong> פסקאות קצרות כמו פקודות מבצע של מפקד אריות הים; אפס תיאוריות מיותרות.</div>
          <div class="bc-selected">ספר נבחר: משמעת שווה חופש / ג'וקו וילינק (~200 עמ')</div>
        </div>

        <div class="book-card">
          <div class="bc-head">
            <div><span class="bc-num">06</span><span class="bc-title">פריצות דרך ובנייה מאפס</span></div>
            <span class="bc-en">Breakthroughs & Building</span>
          </div>
          <div class="bc-desc">ספרים שמפרקים שלב אחר שלב איך בונים משהו חדש לחלוטין שלא היה קיים, ואיך משיגים יתרון תחרותי מוחלט.</div>
          <div class="bc-why"><strong>למה זה עובד:</strong> ספר היזמות הממוקד והתמציתי ביותר שיצא; רעיונות מקוריים ללא מריחות.</div>
          <div class="bc-selected">ספר נבחר: מאפס לאחד (Zero to One) / פיטר ת'יל (~210 עמ')</div>
        </div>

        <div class="book-card">
          <div class="bc-head">
            <div><span class="bc-num">07</span><span class="bc-title">משא ומתן וטקטיקה</span></div>
            <span class="bc-en">Tactical Negotiation & Influence</span>
          </div>
          <div class="bc-desc">טקטיקות תקשורת במצבי קונפליקט. עקרונות פסיכולוגיים לניהול שיחות קשות, שכנוע והובלת אינטראקציות.</div>
          <div class="bc-why"><strong>למה זה עובד:</strong> נכתב ע"י מנהל המו"מ הבינלאומי הראשי של ה-FBI לחטיפות; פרקטיקה תחת אש.</div>
          <div class="bc-selected">ספר נבחר: לפצח את המשא ומתן / כריס ווס (~270 עמ')</div>
        </div>

        <div class="book-card">
          <div class="bc-head">
            <div><span class="bc-num">08</span><span class="bc-title">מתח ריאליסטי בקצב מהיר</span></div>
            <span class="bc-en">Fast-Paced Realistic Fiction</span>
          </div>
          <div class="bc-desc">רומני מתח, פשע ופעולה ללא תיאורים איטיים או התפלספויות. העלילה מתקדמת במהירות מפרק לפרק וסוחפת פנימה.</div>
          <div class="bc-why"><strong>למה זה עובד:</strong> מותחן פשע מחוספס, מהיר וקולנועי שאי אפשר להניח מהיד.</div>
          <div class="bc-selected">ספר נבחר: לא ארץ לזקנים / קורמאק מקארתי (~240 עמ')</div>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>מפת דרכים לקריאה | 12 קטגוריות לניסוי אישי (גרסה מעודכנת)</span>
      <span>1 מתוך 2</span>
    </div>
  </div>

  <!-- עמוד 2 -->
  <div class="page">
    <div>
      <div class="section-badge">חלק ג': אסטרטגיה, מדע ומציאות (חשיבה והישרדות)</div>
      <div class="grid-2x2">
        <div class="book-card">
          <div class="bc-head">
            <div><span class="bc-num">09</span><span class="bc-title">מנגנוני כסף ועושר</span></div>
            <span class="bc-en">Money Mechanics & Wealth Mindset</span>
          </div>
          <div class="bc-desc">פירוק מנגנוני הכלכלה והפסיכולוגיה שמאחורי צבירת הון וניהול סיכונים.</div>
          <div class="bc-why"><strong>למה זה עובד:</strong> בנוי מ-20 פרקים קצרים ועצמאיים (10–12 עמ' לפרק); קל מאוד לקריאה יומית.</div>
          <div class="bc-selected">ספר נבחר: הפסיכולוגיה של הכסף / מורגן האוזל (~240 עמ')</div>
        </div>

        <div class="book-card">
          <div class="bc-head">
            <div><span class="bc-num">10</span><span class="bc-title">אסטרטגיה ותורת המשחקים</span></div>
            <span class="bc-en">Strategy & Game Theory</span>
          </div>
          <div class="bc-desc">חשיבה מהלכים קדימה, זיהוי כוונות יריב, ניהול תמריצים והשגת יתרון תחרותי בתנאי אי-ודאות.</div>
          <div class="bc-why"><strong>למה זה עובד:</strong> נכתב ע"י אלופת פוקר עולמית ודוקטור לפסיכולוגיה; פירוק החלטות מבוסס הסתברות.</div>
          <div class="bc-selected">ספר נבחר: לחשוב בהימורים (Thinking in Bets) / אנני דיוק (~260 עמ')</div>
        </div>

        <div class="book-card">
          <div class="bc-head">
            <div><span class="bc-num">11</span><span class="bc-title">הישרדות ומסעות אמיתיים</span></div>
            <span class="bc-en">True Survival & Extreme Expeditions</span>
          </div>
          <div class="bc-desc">תיעוד היסטורי של מסעות קיצוניים והישרדות מול כוחות הטבע. כוח סבל ומנהיגות בתנאים שאין מהם מוצא.</div>
          <div class="bc-why"><strong>למה זה עובד:</strong> סיפור אמיתי ומטלטל מהרי האנדים; קצב אינטנסיבי שמתחיל בעמוד הראשון.</div>
          <div class="bc-selected">ספר נבחר: לגעת בריק (Touching the Void) / ג'ו סימפסון (~210 עמ')</div>
        </div>

        <div class="book-card">
          <div class="bc-head">
            <div><span class="bc-num">12</span><span class="bc-title">מדע פופולרי ופיצוח מערכות</span></div>
            <span class="bc-en">Popular Science & System Decoding</span>
          </div>
          <div class="bc-desc">הסברים קולחים על האופן שבו המוח פועל, איך מערכות קבלת החלטות פועלות ומה מוביל להצלחה, ללא כובד אקדמי.</div>
          <div class="bc-why"><strong>למה זה עובד:</strong> פיצוח מנגנון החשיבה המהירה ("2 השניות הראשונות") דרך סיפורי שטח מרתקים.</div>
          <div class="bc-selected">ספר נבחר: הבזק (Blink) / מלקולם גלדוול (~250 עמ')</div>
        </div>
      </div>

      <div style="margin-top: 6px;">
        <div class="table-title">טבלת מעקב לניסוי הקריאה (12 הספרים הנבחרים מראש)</div>
        <div class="table-sub">הספרים שובצו מראש. מלא תאריך, סמן אם הגעת לסיום או עצרת בעמוד 50, ותן ציון אישי כדי לדייק את הטעם שלך!</div>
        <table>
          <thead>
            <tr>
              <th style="width: 25px;">#</th>
              <th style="width: 130px;">קטגוריה</th>
              <th>הספר הנבחר והמחבר</th>
              <th style="width: 65px;">עמודים</th>
              <th style="width: 75px;">תאריך התחלה</th>
              <th style="width: 95px;">סטטוס (הושלם / 50)</th>
              <th style="width: 80px;">ציון (1-5) והמשך</th>
            </tr>
          </thead>
          <tbody>
            <tr><td class="center">01</td><td>כלים מעשיים והרגלים</td><td class="b-bold">The ONE Thing / גארי קלר</td><td class="center">~240</td><td></td><td></td><td></td></tr>
            <tr><td class="center">02</td><td>משלים עם מסר</td><td class="b-bold">The One Minute Manager / בלנצ'רד וג'ונסון</td><td class="center">~110</td><td></td><td></td><td></td></tr>
            <tr><td class="center">03</td><td>פנטזיה ועולמות דמיוניים</td><td class="b-bold">ההוביט / ג'.ר.ר טולקין</td><td class="center">260–280</td><td></td><td></td><td></td></tr>
            <tr><td class="center">04</td><td>שפת גוף והתנהגות</td><td class="b-bold">Spy the Lie / יוסטון, פלויד וקרונברג</td><td class="center">~240</td><td></td><td></td><td></td></tr>
            <tr><td class="center">05</td><td>חוסן קיצוני וקצה היכולת</td><td class="b-bold">משמעת שווה חופש / ג'וקו וילינק</td><td class="center">~200</td><td></td><td></td><td></td></tr>
            <tr><td class="center">06</td><td>פריצות דרך ובנייה מאפס</td><td class="b-bold">מאפס לאחד (Zero to One) / פיטר ת'יל</td><td class="center">~210</td><td></td><td></td><td></td></tr>
            <tr><td class="center">07</td><td>משא ומתן וטקטיקה</td><td class="b-bold">לפצח את המשא ומתן / כריס ווס</td><td class="center">~270</td><td></td><td></td><td></td></tr>
            <tr><td class="center">08</td><td>מתח ריאליסטי בקצב מהיר</td><td class="b-bold">לא ארץ לזקנים / קורמאק מקארתי</td><td class="center">~240</td><td></td><td></td><td></td></tr>
            <tr><td class="center">09</td><td>מנגנוני כסף ועושר</td><td class="b-bold">הפסיכולוגיה של הכסף / מורגן האוזל</td><td class="center">~240</td><td></td><td></td><td></td></tr>
            <tr><td class="center">10</td><td>אסטרטגיה ותורת המשחקים</td><td class="b-bold">לחשוב בהימורים (Thinking in Bets) / אנני דיוק</td><td class="center">~260</td><td></td><td></td><td></td></tr>
            <tr><td class="center">11</td><td>הישרדות ומסעות אמיתיים</td><td class="b-bold">לגעת בריק (Touching the Void) / ג'ו סימפסון</td><td class="center">~210</td><td></td><td></td><td></td></tr>
            <tr><td class="center">12</td><td>מדע פופולרי ופיצוח מערכות</td><td class="b-bold">הבזק (Blink) / מלקולם גלדוול</td><td class="center">~250</td><td></td><td></td><td></td></tr>
          </tbody>
        </table>
      </div>

      <div class="protocol">
        <h4>פרוטוקול מעשי: 4 עקרונות לשבירת מחסום הנטישה</h4>
        <div class="p-grid">
          <div>
            <h5>1. שעת עוגן בלו"ז</h5>
            <p>קשור את הקריאה להרגל קיים: אחרי הקפה בבוקר או 15 דקות לפני שינה.</p>
          </div>
          <div>
            <h5>2. ללא סמארטפון</h5>
            <p>הנח את הנייד בחדר אחר במצב שקט. מניעת הסחות דעת ונטישה.</p>
          </div>
          <div>
            <h5>3. חוק ה-50</h5>
            <p>לא נתפסת עד עמוד 50? נוטשים ללא אשמה, מתעדים ועוברים לבא.</p>
          </div>
          <div>
            <h5>4. גמישות בפורמט</h5>
            <p>כבד בעיניים? האזן לו בפורמט שמע (Audiobook) בנסיעה או פעילות.</p>
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      <span>מפת דרכים לקריאה | 12 קטגוריות לניסוי אישי (גרסה מעודכנת)</span>
      <span>2 מתוך 2</span>
    </div>
  </div>

</body>
</html>
"""


async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()
        await page.set_content(html_content, wait_until="networkidle")
        await page.pdf(
            path="reading_experiment_updated.pdf",
            format="A4",
            print_background=True,
            prefer_css_page_size=True,
            margin={"top": "0mm", "bottom": "0mm", "left": "0mm", "right": "0mm"},
        )
        await browser.close()
    print("reading_experiment_updated.pdf created successfully!")


if __name__ == "__main__":
    asyncio.run(run())
