import {
  Crown,
  Flag,
  Footprints,
  PersonStanding,
  Flame,
  Hand,
  Mountain,
  Rocket,
  Target,
  Trophy,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import type { SkillIconKey } from '../../lib/skillTree'

export const SKILL_ICONS: Record<SkillIconKey, { icon: LucideIcon; label: string }> = {
  muscleUp: { icon: Rocket, label: 'Muscle-Up' },
  frontLever: { icon: Waves, label: 'Front Lever' },
  handstand: { icon: Hand, label: 'עמידת ידיים' },
  oneArm: { icon: Mountain, label: 'יד אחת' },
  physique: { icon: Crown, label: 'פרופורציות' },
  target: { icon: Target, label: 'יעד' },
  flame: { icon: Flame, label: 'אש' },
  trophy: { icon: Trophy, label: 'גביע' },
  flag: { icon: Flag, label: 'דגל אנושי' },
  leg: { icon: Footprints, label: 'רגליים' },
  stretch: { icon: PersonStanding, label: 'גמישות' },
}

export function SkillIcon({ icon, className = 'size-5' }: { icon: SkillIconKey; className?: string }) {
  const Icon = SKILL_ICONS[icon]?.icon ?? Target
  return <Icon className={className} strokeWidth={2} aria-hidden />
}
