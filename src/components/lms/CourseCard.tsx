import type { Course } from '../../types/course'

export function CourseCard({ course }: { course: Course }) {
  return (
    <a href={`#/program/${course.slug}`} className="block rounded-2xl border bg-white overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all">
      <div className="aspect-video bg-gray-100 flex items-center justify-center text-3xl font-bold text-gray-300">
        {course.thumbnail ? <img src={course.thumbnail} alt="" className="w-full h-full object-cover" /> : course.title.charAt(0)}
      </div>
      <div className="p-4">
        <p className="text-xs font-medium text-primary uppercase mb-1">{course.category}</p>
        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{course.title}</h3>
        <p className="text-sm text-gray-500 line-clamp-2 mb-3">{course.shortDescription}</p>
        <div className="flex justify-between items-center">
          <span className="font-bold text-primary">{course.priceDisplay}</span>
          {course.rating != null && <span className="text-sm text-gray-500">★ {course.rating}</span>}
        </div>
      </div>
    </a>
  )
}
