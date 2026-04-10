'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Toast from '@/components/Toast'

interface FollowButtonProps {
  creatorId: string
  initialFollowing: boolean
  followerCount: number
  username?: string
}

export default function FollowButton({
  creatorId,
  initialFollowing,
  followerCount,
  username,
}: FollowButtonProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [count, setCount] = useState(followerCount)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState<{
    text: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  // Don't render if the viewer is the creator
  if (user?.id === creatorId) return null

  const handleToggle = async () => {
    if (!user) {
      router.push('/login')
      return
    }

    if (loading) return
    setLoading(true)

    const newFollowing = !following
    setFollowing(newFollowing)
    setCount((prev) => (newFollowing ? prev + 1 : Math.max(0, prev - 1)))

    try {
      if (newFollowing) {
        const { error } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: creatorId })
        if (error) throw error
        setToast({
          text: username ? `Now following ${username}` : 'Now following',
          type: 'success',
        })
      } else {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', creatorId)
        if (error) throw error
        setToast({
          text: username ? `Unfollowed ${username}` : 'Unfollowed',
          type: 'info',
        })
      }
    } catch {
      setFollowing(!newFollowing)
      setCount((prev) => (newFollowing ? Math.max(0, prev - 1) : prev + 1))
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
          duration={2500}
        />
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={handleToggle}
          disabled={loading}
          className={`px-5 py-2 rounded-full text-sm font-medium border transition-all disabled:opacity-60 ${
            following
              ? 'bg-[#0069f0] text-white border-[#0069f0] hover:bg-[#0052c7]'
              : 'bg-white text-[#0069f0] border-[#0069f0] hover:bg-blue-50'
          }`}
        >
          {following ? 'Following' : 'Follow'}
        </button>
        <span className="text-sm text-gray-500">
          {count} {count === 1 ? 'follower' : 'followers'}
        </span>
      </div>
    </>
  )
}
