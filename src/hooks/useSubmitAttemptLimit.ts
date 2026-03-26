import { useCallback, useState } from 'react'

export const MAX_SUBMIT_ATTEMPTS = 3

/**
 * Batasi percobaan kirim form yang gagal (API error). Setelah `max` kegagalan,
 * nonaktifkan submit sampai user klik "Coba lagi" — tanpa auto-retry berulang.
 */
export function useSubmitAttemptLimit(max: number = MAX_SUBMIT_ATTEMPTS) {
  const [failCount, setFailCount] = useState(0)
  const [blocked, setBlocked] = useState(false)

  const onSuccess = useCallback(() => {
    setFailCount(0)
    setBlocked(false)
  }, [])

  const onFailure = useCallback(() => {
    setFailCount((c) => {
      const next = c + 1
      if (next >= max) setBlocked(true)
      return next
    })
  }, [max])

  const resetLimit = useCallback(() => {
    setFailCount(0)
    setBlocked(false)
  }, [])

  return { failCount, blocked, onSuccess, onFailure, resetLimit }
}
