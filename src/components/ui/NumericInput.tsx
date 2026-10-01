import { useRef, type InputHTMLAttributes } from 'react'
import {
  acceptNumericInput,
  safeInputValue,
} from '../../lib/numericInput'

type NumericInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'onChange' | 'type' | 'step' | 'inputMode'
> & {
  value: string | number | null | undefined
  onChange: (next: string) => void
  /** 0 = integers only; default 2 decimal places. */
  decimals?: number
}

export function NumericInput({
  value,
  onChange,
  decimals = 2,
  className = 'mt-1 field',
  ...rest
}: NumericInputProps) {
  const integer = decimals <= 0
  const composing = useRef(false)

  function commit(raw: string) {
    const next = acceptNumericInput(raw, decimals)
    if (next != null) onChange(next)
  }

  return (
    <input
      type="text"
      inputMode={integer ? 'numeric' : 'decimal'}
      step={integer ? 1 : 'any'}
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
