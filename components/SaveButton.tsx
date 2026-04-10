'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Toast from '@/components/Toast'

interface SaveButtonProps {
  itineraryId: number
  initialSaved: boolean
  showCount?: boolean
  count?: number
}

export default function SaveButton({
  itineraryId,
  initialSaved,
  showCount = false,
  count = 0,
}: SaveButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [saved, setSaved] = useState(initialSaved)
  const [saveCount, setSaveCount] = useState(count)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{
    text: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!user) {
      router.push('/login')
      return
    }

    if (loading) return
    setLoading(true)

    const newSaved = !saved
    setSaved(newSaved)
    setSaveCount((prev) => (newSaved ? prev + 1 : Math.max(0, prev - 1)))

    try {
      if (newSaved) {
        const { error } = await supabase
          .from('saved_itineraries')
          .insert({ user_id: user.id, itinerary_id: itineraryId })
        if (error) throw error
        setToast({ text: 'Saved!', type: 'success' })
      } else {
        const { error } = await supabase
          .from('saved_itineraries')
          .delete()
          .eq('user_id', user.id)
          .eq('itinerary_id', itineraryId)
        if (error) throw error
        setToast({ text: 'Removed from saved', type: 'info' })
      }
    } catch {
      setSaved(!newSaved)
      setSaveCount((prev) => (newSaved ? Math.max(0, prev - 1) : prev + 1))
      setToast({ text: 'Something went wrong', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.text}
          type={toast.type}
          onClose={() => setToast(null)}
          duration={2000}
        />
      )}
      <button
        onClick={handleToggle}
        disabled={loading}
        aria-label={saved ? 'Remove from saved' : 'Save itinerary'}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium border transition-all disabled:opacity-60 ${
          saved
            ? 'bg-[#0069f0] text-white border-[#0069f0] hover:bg-[#0052c7]'
            : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
        }`}
      >
        {saved ? (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17 3H7a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2z" />
          </svg>
        ) : (
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M17 3H7a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2z" />
          </svg>
        )}
        {showCount && <span>{saveCount}</span>}
      </button>
    </>
  )
}
