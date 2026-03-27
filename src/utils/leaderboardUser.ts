/** Cocokkan baris leaderboard dengan user login (id disamakan sebagai string). */
export function isLeaderboardRowCurrentUser(rowUserId: string, myUserId: string | undefined): boolean {
  const a = String(rowUserId ?? '').trim()
  const b = String(myUserId ?? '').trim()
  return Boolean(a && b && a === b)
}
