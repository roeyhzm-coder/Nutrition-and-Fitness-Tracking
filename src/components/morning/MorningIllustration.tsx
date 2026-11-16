import type { ReactNode } from 'react'
import type { MorningIllustrationKind } from '../../lib/morningRoutine'

/**
 * Minimal stick-figure illustrations (64×64) for the morning micro-routine.
 * Figure strokes use the current text color; cues (arrows) are red.
 */

const FIGURE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const CUE = {
  fill: 'none',
  stroke: '#ef4444',
  strokeWidth: 2.2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

const PROP = {
  fill: 'none',
  stroke: '#a8a29e',
  strokeWidth: 2.4,
  strokeLinecap: 'round' as const,
}

function Head({ cx, cy, r = 4.6 }: { cx: number; cy: number; r?: number }) {
  return <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />
}

function Floor({ y = 56 }: { y?: number }) {
  return <line x1={4} y1={y} x2={60} y2={y} {...PROP} strokeWidth={1.6} />
}

const FIGURES: Record<MorningIllustrationKind, ReactNode> = {
  // Standing, hands on hips, red arrow pulling the belly in.
  vacuum: (
    <>
      <Floor y={58} />
      <Head cx={28} cy={10} />
      <path d="M28 16 L28 22 Q25.5 27 28 34 L28 37" {...FIGURE} />
      <path d="M28 20 L22 27 L27 31" {...FIGURE} />
      <path d="M28 20 L34 27 L29.5 31" {...FIGURE} />
      <path d="M28 37 L25 57 M28 37 L31 57" {...FIGURE} />
      <path d="M47 27 L35 27" {...CUE} />
      <path d="M39 23 L35 27 L39 31" {...CUE} />
    </>
  ),
  // Deep squat, heels down, elbows between the knees.
  deepSquat: (
    <>
      <Floor />
      <Head cx={31} cy={18} />
      <path d="M30 24 L24 46" {...FIGURE} />
      <path d="M24 46 L41 40 L39 55 L47 55" {...FIGURE} />
      <path d="M28.5 29 L38 37 L37 30" {...FIGURE} />
    </>
  ),
  // Quadruped, one arm opening to the ceiling, curved rotation arrow.
  tSpine: (
    <>
      <Floor />
      <Head cx={50} cy={39} />
      <path d="M41 35 L20 37" {...FIGURE} />
      <path d="M41 35 L41 55" {...FIGURE} />
      <path d="M20 37 L20 55 L8 55" {...FIGURE} />
      <path d="M40 35 L41 14" {...FIGURE} />
      <path d="M51 22 A11 11 0 0 0 44 10" {...CUE} />
      <path d="M43.6 14.6 L44 10 L48.4 10.8" {...CUE} />
    </>
  ),
  // Lying on the back in a banana shape, lower back pressed into the floor.
  hollow: (
    <>
      <Floor y={47} />
      <Head cx={11} cy={32} />
      <path d="M16 36 Q31 52 47 39 L58 31" {...FIGURE} />
      <path d="M17 37 L33 33" {...FIGURE} />
    </>
  ),
  // Hanging from a bar, arms long, body relaxed.
  deadHang: (
    <>
      <line x1={10} y1={7} x2={54} y2={7} stroke="#78716c" strokeWidth={3.2} strokeLinecap="round" />
      <Head cx={32} cy={18} r={4.2} />
      <path d="M23 8 L26.5 25 M41 8 L37.5 25" {...FIGURE} />
      <path d="M26.5 25 L37.5 25" {...FIGURE} />
      <path d="M32 24 L32 41" {...FIGURE} />
      <path d="M32 41 L30 58 M32 41 L34 58" {...FIGURE} />
    </>
  ),
  // Seated pike, hands on the floor by the knees, legs lifting (up arrow).
  pike: (
    <>
      <Floor />
      <Head cx={19} cy={20} />
      <path d="M19 26 L18 53" {...FIGURE} />
      <path d="M18 53 L50 47" {...FIGURE} />
      <path d="M19 30 L31 54" {...FIGURE} />
      <path d="M55 44 L55 29" {...CUE} />
      <path d="M51 33 L55 29 L59 33" {...CUE} />
    </>
  ),
  // Prone arch: chest and legs off the floor, arrows lifting hands and feet.
  superman: (
    <>
      <Floor y={52} />
      <Head cx={15} cy={36} />
      <path d="M20 41 Q33 52 46 42" {...FIGURE} />
      <path d="M20 41 L6 33" {...FIGURE} />
      <path d="M46 42 L59 36" {...FIGURE} />
      <path d="M6 28 L6 18 M3 21 L6 18 L9 21" {...CUE} />
      <path d="M59 31 L59 21 M56 24 L59 21 L62 24" {...CUE} />
    </>
  ),
  // Handstand with chest facing a wall.
  handstand: (
    <>
      <Floor y={58} />
      <line x1={46} y1={3} x2={46} y2={58} stroke="#78716c" strokeWidth={3.2} strokeLinecap="round" />
      <Head cx={32.5} cy={47.5} r={4} />
      <path d="M37 57 L39.5 41 M42 57 L41 41" {...FIGURE} />
      <path d="M40.5 41 L42 23" {...FIGURE} />
      <path d="M42 23 L43.6 6 M42 23 L40.5 7" {...FIGURE} />
    </>
  ),
}

export function MorningIllustration({
  kind,
  className = 'size-16',
  title,
}: {
  kind: MorningIllustrationKind
  className?: string
  title?: string
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={`text-stone-700 ${className}`}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      {FIGURES[kind]}
    </svg>
  )
}
