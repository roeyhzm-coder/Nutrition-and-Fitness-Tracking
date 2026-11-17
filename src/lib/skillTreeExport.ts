import { planSlotSwap } from './skillSlotSwap'
import {
  blockWeekInfo,
  evaluateSkillTree,
  formatSkillValue,
  percent,
  SKILL_FOCUS_LIMIT,
  trackCategory,
  SKILL_SLOT_ROLE_LABELS,
  SKILL_TIER_LABELS,
  type BranchEvaluation,
  type MeasureEvaluation,
  type NodeEvaluation,
  type SkillDataSources,
  type SkillTreeState,
} from './skillTree'

const FOCUS_TEXT = {
  active: 'בפוקוס פעיל',
  queued: 'בתור',
  completed: 'נשלט במלואו',
} as const

const SOURCE_TEXT = {
  log: 'יומן אימונים',
  manual: 'עדכון ידני',
  baseline: 'בסיס (טרם נשבר)',
  body: 'מדידה',
} as const

function measureLine(m: MeasureEvaluation): string {
  const source = m.currentSource ? SOURCE_TEXT[m.currentSource] : 'אין נתון'
  const when = m.currentDate ? ` ${m.currentDate}` : ''
  return `    - ${m.measure.label || 'מדד'}: ${formatSkillValue(m.measure, m.current)} → ${formatSkillValue(m.measure, m.measure.target)} (${percent(m.progress)}%) | בסיס ${formatSkillValue(m.measure, m.baseline)} | ${source}${when}`
}

function slotLines(node: NodeEvaluation, sources: SkillDataSources): string[] {
  if (!node.node.slots.length) return []
  return planSlotSwap(node.node.slots, sources.programDays, sources.morningRoutine).map((p) => {
    const out = p.outgoing.length ? p.outgoing.join(' + ') : p.slot.replaces ? p.slot.replaces.split('|')[0] : 'ללא (תוספת בסוף האימון)'
    const incoming = p.incoming.map((e) => `${e.name} ${e.sets}×${e.reps}`).join(' + ')
    return `    - החלפה 1:1 · ${p.placeSummary} (${SKILL_SLOT_ROLE_LABELS[p.slot.role]}): יוצא ${out} → נכנס ${incoming}`
  })
}

function branchBlock(e: BranchEvaluation, sources: SkillDataSources): string {
  const mastered = e.nodes.filter((n) => n.status === 'mastered')
  const lines = [
    `### ${e.branch.title} (${e.branch.subtitle})${trackCategory(e.branch.id) ? ` [${trackCategory(e.branch.id)!.badge}]` : ''} — ${FOCUS_TEXT[e.focus]} | ${e.masteredCount}/${e.tierCount} שלבים נשלטו | ${percent(e.progress)}%`,
    mastered.length
      ? `  - נשלטו ✓: ${mastered.map((n) => `שלב ${n.node.order} ${n.node.title}`).join(' | ')}`
      : '',
  ]
  const active = e.activeNode
  if (active) {
    lines.push(
      `  - 🎯 שלב ${active.node.order} פעיל (${percent(active.progress)}%${active.gateReady ? ' — עבר את שער השליטה, מוכן לשלב הבא' : ''}): ${active.node.title}`,
      ...active.measures.map(measureLine),
      active.node.slotsAppliedAt ? '    - משובץ בתוכנית האימונים ✓' : '    - טרם שובץ בתוכנית',
    )
  }
  const next = e.nextNode
  if (next) {
    lines.push(
      `  - ${next.status === 'queued' ? '⏳' : '🔒'} השלב הבא — שלב ${next.node.order}: ${next.node.title}${next.node.prerequisites ? ` | תנאי פתיחה: ${next.node.prerequisites}` : ''}`,
      ...slotLines(next, sources),
    )
  }
  return lines.filter(Boolean).join('\n')
}

