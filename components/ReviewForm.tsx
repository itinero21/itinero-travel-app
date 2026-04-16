'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import StarRating from '@/components/StarRating'
import Toast from '@/components/Toast'
import MarkUsedButton from '@/components/MarkUsedButton'

interface ExistingReview {
  id: number
  rating: number
  review_text: string | null
}

interface ReviewFormProps {
  itineraryId: number
  itineraryOwnerId: string
  existingReview: ExistingReview | null
  onSubmit: () => void
  hasUsed?: boolean
  onMarkedUsed?: () => void
}

export default function ReviewForm({
  itineraryId,
  itineraryOwnerId,
  existingReview,
  onSubmit,
  hasUsed,
  onMarkedUsed,
}: ReviewFormProps) {
  const { user } = useAuth()
  const [rating, setRating] = useState(existingReview?.rating ?? 0)
  const [text, setText] = useState(existingReview?.review_text ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{
    text: string
    type: 'success' | 'error'
  } | null>(null)

  // Don't render for the owner or if not logged in
  if (!user || user.id === itineraryOwnerId) return null

  // Gate: show prompt if user hasn't marked this trip as used
  if (hasUsed === false) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🗺️</span>
          <div>
            <p className="font-semibold text-[#2C2C2C] mb-1">
              Have you used this itinerary?
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Mark this trip as used before leaving a review.
            </p>
            <MarkUsedButton
              itineraryId={itineraryId}
              itineraryOwnerId={itineraryOwnerId}
              initialUsed={false}
              onMarkedUsed={onMarkedUsed}
            />
          </div>
        </div>
      </div>
    )
  }

  const isEditing = !!existingReview

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setToast({ text: 'Please select a star rating', type: 'error' })
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.from('reviews').upsert(
        {
          itinerary_id: itineraryId,
          user_id: user.id,
          rating,
          review_text: text.trim() || null,
        },
        { onConflict: 'user_id,itinerary_id' }
      )
      if (error) throw error
      setToast({ text: isEditing ? 'Review updated!' : 'Review posted!', type: 'success' })
      onSubmit()
    } catch {
      setToast({ text: 'Failed to submit review', type: 'error' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.text}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={2500}
        />
      )}
      <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <h3 className="text-base font-semibold text-[#2C2C2C] mb-4">
          {isEditing ? 'Edit your review' : 'Write a review'}
        </h3>
        <div className="mb-4">
          <StarRating
            rating={rating}
            interactive
            onRate={setRating}
            size="lg"
          />
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Share what it was actually like..."
          className="w-full px-4 py-3 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all resize-none mb-4"
        />
        <button
          type="submit"
          disabled={submitting}
          className="bg-[#0069f0] text-white px-6 py-2.5 rounded-full text-[15px] font-medium hover:bg-[#0052c7] disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Submitting...' : isEditing ? 'Update review' : 'Post review'}
        </button>
      </form>
    </>
  )
}
