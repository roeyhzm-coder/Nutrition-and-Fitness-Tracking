import {
  blockWeekInfo,
  evaluateSkillTree,
  formatSkillValue,
  percent,
  SKILL_BODY_STAT_LABELS,
  SKILL_METRIC_LABELS,
  SKILL_SOURCE_LABELS,
  type BranchEvaluation,
  type MeasureEvaluation,
  type SkillDataSources,
  type SkillTreeState,
} from './skillTree'

const STATUS_TEXT = {
  active_focus: 'פעיל (בפוקוס)',
  queued_next_block: 'בתור לבלוק הבא',
  completed: 'הושלם',
} as const

const SOURCE_TEXT = {
  log: 'מיומן האימונים',
  manual: 'עדכון ידני',
  baseline: 'בסיס (טרם נשבר)',
  body: 'מדידה אחרונה',
} as const

function measureLine(m: MeasureEvaluation): string {
  const link =
    m.measure.sourceType === 'body_metric'
      ? SKILL_BODY_STAT_LABELS[m.measure.bodyStat ?? 'weight']
      : m.measure.linkedExercise.split('|')[0]?.trim() || '—'
  const source = m.currentSource ? SOURCE_TEXT[m.currentSource] : 'אין נתון'
  const when = m.currentDate ? ` (${m.currentDate})` : ''
  return [
    `    - ${m.measure.label || 'מדד'}: נוכחי ${formatSkillValue(m.measure, m.current)} → יעד ${formatSkillValue(m.measure, m.measure.target)}`,
    `בסיס ${formatSkillValue(m.measure, m.baseline)}`,
    `${percent(m.progress)}%`,
    `מקור: ${SKILL_SOURCE_LABELS[m.measure.sourceType]} · ${source}${when}`,
    `מקושר ל: ${link}`,
    `סוג: ${SKILL_METRIC_LABELS[m.measure.metricType]}`,
  ].join(' | ')
}

function branchBlock(e: BranchEvaluation): string {
  const head = `### ${e.branch.title} — ${percent(e.progress)}% | ${STATUS_TEXT[e.branch.status]} | ${e.completedCount}/${e.countedNodes} אבני דרך הושלמו`
  const nodes = e.nodes.map((n) => {
    const flags = [
      n.node.isActiveInCurrentBlock ? 'פעיל בבלוק' : 'בתור לבלוק עתידי',
      n.complete
        ? n.node.nextProgressionStep
          ? `הושלם ✓ — השלב הבא נפתח: ${n.node.nextProgressionStep}`
          : 'הושלם ✓'
        : n.node.nextProgressionStep
          ? `השלב הבא (נעול): ${n.node.nextProgressionStep}`
          : '',
      n.node.progressions.length
        ? `שלבים קודמים: ${n.node.progressions.map((p) => `${p.fromTitle} (${p.at.slice(0, 10)})`).join(' ← ')}`
        : '',
    ].filter(Boolean)
    return [
      `  - ${n.node.title}: ${percent(n.progress)}% | ${flags.join(' | ')} | מוזן מ: ${n.feeds.join(', ')}`,
      n.node.note ? `    הערה: ${n.node.note}` : '',
      ...n.measures.map(measureLine),
    ]
      .filter(Boolean)
      .join('\n')
  })
  const unlock = e.branch.nextUnlockTitle
    ? `  - ${e.complete || e.branch.status === 'completed' ? 'נפתח' : 'נפתח ב-100%'}: ${e.branch.nextUnlockTitle}`
    : ''
  return [head, ...nodes, unlock].filter(Boolean).join('\n')
}

/** `=== עץ מיומנויות ואבני דרך (בלוק 3) ===` section of the AI prompt. */
export function formatSkillTreeSection(
  state: SkillTreeState,
  sources: SkillDataSources,
  today?: string,
): string {
  const evaluations = evaluateSkillTree(state, sources)
  if (!evaluations.length) return ''
  const week = blockWeekInfo(state, today)
  const focus = evaluations.filter((e) => e.branch.status === 'active_focus')
  const overall = focus.length
    ? focus.reduce((sum, e) => sum + e.progress, 0) / focus.length
    : 0
  return [
    `=== עץ מיומנויות ואבני דרך (${state.blockLabel}) ===`,
    `- ${week.label} | התחלה: ${state.blockStartDate} | ${state.blockWeeks} שבועות | דילואד: שבועות ${state.deloadWeeks.join(', ') || '—'} | מבחנים: שבוע ${state.benchmarkWeek}`,
    `- התקדמות ממוצעת ביעדים פעילים: ${percent(overall)}%`,
    '- שיטת חישוב: הביצוע הטוב ביותר מאז תחילת הבלוק (יומן אימונים / עדכון ידני), לא פחות מהבסיס. משקל × חזרות לפי 1RM משוער (Epley); סטים × חזרות לפי ממוצע N הסטים הטובים באימון אחד; מדדי גוף לפי המדידה האחרונה.',
    ...evaluations.map(branchBlock),
  ].join('\n')
}

/** JSON export rows (`skill_tree_branches`, `skill_tree_nodes`). */
export function skillTreeExportEntities(
  state: SkillTreeState,
  sources: SkillDataSources,
): {
  skillTreeBranches: Record<string, unknown>[]
  skillTreeNodes: Record<string, unknown>[]
} {
  const evaluations = evaluateSkillTree(state, sources)
  return {
    skillTreeBranches: evaluations.map((e) => ({
      id: e.branch.id,
      title: e.branch.title,
      subtitle: e.branch.subtitle,
      category_icon: e.branch.icon,
      status: e.branch.status,
      order_index: e.branch.order,
      next_unlock_title: e.branch.nextUnlockTitle,
      completion_pct: percent(e.progress),
      completed_nodes: e.completedCount,
      counted_nodes: e.countedNodes,
    })),
    skillTreeNodes: evaluations.flatMap((e) =>
      e.nodes.map((n) => ({
        id: n.node.id,
        branch_id: n.node.branchId,
        title: n.node.title,
        order_index: n.node.order,
        is_active_in_current_block: n.node.isActiveInCurrentBlock,
        next_progression_step: n.node.nextProgressionStep,
        completion_pct: percent(n.progress),
        completed: n.complete,
        feeds: n.feeds,
        progressions: n.node.progressions,
        measures: n.measures.map((m) => ({
          label: m.measure.label,
          source_type: m.measure.sourceType,
          linked_exercise_identifier: m.measure.linkedExercise,
          metric_type: m.measure.metricType,
          body_stat: m.measure.bodyStat,
          start_baseline: m.baseline,
          target_goal: m.measure.target,
          current_value: m.current,
          current_source: m.currentSource,
          current_date: m.currentDate,
          completion_pct: percent(m.progress),
        })),
      })),
    ),
  }
}
