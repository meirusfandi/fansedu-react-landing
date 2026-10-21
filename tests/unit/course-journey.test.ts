import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildFallbackCourseJourney,
  getCourseJourney,
  getCourseLessonDetail,
} from '../../src/lib/api.ts'

test('Course Learning Journey - Structure & Modules', async (t) => {
  await t.test('buildFallbackCourseJourney produces complete meeting syllabus', () => {
    const journey = buildFallbackCourseJourney('osn-k-2026')

    assert.ok(journey, 'Journey must be created')
    assert.equal(journey.course.slug, 'osn-k-2026')
    assert.ok(journey.sections.length >= 3, 'Must have at least 3 sections (Pertemuan 1, 2, Evaluasi)')

    // Pertemuan 1 checks
    const sec1 = journey.sections[0]
    assert.ok(sec1.title.includes('Pertemuan 1'), 'Section 1 must be Pertemuan 1')
    const sec1Types = sec1.lessons.map((l) => l.type)
    assert.ok(sec1Types.includes('pre_test'), 'Must have Pre-Test')
    assert.ok(sec1Types.includes('meeting'), 'Must have Meeting detail')
    assert.ok(sec1Types.includes('pdf'), 'Must have PDF module')
    assert.ok(sec1Types.includes('slide'), 'Must have PPT slide')
    assert.ok(sec1Types.includes('video'), 'Must have Zoom recording video')
    assert.ok(sec1Types.includes('assets'), 'Must have Assets')
    assert.ok(sec1Types.includes('quiz'), 'Must have Quiz')
    assert.ok(sec1Types.includes('post_test'), 'Must have Post-Test')

    // Evaluasi Akhir checks
    const evalSec = journey.sections.find((s) => s.title.includes('Evaluasi') || s.title.includes('Tryout'))
    assert.ok(evalSec, 'Must have Evaluation section')
    const hasTryout = evalSec?.lessons.some((l) => l.tryoutSessionId)
    assert.ok(hasTryout, 'Evaluation section must contain linked tryout')

    // Total lessons integrity
    const actualTotal = journey.sections.reduce((sum, s) => sum + s.lessons.length, 0)
    assert.equal(journey.totalLessons, actualTotal, 'Total lessons must match actual lesson count')
  })

  await t.test('getCourseLessonDetail resolves rich details for all module types', async () => {
    // 1. Meeting Detail
    const meetingLesson = await getCourseLessonDetail('p1-meeting-test')
    assert.ok(meetingLesson, 'Meeting lesson must be found')
    assert.equal(meetingLesson.type, 'meeting')
    assert.ok(meetingLesson.meetingInfo, 'Must have meetingInfo')
    assert.equal(meetingLesson.meetingInfo?.meetingNumber, 1)
    assert.ok(meetingLesson.meetingInfo?.dateText, 'Must have meeting date')
    assert.ok(meetingLesson.meetingInfo?.mentorName, 'Must have mentor name')
    assert.ok(meetingLesson.liveClassUrl, 'Must have live class Zoom/Meet URL')

    // 2. Pre-Test
    const preTestLesson = await getCourseLessonDetail('p1-pretest-test')
    assert.ok(preTestLesson, 'Pre-test lesson must be found')
    assert.equal(preTestLesson.type, 'pre_test')
    assert.ok(preTestLesson.quizQuestions && preTestLesson.quizQuestions.length >= 3, 'Must have pre-test questions')
    assert.ok(preTestLesson.quizQuestions[0].correctAnswer, 'Question must have correct answer')
    assert.ok(preTestLesson.quizQuestions[0].explanation, 'Question must have explanation')

    // 3. PDF Module
    const pdfLesson = await getCourseLessonDetail('p1-pdf-test')
    assert.ok(pdfLesson, 'PDF lesson must be found')
    assert.equal(pdfLesson.type, 'pdf')
    assert.ok(pdfLesson.pdfUrl?.endsWith('.pdf'), 'Must have valid PDF URL')

    // 4. PPT Slide Module
    const slideLesson = await getCourseLessonDetail('p1-slide-test')
    assert.ok(slideLesson, 'Slide lesson must be found')
    assert.equal(slideLesson.type, 'slide')
    assert.ok(slideLesson.slideUrl, 'Must have slide URL for PPT preview')

    // 5. Recording Zoom (YouTube)
    const recLesson = await getCourseLessonDetail('p1-recording-test')
    assert.ok(recLesson, 'Recording lesson must be found')
    assert.ok(recLesson.recordingUrl?.includes('youtube.com'), 'Must have YouTube recording URL')

    // 6. Assets & Files
    const assetsLesson = await getCourseLessonDetail('p1-assets-test')
    assert.ok(assetsLesson, 'Assets lesson must be found')
    assert.equal(assetsLesson.type, 'assets')
    assert.ok(assetsLesson.assets && assetsLesson.assets.length >= 4, 'Must have at least 4 downloadable assets')
    const assetTypes = assetsLesson.assets.map((a) => a.type)
    assert.ok(assetTypes.includes('pdf'), 'Must include PDF cheatsheet')
    assert.ok(assetTypes.includes('zip'), 'Must include starter code ZIP')
    assert.ok(assetTypes.includes('code'), 'Must include solution code')

    // 7. Interactive Quiz
    const quizLesson = await getCourseLessonDetail('p1-quiz-test')
    assert.ok(quizLesson, 'Quiz lesson must be found')
    assert.equal(quizLesson.type, 'quiz')
    assert.ok(quizLesson.quizQuestions && quizLesson.quizQuestions.length >= 3, 'Must have quiz questions')

    // 8. Post-Test
    const postTestLesson = await getCourseLessonDetail('p1-posttest-test')
    assert.ok(postTestLesson, 'Post-test lesson must be found')
    assert.equal(postTestLesson.type, 'post_test')
    assert.ok(postTestLesson.quizQuestions && postTestLesson.quizQuestions.length >= 3, 'Must have post-test questions')

    // 9. Final Tryout
    const tryoutLesson = await getCourseLessonDetail('eval-tryout-test')
    assert.ok(tryoutLesson, 'Tryout lesson must be found')
    assert.equal(tryoutLesson.tryoutSessionId, 'mock-1', 'Must link to mock tryout session')
  })
})
