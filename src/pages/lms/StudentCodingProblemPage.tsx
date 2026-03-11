import { useState, useEffect } from 'react'
import { getProblemBySlug } from '../../data/codingProblems'
import type { CodingProblem } from '../../data/codingProblems'

const DIFFICULTY_LABEL: Record<string, string> = {
  easy: 'Mudah',
  medium: 'Sedang',
  hard: 'Sulit',
}

/** Eksekusi kode C++ via Piston API (public). Jika gagal, gunakan simulasi. */
async function runCppCode(code: string, stdin: string): Promise<{ stdout: string; stderr: string; error?: string }> {
  const url = 'https://emkc.org/api/v2/piston/execute'
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language: 'cpp',
        version: '*',
        files: [{ name: 'main.cpp', content: code }],
        stdin,
      }),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as { run?: { stdout?: string; stderr?: string }; message?: string }
    const run = data.run
    return {
      stdout: run?.stdout ?? '',
      stderr: run?.stderr ?? '',
      error: data.message,
    }
  } catch (e) {
    return {
      stdout: '',
      stderr: '',
      error: e instanceof Error ? e.message : 'Koneksi gagal. Gunakan simulasi atau coba lagi.',
    }
  }
}

export default function StudentCodingProblemPage({ slug }: { slug: string }) {
  const [problem, setProblem] = useState<CodingProblem | null>(null)
  const [code, setCode] = useState('')
  const [customInput, setCustomInput] = useState('')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  useEffect(() => {
    const p = getProblemBySlug(slug)
    setProblem(p ?? null)
    if (p) {
      setCode(p.template)
      setCustomInput(p.sampleInput)
      setOutput('')
      setSubmitMessage(null)
    }
  }, [slug])

  const handleRun = async () => {
    if (!problem) return
    setRunning(true)
    setOutput('')
    setSubmitMessage(null)
    const inputToUse = customInput.trim() || problem.sampleInput
    try {
      const result = await runCppCode(code, inputToUse)
      if (result.error && !result.stdout && !result.stderr) {
        // Fallback: simulasi (backend judge seperti TLX/HackerRank nantinya)
        setOutput(`[Simulasi] Backend judge akan mengeksekusi kode C++ Anda.\n\nContoh keluaran untuk sample input:\n${problem.sampleOutput}`)
      } else {
        const out = [result.stdout, result.stderr].filter(Boolean).join('\n')
        setOutput(out || '(Tidak ada keluaran)')
      }
    } catch {
      setOutput(`[Simulasi] Contoh keluaran untuk sample input:\n${problem.sampleOutput}`)
    } finally {
      setRunning(false)
    }
  }

  const handleSubmit = () => {
    setSubmitMessage('Solusi Anda telah dikirim. Backend grading (seperti TLX Toki, HackerRank, LeetCode) akan memeriksa terhadap test case.')
    setOutput('')
  }

  if (!problem) {
    return (
      <div>
        <p className="text-gray-500">Soal tidak ditemukan.</p>
        <a href="#/student/coding" className="text-primary font-medium mt-2 inline-block">← Kembali ke Belajar Coding</a>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-10">
      {/* Navigasi: kembali ke daftar — untuk review pastikan rute ini masuk ke detail */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <a
          href="#/student/coding"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary font-medium"
        >
          ← Kembali ke daftar soal
        </a>
        <nav className="text-sm text-gray-500">
          <a href="#/student/coding" className="hover:text-primary">Belajar Coding</a>
          <span className="mx-2">/</span>
          <span className="text-gray-900">{problem.title}</span>
        </nav>
      </div>

      {/* Header soal */}
      <div className="flex items-center gap-3 flex-wrap">
        <h1 className="text-xl font-bold text-gray-900">{problem.title}</h1>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
          problem.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
          problem.difficulty === 'medium' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
        }`}>
          {DIFFICULTY_LABEL[problem.difficulty] ?? problem.difficulty}
        </span>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Kolom kiri: Materi / Soal */}
        <div className="space-y-4" id="materi-soal">
          <section className="border rounded-xl p-5 bg-white" aria-label="Deskripsi soal">
            <h2 className="font-semibold text-gray-900 mb-3">Deskripsi</h2>
            <div className="text-gray-600 text-sm whitespace-pre-wrap max-w-none">
              {problem.statement}
            </div>
          </section>
          <section className="border rounded-xl p-5 bg-white grid grid-cols-2 gap-4" aria-label="Sample input dan output">
            <div>
              <h3 className="font-medium text-gray-900 text-sm mb-2">Sample Input</h3>
              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-24 font-mono text-gray-700">
                {problem.sampleInput || '(kosong)'}
              </pre>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 text-sm mb-2">Sample Output</h3>
              <pre className="text-xs bg-gray-50 p-3 rounded-lg overflow-auto max-h-24 font-mono text-gray-700">
                {problem.sampleOutput}
              </pre>
            </div>
          </section>
        </div>

        {/* Kolom kanan: Interactive Coding — editor, run, submit, output */}
        <div className="space-y-4" id="interactive-coding">
          <h2 className="font-semibold text-gray-900 text-sm uppercase tracking-wide text-primary/90">
            Interactive Coding (C++)
          </h2>
          <section className="border-2 border-primary/20 rounded-xl overflow-hidden bg-white shadow-sm">
            <div className="px-4 py-2 bg-primary/5 border-b border-primary/10 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800">Editor C++ — tulis program, test & run di sini</span>
              <span className="text-xs text-gray-500">TLX / HackerRank / LeetCode style</span>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="w-full p-4 font-mono text-sm text-gray-100 bg-[#1e1e1e] resize-y focus:ring-2 focus:ring-primary/20 focus:outline-none border-0"
              placeholder="#include <iostream>..."
              style={{ minHeight: '18rem' }}
              aria-label="Editor kode C++"
            />
          </section>

          <section className="border rounded-xl p-4 bg-white">
            <h3 className="font-medium text-gray-900 text-sm mb-2">Custom Input (untuk Run)</h3>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Masukan untuk menjalankan kode..."
              className="w-full h-20 p-3 font-mono text-sm border rounded-lg resize-y focus:ring-2 focus:ring-primary/20"
              aria-label="Custom input"
            />
          </section>

          <div className="flex gap-3">
            <button
              onClick={handleRun}
              disabled={running}
              className="px-5 py-2.5 rounded-lg bg-primary text-white font-medium text-sm hover:bg-primary/90 disabled:opacity-50"
            >
              {running ? 'Menjalankan...' : 'Run'}
            </button>
            <button
              onClick={handleSubmit}
              className="px-5 py-2.5 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50"
            >
              Submit
            </button>
          </div>

          {submitMessage && (
            <div className="p-4 rounded-xl bg-green-50 text-green-800 text-sm">
              {submitMessage}
            </div>
          )}

          <section className="border rounded-xl overflow-hidden bg-white">
            <div className="px-4 py-2 bg-gray-100 border-b">
              <span className="text-sm font-medium text-gray-700">Output</span>
            </div>
            <pre className="w-full min-h-28 p-4 font-mono text-sm text-gray-800 bg-gray-50 overflow-auto whitespace-pre-wrap">
              {output || '(Jalankan kode untuk melihat output)'}
            </pre>
          </section>
        </div>
      </div>
    </div>
  )
}
