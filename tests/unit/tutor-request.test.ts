import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTutorRequestWhatsAppUrl,
  type TutorRequestPayload,
} from '../../src/lib/api.ts'

test('Tutor Request - WhatsApp URL Builder', async (t) => {
  await t.test('generates valid WhatsApp URL for TKA service', () => {
    const payload: TutorRequestPayload = {
      student_name: 'Fadhil Pratama',
      phone: '081298765432',
      email: 'fadhil@example.com',
      level: 'SMA',
      service_type: 'tka',
      subjects: ['TKA Saintek', 'Matematika'],
      learning_mode: 'online',
      city: 'Yogyakarta',
      preferred_schedule: 'Selasa & Kamis 19:30 WIB',
      target_goals: 'Lolos UTBK SNBT Kedokteran UGM',
    }

    const url = buildTutorRequestWhatsAppUrl(payload)

    assert.ok(url.startsWith('https://wa.me/6285121277161?text='), 'Must target FansEdu WhatsApp number')
    assert.ok(url.includes(encodeURIComponent('Fadhil Pratama')), 'Must contain student name')
    assert.ok(url.includes(encodeURIComponent('Bimbingan TKA (Masuk PTN / SMA Unggulan)')), 'Must contain service label')
    assert.ok(url.includes(encodeURIComponent('TKA Saintek, Matematika')), 'Must contain subjects')
    assert.ok(url.includes(encodeURIComponent('Online Interaktif')), 'Must contain learning mode')
    assert.ok(url.includes(encodeURIComponent('Yogyakarta')), 'Must contain city')
    assert.ok(url.includes(encodeURIComponent('Lolos UTBK SNBT Kedokteran UGM')), 'Must contain target goals')
  })

  await t.test('generates valid WhatsApp URL for Private Offline service', () => {
    const payload: TutorRequestPayload = {
      student_name: 'Anisa Rahma',
      phone: '085612345678',
      level: 'SMP',
      service_type: 'private',
      subjects: ['Matematika Kurikulum Merdeka', 'Fisika'],
      learning_mode: 'offline',
      city: 'Sleman',
      preferred_schedule: 'Sabtu pagi 09:00',
    }

    const url = buildTutorRequestWhatsAppUrl(payload)

    assert.ok(url.includes(encodeURIComponent('Guru Datang ke Rumah (Offline)')), 'Must indicate offline mode')
    assert.ok(url.includes(encodeURIComponent('Kelas Privat Eksklusif (1-on-1)')), 'Must contain private service label')
    assert.ok(url.includes(encodeURIComponent('Sleman')), 'Must contain city')
  })

  await t.test('generates valid WhatsApp URL for OSN Coding service', () => {
    const payload: TutorRequestPayload = {
      student_name: 'Rian Hidayat',
      phone: '087812345678',
      level: 'SMA',
      service_type: 'osn',
      subjects: ['Informatika / Pemrograman C++'],
      learning_mode: 'online',
    }

    const url = buildTutorRequestWhatsAppUrl(payload)
    assert.ok(url.includes(encodeURIComponent('Persiapan OSN (Olimpiade Sains)')), 'Must contain OSN label')
  })
})
