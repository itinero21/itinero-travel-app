'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchTopCreators, type CreatorScoreData } from '@/lib/creatorScore'

export default function TopCreators() {
  const [creators, setCreators] = useState<CreatorScoreData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTopCreators(5).then((data) => {
      setCreators(data)
      setLoading(false)
    })
  }, [])

  // Don't render if fewer than 3 creators exist
  if (!loading && creators.length < 3) return null

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-52 bg-gray-50 border border-gray-100 rounded-2xl p-5 animate-pulse"
          >
            <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-3" />
            <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2" />
            <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {creators.map((creator, index) => {
        const isTopThree = index < 3
        const initial = creator.username.charAt(0).toUpperCase()

        return (
          <Link
            key={creator.id}
            href={`/creator/${creator.username}`}
            className="flex-shrink-0 w-52 bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-200 group"
          >
            {/* Avatar */}
            <div className="relative w-14 h-14 mx-auto mb-3">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                <span className="text-xl font-bold text-[#2C2C2C]">{initial}</span>
              </div>
              {isTopThree && (
                <span className="absolute -top-1 -right-1 text-base">🏆</span>
              )}
            </div>

            {/* Name + badge */}
            <div className="text-center mb-3">
              <p className="font-semibold text-[#2C2C2C] text-sm truncate group-hover:text-[#0069f0] transition-colors">
                {creator.username}
              </p>
              {isTopThree && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  Top creator
                </span>
              )}
            </div>

            {/* Stats */}
            <div className="space-y-1 text-xs text-gray-500 text-center">
              <p>✈️ {creator.trips} {creator.trips === 1 ? 'trip' : 'trips'}</p>
              {creator.avgRating > 0 && (
                <p className="text-amber-600 font-medium">★ {creator.avgRating}</p>
              )}
              <p>👥 {creator.followers} {creator.followers === 1 ? 'follower' : 'followers'}</p>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
