import { useCallback, useEffect, useRef, useState } from 'react'

export function useRestTimer(defaultSeconds = 90) {
  const [secondsLeft, setSecondsLeft] = useState(defaultSeconds)
  const [running, setRunning] = useState(false)
  const [duration, setDuration] = useState(defaultSeconds)
  const intervalRef = useRef<number | null>(null)

  const clear = useCallback(() => {
    if (intervalRef.current != null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!running) {
      clear()
      return
    }

    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clear()
          setRunning(false)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return clear
  }, [running, clear])

  const start = useCallback((secs?: number) => {
    const next = secs ?? duration
    setDuration(next)
    setSecondsLeft(next)
    setRunning(true)
  }, [duration])

  const pause = useCallback(() => setRunning(false), [])

  const reset = useCallback(() => {
    setRunning(false)
    setSecondsLeft(duration)
  }, [duration])

  const chooseDuration = useCallback(
    (secs: number) => {
      setDuration(secs)
      setSecondsLeft(secs)
      setRunning(false)
    },
    [],
  )

  const format = `${String(Math.floor(secondsLeft / 60)).padStart(2, '0')}:${String(
    secondsLeft % 60,
  ).padStart(2, '0')}`

  return {
    secondsLeft,
    running,
    duration,
    setDuration,
    chooseDuration,
    start,
    pause,
    reset,
    format,
  }
}
