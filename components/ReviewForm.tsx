'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import StarRating from '@/components/StarRating'
import Toast from '@/components/Toast'

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
}

export default function ReviewForm({
  itineraryId,
  itineraryOwnerId,
  existingReview,
  onSubmit,
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
