import test from 'node:test'
import assert from 'node:assert/strict'
import sampleExam from '../../src/data/tryoutExamSampleExport.json' with { type: 'json' }

test('Tryout System - 5 Question Types & Grading Logic', async (t) => {
  await t.test('sample exam contains all 5 question types', () => {
    const questions = sampleExam.questions
    const types = new Set(questions.map((q) => q.questionType))

    assert.ok(types.has('multiple_choice'), 'Must have multiple_choice (Pilihan Ganda)')
    assert.ok(types.has('true_false'), 'Must have true_false (Benar / Salah)')
    assert.ok(types.has('multi_select'), 'Must have multi_select (Pilihan Ganda Kompleks)')
    assert.ok(types.has('short'), 'Must have short (Isian Singkat)')
    assert.ok(types.has('code'), 'Must have code (Input Kode Program)')
  })

  await t.test('Multiple Choice question has valid options and answer key', () => {
    const mc = sampleExam.questions.find((q) => q.questionType === 'multiple_choice')
    assert.ok(mc, 'MC question found')
    assert.ok(mc.options && mc.options.length >= 4, 'Must have at least 4 options (A, B, C, D)')
    assert.ok(mc.correctOption, 'Must have correctOption')

    // Grading simulation
    const studentAnswer = 'A'
    const isCorrect = studentAnswer === mc.correctOption
    assert.equal(isCorrect, true)
  })

  await t.test('True/False question has 2 options and evaluates truth value', () => {
    const tf = sampleExam.questions.find((q) => q.questionType === 'true_false')
    assert.ok(tf, 'True/False question found')
    assert.ok(tf.options && tf.options.length === 2, 'Must have exactly 2 options')
    assert.ok(['true', 'false', 'B', 'S'].includes(tf.correctOption))

    // Grading simulation
    const studentAnswer = 'true'
    const isCorrect = studentAnswer.toLowerCase() === tf.correctOption.toLowerCase()
    assert.equal(isCorrect, true)
  })

  await t.test('Multi-Select question supports multiple chosen keys', () => {
    const ms = sampleExam.questions.find((q) => q.questionType === 'multi_select')
    assert.ok(ms, 'Multi-Select question found')
    assert.ok(ms.options && ms.options.length >= 3, 'Must have multiple options')
    assert.ok(ms.correctOption.includes(','), 'Correct option should contain multiple keys separated by comma')

    // Grading helper simulation
    function gradeMultiSelect(studentInput: string, correctInput: string): boolean {
      const studentKeys = studentInput.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).sort().join(',')
      const correctKeys = correctInput.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).sort().join(',')
      return studentKeys === correctKeys
    }

    assert.equal(gradeMultiSelect('A, B, C', ms.correctOption), true, 'Sorted comma list matches')
    assert.equal(gradeMultiSelect('C, A, B', ms.correctOption), true, 'Order-independent match')
    assert.equal(gradeMultiSelect('A, B', ms.correctOption), false, 'Partial selection fails strict check')
  })

  await t.test('Short Answer question performs trimmed normalization', () => {
    const sa = sampleExam.questions.find((q) => q.questionType === 'short')
    assert.ok(sa, 'Short answer question found')
    assert.ok(sa.correctOption, 'Must have answer')

    function gradeShortAnswer(studentInput: string, correctInput: string): boolean {
      return studentInput.trim().toLowerCase() === correctInput.trim().toLowerCase()
    }

    assert.equal(gradeShortAnswer(' 10  ', sa.correctOption), true)
    assert.equal(gradeShortAnswer('10', sa.correctOption), true)
    assert.equal(gradeShortAnswer('9', sa.correctOption), false)
  })

  await t.test('Coding Problem provides multi-language support (C++, Python, Go)', () => {
    const cp = sampleExam.questions.find((q) => q.questionType === 'code')
    assert.ok(cp, 'Coding question found')
    assert.ok(Array.isArray(cp.allowedLanguages), 'Must have allowedLanguages')
    assert.ok(cp.allowedLanguages?.includes('cpp'), 'Must support C++')
    assert.ok(cp.allowedLanguages?.includes('python'), 'Must support Python')
    assert.ok(cp.allowedLanguages?.includes('go'), 'Must support Go')

    // Starter code templates
    assert.ok(cp.starterCode?.cpp?.includes('#include'), 'C++ starter code must include header')
    assert.ok(cp.starterCode?.python?.includes('def solve'), 'Python starter code must have solve')
    assert.ok(cp.starterCode?.go?.includes('package main'), 'Go starter code must have package main')

    // Sample Test Cases
    assert.ok(cp.sampleInput, 'Must have sampleInput')
    assert.ok(cp.sampleOutput, 'Must have sampleOutput')
  })
})
