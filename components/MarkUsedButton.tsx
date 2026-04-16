'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Toast from '@/components/Toast'

interface MarkUsedButtonProps {
  itineraryId: number
  itineraryOwnerId: string
  initialUsed: boolean
  onMarkedUsed?: () => void
}

export default function MarkUsedButton({
  itineraryId,
  itineraryOwnerId,
  initialUsed,
  onMarkedUsed,
}: MarkUsedButtonProps) {
  const { user } = useAuth()
  const [isUsed, setIsUsed] = useState(initialUsed)
  const [pending, setPending] = useState(false)
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Hide for owner and unauthenticated users
  if (!user || user.id === itineraryOwnerId) return null

  const handleMarkUsed = async () => {
    if (isUsed || pending) return

    setIsUsed(true) // optimistic
    setPending(true)
    try {
      const { error } = await supabase
        .from('used_itineraries')
        .insert({ user_id: user.id, itinerary_id: itineraryId })

      if (error) throw error

      setToast({ text: 'Marked as used — you can now leave a review!', type: 'success' })
      onMarkedUsed?.()
    } catch {
      setIsUsed(false) // revert
      setToast({ text: 'Failed to mark as used', type: 'error' })
    } finally {
      setPending(false)
    }
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.text}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={3500}
        />
      )}
      {isUsed ? (
        <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium bg-green-100 text-green-700 border border-green-200">
          ✓ Used
        </span>
      ) : (
        <button
          onClick={handleMarkUsed}
          disabled={pending}
          className="px-4 py-2 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors flex items-center gap-2"
        >
          <span>✓</span>
          I used this trip
        </button>
      )}
    </>
  )
}
