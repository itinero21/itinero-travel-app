export default function ItineraryCardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden animate-pulse">
      {/* Image skeleton */}
      <div className="aspect-[4/3] bg-gray-200" />

      {/* Content skeleton */}
      <div className="p-6 space-y-3">
        {/* Destination */}
        <div className="h-4 bg-gray-200 rounded w-1/3" />

        {/* Title */}
        <div className="h-6 bg-gray-200 rounded w-3/4" />

        {/* Description */}
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
        </div>

        {/* Dates */}
        <div className="h-4 bg-gray-200 rounded w-2/3" />

        {/* Days planned */}
        <div className="h-16 bg-gray-200 rounded" />
      </div>
    </div>
  )
}
