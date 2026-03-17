import type { Course } from '../../types/course'
import { formatRupiah } from '../../lib/currency'

export function CourseCard({ course }: { course: Course }) {
  const showEarlyBird = course.priceEarlyBird ?? null
  const showNormal = course.priceNormal ?? null
  const normalNum = showNormal ?? 0
  const earlyNum = showEarlyBird ?? 0
  const hasDiscount = normalNum > 0 && earlyNum > 0 && normalNum > earlyNum
  const discount = hasDiscount ? normalNum - earlyNum : 0

  return (
    <a href={`#/program/${course.slug}`} className="block rounded-2xl border bg-white overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all">
      <div className="aspect-video bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-300">
        {course.thumbnail ? <img src={course.thumbnail} alt="" className="w-full h-full object-cover" /> : course.title.charAt(0)}
      </div>
      <div className="p-4">
        <p className="text-xs font-medium text-primary uppercase mb-1">{course.category}</p>
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{course.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{course.shortDescription}</p>
        <div className="flex justify-between items-end">
          <div className="space-y-0.5">
            {showNormal && (
              <p className="text-xs text-gray-400 line-through">
                Harga normal: {formatRupiah(showNormal)}
              </p>
            )}
            {showEarlyBird && (
              <p className="text-sm font-semibold text-primary">
                Harga promo (Early bird): {formatRupiah(showEarlyBird)}
              </p>
            )}
            {hasDiscount && (
              <p className="text-xs font-medium text-green-600">
                Hemat Rp{discount.toLocaleString('id-ID')}
              </p>
            )}
            {!showEarlyBird && !showNormal && (
              <p className="text-sm font-semibold text-primary">
                {formatRupiah(course.price)}
              </p>
            )}
          </div>
          {course.rating != null && <span className="text-sm text-gray-500">★ {course.rating}</span>}
        </div>
      </div>
    </a>
  )
}
