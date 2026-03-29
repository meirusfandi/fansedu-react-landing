/**
 * Render isi soal ber-HTML (admin) — selaras dengan fansedu-lms QuestionBody.
 */
export function QuestionBody({
  html,
  imageUrl,
  className = '',
}: {
  html: string
  imageUrl?: string | null
  className?: string
}) {
  const combined =
    imageUrl && imageUrl.trim()
      ? `${html || ''}<p><img src="${imageUrl.replace(/"/g, '&quot;')}" alt="Gambar soal" class="max-w-full rounded-lg border border-gray-200" /></p>`
      : html || ''

  if (!combined.trim()) {
    return <span className={`text-sm text-gray-500 ${className}`}>–</span>
  }

  const sanitized = combined
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')

  return (
    <div
      className={`question-body text-sm text-gray-900 [&_img]:max-w-full [&_img]:rounded-lg [&_pre]:block [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-slate-900 [&_pre]:p-3 [&_pre]:text-slate-100 [&_code]:text-sm ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
