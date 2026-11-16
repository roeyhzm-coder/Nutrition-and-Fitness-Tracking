import type { ReactNode } from 'react'

/**
 * Minimal stick-figure illustrations (64×64) for strength / calisthenics
 * exercises. The kind is resolved from the exercise name (Hebrew or English),
 * so Block 3 and any future custom exercise gets a matching figure.
 * Figure strokes use the current text color, equipment is neutral,
 * weights are amber and movement cues are red.
 */

export type ExerciseFigureKind =
  | 'weightedPull'
  | 'explosivePull'
  | 'frontLeverRow'
  | 'oneArmHang'
  | 'pullUp'
  | 'toesToBar'
  | 'weightedDips'
  | 'dips'
  | 'inclineCurl'
  | 'skullCrusher'
  | 'tricepsPushdown'
  | 'benchPress'
  | 'handstand'
  | 'pikePush'
  | 'pseudoPlanche'
  | 'declinePush'
  | 'pushUp'
  | 'bulgarian'
  | 'singleLegRdl'
  | 'lateralRaise'
  | 'shoulderPress'
  | 'squat'
  | 'row'
  | 'core'
  | 'cardio'
  | 'physique'
  | 'generic'

/** Ordered: the first matching rule wins, so specific patterns come first. */
const RULES: readonly [ExerciseFigureKind, RegExp][] = [
  ['frontLeverRow', /פרונט|front\s*lever/i],
  ['toesToBar', /toes\s*to\s*bar|\bttb\b|הרמת רגליים|רגליים ישרות/i],
  ['oneArmHang', /תלי[יה]|\bhang\b|one[-\s]*arm|יד אחת/i],
  ['inclineCurl', /כפיפת מרפקים|כפיפות מרפקים|curl|ביספס|יד קדמית/i],
  ['skullCrusher', /skull|פשיטת מרפקים בשכיבה|פשיטה בשכיבה/i],
  ['tricepsPushdown', /פשיטת מרפקים|טרייספס|טריצפס|triceps|pushdown|יד אחורית/i],
  ['explosivePull', /muscle[-\s]*up|עליית כוח|מתפרץ.*מתח|מתח.*(מתפרץ|חזה)|chest\s*to\s*bar|high\s*pull/i],
  ['weightedPull', /מתח.*(כבד|משקל)|weighted\s*(pull|chin)/i],
  ['pullUp', /מתח|pull[-\s]*up|chin[-\s]*up|lat\s*pull|פולי עליון/i],
  ['weightedDips', /מקבילים.*(כבד|משקל)|weighted\s*dips?/i],
  ['dips', /מקבילים|\bdips?\b/i],
  ['handstand', /עמידת ידיים|handstand|hspu/i],
  ['pikePush', /pike|פייק/i],
  ['pseudoPlanche', /פלאנש|planche/i],
  ['declinePush', /שיפוע שלילי|decline/i],
  ['pushUp', /שכיבות|push[-\s]*ups?|archer push/i],
  ['benchPress', /לחיצת חזה|bench|פרפר|chest\s*press|fly/i],
  ['bulgarian', /בולגרי|split\s*squat|לאנג|lunge|מכרע/i],
  ['singleLegRdl', /rdl|דדליפט|רומני|deadlift|hinge/i],
  ['lateralRaise', /הרחק|lateral|raise/i],
  ['shoulderPress', /לחיצת כתפיים|כתפיים|shoulder|overhead|ohp/i],
  ['squat', /סקוואט|squat|wall\s*sit|וול סיט|רגליים|leg\s*press|ירך/i],
  ['row', /חתיר|\brows?\b/i],
  ['core', /בטן|crunch|ליבה|hollow|plank|פלאנק|core|abs|אופניים/i],
  ['cardio', /שחי|swim|אינטרוול|interval|ריצ|run|קיק|kick|אופני כושר|cardio/i],
  ['physique', /משקל גוף|היקף|מותן|שומן|body\s*fat|waist|physique|גזרה/i],
]

export function exerciseFigureKind(name: string): ExerciseFigureKind {
  const text = name.trim()
  if (!text) return 'generic'
  for (const [kind, re] of RULES) if (re.test(text)) return kind
  return 'generic'
}