/** `=== עץ מיומנויות ואבני דרך ===` section of the AI prompt. */
export function formatSkillTreeSection(
  state: SkillTreeState,
  sources: SkillDataSources,
  today?: string,
): string {
  const evaluations = evaluateSkillTree(state, sources)
  if (!evaluations.length) return ''
  const week = blockWeekInfo(state, today)
  const focus = evaluations.filter((e) => e.focus === 'active')
  const queued = evaluations.filter((e) => e.focus === 'queued')
  const closest = evaluations
    .filter((e) => e.activeNode && e.nextNode)
    .sort((a, b) => b.activeNode!.progress - a.activeNode!.progress)
    .slice(0, 3)
    .map(
      (e) =>
        `${e.branch.title}: שלב ${e.activeNode!.node.order} ב-${percent(e.activeNode!.progress)}% → פותח "${e.nextNode!.node.title}"`,
    )
  return [
    `=== עץ מיומנויות ואבני דרך (${state.blockLabel}) ===`,
    `- ${week.label} | התחלה: ${state.blockStartDate} | ${state.blockWeeks} שבועות | דילואד: ${state.deloadWeeks.join(', ') || '—'} | מבחנים: שבוע ${state.benchmarkWeek}`,
    `- פוקוס פעיל: ${focus.length}/${SKILL_FOCUS_LIMIT} מסלולים (${focus.map((e) => `${e.branch.title} [${trackCategory(e.branch.id)?.kind === 'pull' ? 'משיכה' : trackCategory(e.branch.id)?.kind === 'push' ? 'דחיפה' : 'מותאם'}]`).join(', ') || '—'}) · מומלץ 1 משיכה + 1 דחיפה${focus.length > SKILL_FOCUS_LIMIT ? ' ⚠️ מעל המומלץ' : ''}`,
    queued.length ? `- בתור: ${queued.map((e) => e.branch.title).join(', ')}` : '',
    closest.length ? `- הכי קרובים לפתיחת השלב הבא: ${closest.join(' | ')}` : '',
    `- סטטוסים: ${Object.values(SKILL_TIER_LABELS).join(' / ')}. התקדמות = הביצוע הטוב ביותר מאז תחילת הבלוק (יומן / עדכון ידני), לא פחות מהבסיס; משקל × חזרות לפי 1RM משוער (Epley).`,
    ...evaluations.map((e) => branchBlock(e, sources)),
  ]
    .filter(Boolean)
    .join('\n')
}

/** JSON export rows (`skill_tree_tracks`, `skill_tree_tiers`). */
export function skillTreeExportEntities(
  state: SkillTreeState,
  sources: SkillDataSources,
): {
  skillTreeTracks: Record<string, unknown>[]
  skillTreeTiers: Record<string, unknown>[]
} {
  const evaluations = evaluateSkillTree(state, sources)
  return {
    skillTreeTracks: evaluations.map((e) => ({
      id: e.branch.id,
      title: e.branch.title,
      subtitle: e.branch.subtitle,
      focus: e.focus,
      order_index: e.branch.order,
      completion_pct: percent(e.progress),
      mastered_tiers: e.masteredCount,
      tier_count: e.tierCount,
      active_tier: e.activeNode?.node.order ?? null,
      next_tier: e.nextNode?.node.order ?? null,
    })),
    skillTreeTiers: evaluations.flatMap((e) =>
      e.nodes.map((n) => ({
        id: n.node.id,
        track_id: n.node.branchId,
        tier: n.node.order,
        title: n.node.title,
        status: n.status,
        prerequisites: n.node.prerequisites || null,
        completion_pct: percent(n.progress),
        mastery_gate_open: n.gateReady,
        slots_applied_at: n.node.slotsAppliedAt,
        slots: n.node.slots,
        measures: n.measures.map((m) => ({
          label: m.measure.label,
          linked_exercise: m.measure.linkedExercise,
          metric_type: m.measure.metricType,
          baseline: m.baseline,
          target: m.measure.target,
          current: m.current,
          current_source: m.currentSource,
          completion_pct: percent(m.progress),
        })),
      })),
    ),
  }
}
