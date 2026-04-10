'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import StarRating from '@/components/StarRating'

interface Review {
  id: number
  rating: number
  review_text: string | null
  created_at: string
  user_profiles: {
    username: string | null
  } | null
}

interface ReviewsListProps {
  itineraryId: number
  refreshKey?: number
  currentUserReview?: { id: number; rating: number; review_text: string | null } | null
  onEditClick?: () => void
}

export default function ReviewsList({ itineraryId, refreshKey, currentUserReview, onEditClick }: ReviewsListProps) {
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchReviews() {
      setLoading(true)
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          review_text,
          created_at,
          user_profiles (
            username
          )
        `)
        .eq('itinerary_id', itineraryId)
        .order('created_at', { ascending: false })

      if (!error && data) {
        setReviews(data as unknown as Review[])
      }
      setLoading(false)
    }

    fetchReviews()
  }, [itineraryId, refreshKey])

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0

  // Per-star counts for bar chart
  const starCounts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  for (const r of reviews) {
    const star = Math.round(r.rating)
    if (star >= 1 && star <= 5) starCounts[star]++
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
            <div className="flex gap-3 mb-2">
              <div className="h-4 w-24 bg-gray-200 rounded" />
              <div className="h-4 w-16 bg-gray-200 rounded" />
            </div>
            <div className="h-4 w-full bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    )
  }

  // Separate current user's review from the rest
  const myReview = currentUserReview
    ? reviews.find((r) => r.id === currentUserReview.id) ?? null
    : null
  const otherReviews = myReview ? reviews.filter((r) => r.id !== myReview.id) : reviews

  return (
    <div>
      {/* Summary */}
      <div className="flex items-center gap-3 mb-6">
        {reviews.length > 0 ? (
          <>
            <StarRating rating={Math.round(avgRating)} size="md" />
            <span className="text-lg font-semibold text-[#2C2C2C]">
              {avgRating.toFixed(1)}
            </span>
            <span className="text-gray-500 text-sm">
              ({reviews.length} {reviews.length === 1 ? 'review' : 'reviews'})
            </span>
          </>
        ) : (
          <p className="text-gray-500 text-sm">
            No reviews yet — be the first!
          </p>
        )}
      </div>

      {/* Rating breakdown bar chart */}
      {reviews.length > 0 && (
        <div className="mb-6 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = starCounts[star]
            const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0
            return (
              <div key={star} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-5 text-right flex-shrink-0">{star}★</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-400 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-4 flex-shrink-0">{count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Your review pinned at top */}
      {myReview && (
        <div className="mb-4 bg-blue-50 border border-blue-100 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-[#0069f0] uppercase tracking-wide">
                Your review
              </span>
              <StarRating rating={myReview.rating} size="sm" />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">
                {new Date(myReview.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              {onEditClick && (
                <button
                  onClick={onEditClick}
                  className="text-xs text-[#0069f0] hover:underline font-medium"
                >
                  Edit
                </button>
              )}
            </div>
          </div>
          {myReview.review_text && (
            <p className="text-gray-700 text-[15px] leading-relaxed">
              {myReview.review_text}
            </p>
          )}
        </div>
      )}

      {/* Other reviews */}
      {otherReviews.length > 0 && (
        <div className="space-y-4">
          {otherReviews.map((review) => (
            <div
              key={review.id}
              className="bg-gray-50 border border-gray-100 rounded-xl p-5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-[#2C2C2C] text-sm">
                    {review.user_profiles?.username || 'Traveller'}
                  </span>
                  <StarRating rating={review.rating} size="sm" />
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(review.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </span>
              </div>
              {review.review_text && (
                <p className="text-gray-700 text-[15px] leading-relaxed">
                  {review.review_text}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
