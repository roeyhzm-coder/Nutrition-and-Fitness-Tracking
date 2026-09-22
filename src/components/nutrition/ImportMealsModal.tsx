import { useState } from 'react'
import { useAppData } from '../../context/AppDataContext'
import { parseImportJson } from '../../lib/exportPrompt'
import { Button } from '../ui/Button'
import { Card } from '../ui/Card'
import { Modal } from '../ui/Modal'

const EXAMPLE = `{
  "savedMeals": [
    { "name": "ארוחת בוקר קבועה", "calories": 450, "protein": 40, "carbs": 35, "fats": 12 }
  ],
  "recipes": [
    {
      "name": "מתכון מיובא",
      "mealType": "lunch",
      "calories": 500,
      "proteinG": 45,
      "carbsG": 40,
      "fatsG": 12,
      "ingredients": ["מרכיב 1"],
      "steps": ["שלב 1"]
    }
  ]
}`

export function ImportMealsModal() {
  const { importMealsAndRecipes } = useAppData()
  const [open, setOpen] = useState(false)
  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  return (
    <>
      <Card title="ייבוא מתכונים / ארוחות">
        <p className="mb-3 text-sm text-muted">
          הדבק JSON מאפליקציית מתכונים חיצונית או הזן ידנית לייבוא מהיר.
        </p>
        <Button className="w-full" variant="surface" onClick={() => setOpen(true)}>
          ייבוא JSON / ידני
        </Button>
      </Card>

      <Modal
        open={open}
        title="ייבוא JSON"
        onClose={() => setOpen(false)}
        wide
      >
        <div className="space-y-3">
          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            rows={12}
            placeholder={EXAMPLE}
            className="w-full rounded-xl border border-line bg-surface px-3 py-2 font-mono text-xs text-text outline-none focus:border-primary"
            dir="ltr"
          />
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {ok ? <p className="text-sm text-accent">{ok}</p> : null}
          <div className="flex gap-2">
            <Button
              className="flex-1"
              variant="accent"
              onClick={() => {
                try {
                  const parsed = parseImportJson(raw)
                  importMealsAndRecipes(parsed.savedMeals, parsed.recipes)
                  setError(null)
                  setOk(
                    `יובאו ${parsed.savedMeals.length} ארוחות ו-${parsed.recipes.length} מתכונים`,
                  )
                  setRaw('')
                } catch {
                  setOk(null)
                  setError('JSON לא תקין. בדוק את המבנה ונסה שוב.')
                }
              }}
            >
              ייבא
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setRaw(EXAMPLE)
                setError(null)
                setOk(null)
              }}
            >
              דוגמה
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
