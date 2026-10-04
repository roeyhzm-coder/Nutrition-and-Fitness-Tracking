import { GRAMS_PRESET_ID, type ServingPreset } from '../../lib/servingPresets'

type ServingPresetPickerProps = {
  presets: ServingPreset[]
  activeId: string
  onSelectPreset: (preset: ServingPreset) => void
  onSelectGrams: () => void
}

export function ServingPresetPicker({
  presets,
  activeId,
  onSelectPreset,
  onSelectGrams,
}: ServingPresetPickerProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {presets.map((preset) => {
        const active = activeId === preset.id
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => onSelectPreset(preset)}
            className={[
              'min-h-8 rounded-full px-2.5 text-[11px] font-semibold transition',
              active
                ? 'bg-cyan-600 text-white'
                : 'bg-white text-muted ring-1 ring-slate-200 hover:text-text',
            ].join(' ')}
          >
            {preset.label}
          </button>
        )
      })}
      <button
        type="button"
        onClick={onSelectGrams}
        className={[
          'min-h-8 rounded-full px-2.5 text-[11px] font-semibold transition',
          activeId === GRAMS_PRESET_ID
            ? 'bg-cyan-600 text-white'
            : 'bg-white text-muted ring-1 ring-slate-200 hover:text-text',
        ].join(' ')}
      >
        גרם
      </button>
    </div>
  )
}