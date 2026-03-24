/**
 * Provinsi & kabupaten/kota untuk form alamat (mis. profil instruktur).
 * - Sumber default: API publik emsifa (kompatibel dengan backend internal).
 * - Cache browser (localStorage) mengurangi load berulang; backend Redis tetap disarankan untuk latency konsisten.
 * @see docs/GEO_REDIS_BACKEND.md
 */
import { API_BASE } from './api-config'

export interface GeoProvinceItem {
  id: string
  name: string
}

export interface GeoCityItem {
  id: string
  name: string
}

const PUBLIC_PROVINCES_URL =
  'https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json'
const publicRegenciesUrl = (provinceId: string) =>
  `https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${encodeURIComponent(provinceId)}.json`

const CACHE_VERSION = 'v1'
const PROVINCES_CACHE_KEY = `fansedu_geo_provinces_${CACHE_VERSION}`
const regenciesCacheKey = (provinceId: string) =>
  `fansedu_geo_regencies_${provinceId}_${CACHE_VERSION}`

/** Default 7 hari — data wilayah jarang berubah */
const DEFAULT_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000

function getGeoSource(): 'internal' | 'public' {
  const v = (import.meta.env.VITE_GEO_SOURCE as string | undefined)?.toLowerCase()
  if (v === 'internal' || v === 'api') return 'internal'
  return 'public'
}

function provincesUrl(): string {
  return getGeoSource() === 'internal'
    ? `${API_BASE}/geo/provinces`
    : PUBLIC_PROVINCES_URL
}

function regenciesUrl(provinceId: string): string {
  return getGeoSource() === 'internal'
    ? `${API_BASE}/geo/regencies/${encodeURIComponent(provinceId)}`
    : publicRegenciesUrl(provinceId)
}

interface StoredCache<T> {
  ts: number
  data: T
}

function readCache<T>(key: string, ttlMs: number): T | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredCache<T>
    if (!parsed || typeof parsed.ts !== 'number' || parsed.data === undefined) return null
    if (Date.now() - parsed.ts > ttlMs) {
      localStorage.removeItem(key)
      return null
    }
    return parsed.data
  } catch {
    return null
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    const payload: StoredCache<T> = { ts: Date.now(), data }
    localStorage.setItem(key, JSON.stringify(payload))
  } catch {
    // quota penuh / private mode — abaikan
  }
}

function parseWilayahRows(rows: unknown): Array<{ id: string; name: string }> {
  const list = Array.isArray(rows) ? rows.map((item) => item as Record<string, unknown>) : []
  return list
    .map((item) => ({
      id: String(item.id ?? ''),
      name: String(item.name ?? ''),
    }))
    .filter((item) => item.id && item.name)
}

/**
 * Daftar provinsi (dengan cache localStorage).
 */
export async function fetchProvinces(options?: { cacheTtlMs?: number }): Promise<GeoProvinceItem[]> {
  const ttl = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS
  const url = provincesUrl()
  const cacheKey = `${PROVINCES_CACHE_KEY}:${url}`

  const cached = readCache<GeoProvinceItem[]>(cacheKey, ttl)
  if (cached && cached.length > 0) return cached

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Gagal memuat provinsi (${res.status})`)
  const rows: unknown = await res.json()
  const parsed = parseWilayahRows(rows) as GeoProvinceItem[]
  writeCache(cacheKey, parsed)
  return parsed
}

/**
 * Daftar kabupaten/kota untuk satu provinsi (dengan cache localStorage).
 */
export async function fetchRegenciesByProvince(
  provinceId: string,
  options?: { cacheTtlMs?: number }
): Promise<GeoCityItem[]> {
  if (!provinceId.trim()) return []
  const ttl = options?.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS
  const url = regenciesUrl(provinceId)
  const cacheKey = `${regenciesCacheKey(provinceId)}:${url}`

  const cached = readCache<GeoCityItem[]>(cacheKey, ttl)
  if (cached && cached.length > 0) return cached

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Gagal memuat kabupaten/kota (${res.status})`)
  const rows: unknown = await res.json()
  const parsed = parseWilayahRows(rows) as GeoCityItem[]
  writeCache(cacheKey, parsed)
  return parsed
}
