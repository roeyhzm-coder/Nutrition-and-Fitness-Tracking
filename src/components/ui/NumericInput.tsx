import { useRef, type InputHTMLAttributes } from 'react'
import {
  acceptNumericInput,
  clampDecimalPlaces,
  safeInputValue,
} from '../../lib/numericInput'

type NumericInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'step' | 'inputMode'
> & {
  value: string | number | null | undefined
  onChange: (next: string) => void
  /** 0 = integers only; otherwise capped at 2 decimal places. Default 2. */
  decimals?: number
}

/**
 * Shared numeric field. New callers inherit 2-decimal typing (0.25, 1.33)
 * without extra setup. Uses text + decimal inputMode so drafts like "0."
 * never snap to an integer the way type="number" would.
 */
export function NumericInput({
  value,
  onChange,
  decimals = 2,
  className = 'mt-1 field',
  ...rest
}: NumericInputProps) {
  const places = clampDecimalPlaces(decimals)
  const integer = places <= 0
  const composing = useRef(false)

  function commit(raw: string) {
    const next = acceptNumericInput(raw, places)
    if (next != null) onChange(next)
  }

  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      step={integer ? 1 : 0.01}
      lang="en"
      dir="ltr"
      autoComplete="off"
      autoCorrect="off"
      spellCheck={false}
      value={safeInputValue(value)}
      onCompositionStart={() => {
        composing.current = true
      }}
      onCompositionEnd={(e) => {
        composing.current = false
        commit(e.currentTarget.value)
      }}
      onChange={(e) => {
        if (composing.current) {
          onChange(e.target.value)
          return
        }
        commit(e.target.value)
      }}
      className={className}
      {...rest}
    />
  )
}

/** Alias so new screens can import NumberInput and get the same 2-decimal behavior. */
export const NumberInput = NumericInput
