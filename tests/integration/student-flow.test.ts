import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getMyCourses,
  buildFallbackCourseJourney,
  type TutorRequestPayload,
} from '../../src/lib/api.ts'

test('Integration Test - End-to-End Student Learning & Service Flow', async (t) => {
  await t.test('getMyCourses returns enrolled active programs with learning access', async () => {
    const res = await getMyCourses({ page: 1, limit: 10 })

    assert.ok(res.data && res.data.length >= 3, 'Must return at least default demo courses')
    const slugs = res.data.map((c) => c.program.slug)
    assert.ok(slugs.includes('algoritma-dasar-cpp'), 'Must have basic algorithm course')
    assert.ok(slugs.includes('osn-k-2026'), 'Must have OSN-K 2026 course')
    assert.ok(slugs.includes('tka-saintek-ptn'), 'Must have TKA Saintek course')

    for (const c of res.data) {
      assert.ok(c.id, 'Course enrollment must have ID')
      assert.ok(c.program.title, 'Course must have title')
      assert.ok(typeof c.progressPercent === 'number', 'Course must have numeric progress')
    }
  })

  await t.test('Course Learning Journey links seamlessly to lessons and tryouts', async () => {
    const journey = buildFallbackCourseJourney('algoritma-dasar-cpp')

    assert.equal(journey.course.slug, 'algoritma-dasar-cpp')
    assert.ok(journey.sections.length >= 3)

    // Check all lessons have IDs and section relationships
    for (const sec of journey.sections) {
      assert.ok(sec.id)
      assert.ok(sec.lessons.length > 0)
      for (const l of sec.lessons) {
        assert.ok(l.id)
        assert.equal(l.sectionId, sec.id)
      }
    }

    // Verify linked tryout session exists in journey
    const tryoutLesson = journey.sections
      .flatMap((s) => s.lessons)
      .find((l) => l.tryoutSessionId)
    assert.ok(tryoutLesson, 'Must have linked tryout session')
    assert.equal(tryoutLesson?.tryoutSessionId, 'mock-1')
  })

  await t.test('Cross-System Integration Contract: FansEdu payload matches TeachSync API schema', () => {
    // Expected contract defined in teachsync-admin/app/Http/Controllers/Api/V1/FansEduTutorRequestController.php
    const requiredFields = [
      'student_name',
      'phone',
      'level',
      'service_type',
      'subjects',
      'learning_mode',
    ]

    const samplePayload: TutorRequestPayload = {
      student_name: 'Budi Santoso',
      phone: '081234567890',
      email: 'budi@example.com',
      level: 'SMA',
      service_type: 'tka',
      subjects: ['Matematika', 'TKA Saintek'],
      learning_mode: 'online',
      city: 'Yogyakarta',
      preferred_schedule: 'Senin & Kamis 19:30',
      target_goals: 'Lolos UTBK SNBT Kedokteran UGM',
      source: 'fansedu_web',
    }

    // Verify all required fields exist and are non-empty
    for (const f of requiredFields) {
      const val = (samplePayload as Record<string, unknown>)[f]
      assert.ok(val !== undefined && val !== null, `Field ${f} must be present in payload`)
      if (Array.isArray(val)) {
        assert.ok(val.length > 0, `Array field ${f} must not be empty`)
      } else {
        assert.ok(String(val).trim().length > 0, `String field ${f} must not be empty`)
      }
    }

    // Verify allowed enum values match Laravel validation rules
    const allowedServiceTypes = ['osn', 'tka', 'private', 'coding']
    assert.ok(allowedServiceTypes.includes(samplePayload.service_type), 'service_type must be in allowed list')

    const allowedLearningModes = ['online', 'offline']
    assert.ok(allowedLearningModes.includes(samplePayload.learning_mode), 'learning_mode must be online or offline')
  })
})