const FIGURE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const CUE = {
  fill: 'none',
  stroke: '#f87171',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const PROP = {
  fill: 'none',
  stroke: '#94a3b8',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const WEIGHT = {
  fill: 'none',
  stroke: '#fbbf24',
  strokeWidth: 4,
  strokeLinecap: 'round' as const,
}

function Head({ cx, cy }: { cx: number; cy: number }) {
  return <circle cx={cx} cy={cy} r={4.6} fill="currentColor" stroke="none" />
}

function Floor({ y = 58 }: { y?: number }) {
  return <line x1={4} y1={y} x2={60} y2={y} {...PROP} strokeWidth={1.6} />
}

function Bar({ y = 8 }: { y?: number }) {
  return <line x1={8} y1={y} x2={56} y2={y} {...PROP} />
}

function Plate({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={5} fill="#fbbf24" stroke="none" />
      <circle cx={cx} cy={cy} r={1.5} fill="#1e293b" stroke="none" />
    </>
  )
}

/** Straight arrow from (x1,y1) to (x2,y2) with a head at the end. */
function Arrow({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  const angle = Math.atan2(y2 - y1, x2 - x1)
  const len = 4
  const a1 = angle + Math.PI * 0.8
  const a2 = angle - Math.PI * 0.8
  const p = (a: number) =>
    `${(x2 + Math.cos(a) * len).toFixed(1)} ${(y2 + Math.sin(a) * len).toFixed(1)}`
  return <path d={`M${x1} ${y1} L${x2} ${y2} M${p(a1)} L${x2} ${y2} L${p(a2)}`} {...CUE} />
}

const hangingLegs = <path d="M32 40 L29 50 L31 57 M32 40 L35 50 L34 57" {...FIGURE} />

const FIGURES: Record<ExerciseFigureKind, ReactNode> = {
  // Mid pull-up, belt chain with a plate hanging between the legs.
  weightedPull: (
    <>
      <Bar />
      <Head cx={32} cy={16} />
      <path d="M22 8 L19 19 L32 23 L45 19 L42 8" {...FIGURE} />
      <path d="M32 21 L32 40" {...FIGURE} />
      <path d="M32 40 L26 55 M32 40 L38 55" {...FIGURE} />
      <path d="M32 39 L32 44" {...PROP} strokeWidth={1.6} />
      <Plate cx={32} cy={48} />
    </>
  ),
  // Chest at the bar, explosive upward arrow.
  explosivePull: (
    <>
      <Bar y={14} />
      <Head cx={32} cy={7} />
      <path d="M21 14 L17 22 L32 13 L47 22 L43 14" {...FIGURE} />
      <path d="M32 12 L32 34" {...FIGURE} />
      <path d="M32 34 L29 45 L31 53 M32 34 L35 45 L34 53" {...FIGURE} />
      <Arrow x1={54} y1={46} x2={54} y2={26} />
    </>
  ),
  // Side view: horizontal torso under the bar, knees tucked, rowing up.
  frontLeverRow: (
    <>
      <Bar />
      <Head cx={15} cy={28} />
      <path d="M27 8 L34 18 L23 27" {...FIGURE} />
      <path d="M21 27 L42 27" {...FIGURE} />
      <path d="M42 27 L36 18 L45 15" {...FIGURE} />
      <Arrow x1={32} y1={46} x2={32} y2={34} />
    </>
  ),
  // One straight arm, packed shoulder (arrow down), other arm relaxed.
  oneArmHang: (
    <>
      <Bar />
      <Head cx={38} cy={16} />
      <path d="M29 8 L30 22 L42 24 L45 37" {...FIGURE} />
      <path d="M36 23 L36 42" {...FIGURE} />
      <path d="M36 42 L33 57 M36 42 L39 57" {...FIGURE} />
      <Arrow x1={22} y1={13} x2={22} y2={23} />
    </>
  ),
  pullUp: (
    <>
      <Bar />
      <Head cx={32} cy={16} />
      <path d="M22 8 L19 19 L32 23 L45 19 L42 8" {...FIGURE} />
      <path d="M32 21 L32 40" {...FIGURE} />
      {hangingLegs}
    </>
  ),
  // Hanging, straight legs swung up to the bar.
  toesToBar: (
    <>
      <Bar />
      <Head cx={18} cy={20} />
      <path d="M24 8 L24 23" {...FIGURE} />
      <path d="M23 23 L29 40" {...FIGURE} />
      <path d="M29 40 L38 11" {...FIGURE} />
      <path d="M48 42 Q54 26 44 14" {...CUE} />
      <path d="M43.5 19 L44 14 L48.8 15.6" {...CUE} />
    </>
  ),
  weightedDips: (
    <>
      <path d="M8 32 L20 32 M14 32 L14 58 M44 32 L56 32 M50 32 L50 58" {...PROP} />
      <Head cx={32} cy={11} />
      <path d="M18 32 L16 22 L32 17 L48 22 L46 32" {...FIGURE} />
      <path d="M32 16 L32 37" {...FIGURE} />
      <path d="M32 37 L25 52 M32 37 L39 52" {...FIGURE} />
      <path d="M32 36 L32 42" {...PROP} strokeWidth={1.6} />
      <Plate cx={32} cy={46} />
    </>
  ),
  dips: (
    <>
      <path d="M8 32 L20 32 M14 32 L14 58 M44 32 L56 32 M50 32 L50 58" {...PROP} />
      <Head cx={32} cy={11} />
      <path d="M18 32 L16 22 L32 17 L48 22 L46 32" {...FIGURE} />
      <path d="M32 16 L32 37" {...FIGURE} />
      <path d="M32 37 L28 52 M32 37 L36 52" {...FIGURE} />
    </>
  ),
  // Seated on an incline bench, elbow locked at 90° with a dumbbell.
  inclineCurl: (
    <>
      <Floor />
      <path d="M22 46 L42 46 M26 46 L26 57 M40 46 L40 57 M22 46 L12 24" {...PROP} />
      <Head cx={13} cy={18} />
      <path d="M24 43 L16 26" {...FIGURE} />
      <path d="M17 28 L19 40 L29 40" {...FIGURE} />
      <path d="M24 43 L37 43 L39 56" {...FIGURE} />
      <path d="M30 36 L30 44" {...WEIGHT} />
    </>
  ),
  // Lying on a flat bench, forearms bending back toward the head.
  skullCrusher: (
    <>
      <path d="M10 41 L46 41 M14 41 L14 57 M42 41 L42 57" {...PROP} />
      <Head cx={12} cy={35} />
      <path d="M18 37 L38 37" {...FIGURE} />
      <path d="M38 37 L48 30 L50 57" {...FIGURE} />
      <path d="M21 37 L23 20 L14 24" {...FIGURE} />
      <path d="M12 20 L15 28" {...WEIGHT} />
      <path d="M28 18 A8 8 0 0 0 18 13" {...CUE} />
      <path d="M21.8 11.4 L18 13 L20.6 16.4" {...CUE} />
    </>
  ),
  // Standing at a cable stack, elbows pinned, pushing the handle down.
  tricepsPushdown: (
    <>
      <Floor />
      <path d="M40 4 L48 4 M44 4 L42 34" {...PROP} strokeWidth={1.6} />
      <Head cx={28} cy={10} />
      <path d="M28 16 L28 36" {...FIGURE} />
      <path d="M28 19 L31 29 L41 35" {...FIGURE} />
      <path d="M28 36 L24 57 M28 36 L32 57" {...FIGURE} />
      <Arrow x1={52} y1={24} x2={52} y2={38} />
    </>
  ),
  benchPress: (
    <>
      <path d="M10 41 L46 41 M14 41 L14 57 M42 41 L42 57" {...PROP} />
      <Head cx={12} cy={35} />
      <path d="M18 37 L38 37" {...FIGURE} />
      <path d="M38 37 L48 30 L50 57" {...FIGURE} />
      <path d="M21 37 L21 18" {...FIGURE} />
      <path d="M16 17 L26 17" {...WEIGHT} />
      <Arrow x1={32} y1={30} x2={32} y2={16} />
    </>
  ),
  // Wall handstand: inverted, heels resting on the wall.
  handstand: (
    <>
      <Floor />
      <line x1={54} y1={4} x2={54} y2={58} {...PROP} />
      <Head cx={34} cy={49} />
      <path d="M38 57 L39 42" {...FIGURE} />
      <path d="M39 42 L42 24" {...FIGURE} />
      <path d="M42 24 L48 6 M42 24 L52 8" {...FIGURE} />
      <Arrow x1={24} y1={44} x2={24} y2={30} />
    </>
  ),
  // Inverted V with feet on a box, head moving toward the floor.
  pikePush: (
    <>
      <Floor />
      <rect x={42} y={40} width={14} height={18} {...PROP} />
      <Head cx={23} cy={49} />
      <path d="M46 40 L36 22" {...FIGURE} />
      <path d="M36 22 L20 41" {...FIGURE} />
      <path d="M20 41 L13 49 L17 57" {...FIGURE} />
      <Arrow x1={8} y1={28} x2={8} y2={42} />
    </>
  ),
  // Push-up plank with shoulders leaning far past the hands.
  pseudoPlanche: (
    <>
      <Floor />
      <Head cx={13} cy={41} />
      <path d="M19 44 L28 57" {...FIGURE} />
      <path d="M19 44 L38 48 L56 56" {...FIGURE} />
      <Arrow x1={30} y1={32} x2={14} y2={32} />
    </>
  ),
  // Feet on a bench, hands popping off the floor.
  declinePush: (
    <>
      <Floor />
      <path d="M44 34 L58 34 M47 34 L47 58 M56 34 L56 58" {...PROP} />
      <Head cx={12} cy={42} />
      <path d="M48 33 L19 44" {...FIGURE} />
      <path d="M19 44 L17 53" {...FIGURE} />
      <path d="M12 57 L22 57" {...CUE} strokeWidth={1.4} />
      <Arrow x1={30} y1={28} x2={30} y2={16} />
    </>
  ),
  pushUp: (
    <>
      <Floor />
      <Head cx={12} cy={42} />
      <path d="M18 44 L18 57" {...FIGURE} />
      <path d="M18 44 L38 49 L56 56" {...FIGURE} />
    </>
  ),
  // Rear foot on a bench, dumbbell in hand, front knee over the foot.
  bulgarian: (
    <>
      <Floor />
      <path d="M44 40 L58 40 M47 40 L47 58 M56 40 L56 58" {...PROP} />
      <Head cx={29} cy={9} />
      <path d="M29 15 L30 34" {...FIGURE} />
      <path d="M30 34 L21 44 L22 57" {...FIGURE} />
      <path d="M30 34 L34 50 L46 39" {...FIGURE} />
      <path d="M29 18 L32 32" {...FIGURE} />
      <path d="M28 34 L36 34" {...WEIGHT} />
    </>
  ),
  // T-shape hinge on one leg holding a dumbbell.
  singleLegRdl: (
    <>
      <Floor />
      <Head cx={8} cy={30} />
      <path d="M30 57 L30 34" {...FIGURE} />
      <path d="M30 34 L13 32" {...FIGURE} />
      <path d="M30 34 L55 31" {...FIGURE} />
      <path d="M15 33 L16 45" {...FIGURE} />
      <path d="M12 47 L20 47" {...WEIGHT} />
    </>
  ),
  // Standing, arms raised to the sides with dumbbells.
  lateralRaise: (
    <>
      <Floor />
      <Head cx={32} cy={11} />
      <path d="M11 21 L32 18 L53 21" {...FIGURE} />
      <path d="M32 16 L32 37" {...FIGURE} />
      <path d="M32 37 L27 57 M32 37 L37 57" {...FIGURE} />
      <path d="M10 17 L10 25 M54 17 L54 25" {...WEIGHT} />
      <Arrow x1={14} y1={36} x2={14} y2={28} />
      <Arrow x1={50} y1={36} x2={50} y2={28} />
    </>
  ),
  shoulderPress: (
    <>
      <Floor />
      <Head cx={32} cy={13} />
      <path d="M22 6 L18 16 L32 20 L46 16 L42 6" {...FIGURE} />
      <path d="M32 18 L32 38" {...FIGURE} />
      <path d="M32 38 L27 57 M32 38 L37 57" {...FIGURE} />
      <path d="M17 5 L27 5 M37 5 L47 5" {...WEIGHT} />
      <Arrow x1={56} y1={30} x2={56} y2={14} />
    </>
  ),
  squat: (
    <>
      <Floor />
      <Head cx={24} cy={14} />
      <path d="M25 20 L32 38" {...FIGURE} />
      <path d="M32 38 L45 40 L41 57" {...FIGURE} />
      <path d="M26 24 L44 26" {...FIGURE} />
    </>
  ),
  // Seated cable row, elbow driving back.
  row: (
    <>
      <Floor />
      <path d="M8 46 L28 46 M50 36 L50 52" {...PROP} />
      <Head cx={19} cy={17} />
      <path d="M22 44 L20 24" {...FIGURE} />
      <path d="M22 44 L36 38 L48 46" {...FIGURE} />
      <path d="M20 27 L11 33 L26 35" {...FIGURE} />
      <path d="M26 35 L50 40" {...PROP} strokeWidth={1.4} />
    </>
  ),
  // Hollow body: lower back pressed down, arms and legs off the floor.
  core: (
    <>
      <Floor y={50} />
      <Head cx={13} cy={37} />
      <path d="M18 40 L32 47 L54 37" {...FIGURE} />
      <path d="M18 40 L5 33" {...FIGURE} />
      <Arrow x1={32} y1={36} x2={32} y2={44} />
    </>
  ),
  cardio: (
    <>
      <Floor />
      <Head cx={35} cy={10} />
      <path d="M34 16 L29 35" {...FIGURE} />
      <path d="M33 20 L41 28 L47 22 M33 20 L23 26 L19 34" {...FIGURE} />
      <path d="M29 35 L40 44 L38 57 M29 35 L22 47 L11 46" {...FIGURE} />
      <path d="M4 20 L13 20 M2 28 L11 28" {...CUE} strokeWidth={1.6} />
    </>
  ),
  // Front double-biceps pose for body-composition goals.
  physique: (
    <>
      <Floor />
      <Head cx={32} cy={12} />
      <path d="M32 18 L32 38" {...FIGURE} />
      <path d="M32 21 L20 22 L17 10 M32 21 L44 22 L47 10" {...FIGURE} />
      <circle cx={17} cy={8} r={2.4} fill="currentColor" stroke="none" />
      <circle cx={47} cy={8} r={2.4} fill="currentColor" stroke="none" />
      <path d="M32 38 L26 57 M32 38 L38 57" {...FIGURE} />
    </>
  ),
  // Standing with dumbbells at the sides.
  generic: (
    <>
      <Floor />
      <Head cx={32} cy={11} />
      <path d="M32 17 L32 37" {...FIGURE} />
      <path d="M24 34 L32 20 L40 34" {...FIGURE} />
      <path d="M32 37 L27 57 M32 37 L37 57" {...FIGURE} />
      <path d="M20 37 L28 37 M36 37 L44 37" {...WEIGHT} />
    </>
  ),
}

type Props = {
  /** Exercise name (Hebrew / English); used to pick the figure. */
  name: string
  /** Force a figure instead of matching by name. */
  kind?: ExerciseFigureKind
  size?: 'sm' | 'md'
  className?: string
}

/** Rounded dark badge with a stick-figure posture for the exercise. */
export function ExerciseStickmanSvg({ name, kind, size = 'md', className = '' }: Props) {
  const figure = kind ?? exerciseFigureKind(name)
  const box = size === 'sm' ? 'size-11 rounded-lg' : 'size-14 rounded-xl'
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center border border-slate-700/60 bg-slate-800/80 text-slate-100 ${className}`}
      title={name}
    >
      <svg
        viewBox="0 0 64 64"
        className="size-[85%]"
        role="img"
        aria-label={`איור תנועה: ${name}`}
      >
        {FIGURES[figure]}
      </svg>
    </span>
  )
}
