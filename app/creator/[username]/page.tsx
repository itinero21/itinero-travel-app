'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import ItineraryCardSkeleton from '@/components/ItineraryCardSkeleton'

interface ItineraryDay {
  id: number
  day_number: number
  title: string
  activities: string[]
}

interface Itinerary {
  id: number
  title: string
  description: string
  destination: string
  start_date: string | null
  end_date: string | null
  photos: string[] | null
  created_at: string
  itinerary_days: ItineraryDay[]
}

interface CreatorProfile {
  id: string
  username: string
  bio: string | null
  email: string
}

export default function CreatorProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { loading: authLoading } = useAuth()
  const [creator, setCreator] = useState<CreatorProfile | null>(null)
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function fetchCreatorAndItineraries() {
      if (!params.username) return

      try {
        // Fetch creator profile
        const { data: creatorData, error: creatorError } = await supabase
          .from('user_profiles')
          .select('id, username, bio, email')
          .eq('username', params.username)
          .single()

        if (creatorError || !creatorData) {
          setNotFound(true)
          setLoading(false)
          return
        }

        setCreator(creatorData)

        // Fetch creator's public itineraries
        const { data: itinerariesData, error: itinerariesError } = await supabase
          .from('itineraries')
          .select(`
            *,
            itinerary_days (
              id,
              day_number,
              title,
              activities
            )
          `)
          .eq('user_id', creatorData.id)
          .eq('is_public', true)
          .order('created_at', { ascending: false })

        if (itinerariesError) throw itinerariesError

        // Sort itinerary_days by day_number
        const sortedData = (itinerariesData || []).map(itinerary => ({
          ...itinerary,
          itinerary_days: (itinerary.itinerary_days || []).sort(
            (a, b) => a.day_number - b.day_number
          )
        }))

        setItineraries(sortedData)
      } catch (error) {
        console.error('Error fetching creator data:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchCreatorAndItineraries()
    }
  }, [params.username, authLoading])

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <Link href="/" className="text-2xl font-semibold text-[#2C2C2C] tracking-tight">
              Itinero
            </Link>
          </div>
        </nav>
        <div className="max-w-6xl mx-auto px-6 py-16 animate-pulse">
          {/* Profile skeleton */}
          <div className="bg-white border border-gray-100 rounded-2xl p-8 mb-12">
            <div className="flex items-start gap-6">
              <div className="w-24 h-24 bg-gray-200 rounded-full" />
              <div className="flex-1 space-y-3">
                <div className="h-10 bg-gray-200 rounded w-1/3" />
                <div className="h-6 bg-gray-200 rounded w-2/3" />
                <div className="h-5 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
          </div>
          {/* Itineraries skeleton */}
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <ItineraryCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !creator) {
    return (
      <div className="min-h-screen bg-white">
        <nav className="border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-6 py-5">
            <Link href="/" className="text-2xl font-semibold text-[#2C2C2C] tracking-tight">
              Itinero
            </Link>
          </div>
        </nav>
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <div className="text-6xl mb-6">👤</div>
          <h1 className="text-4xl font-semibold text-[#2C2C2C] mb-4">
            Creator Not Found
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            This creator profile doesn't exist.
          </p>
          <Link
            href="/browse"
            className="inline-block bg-[#0069f0] text-white px-8 py-3 rounded-full text-[15px] font-medium hover:bg-[#0052c7] transition-colors"
          >
            Browse Itineraries
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-semibold text-[#2C2C2C] tracking-tight">
              Itinero
            </Link>
            <Link
              href="/browse"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Back to browse
            </Link>
          </div>
        </div>
      </nav>

      {/* Profile Section */}
      <div className="max-w-6xl mx-auto px-6 py-16">
        {/* Creator Info */}
        <div className="bg-white border border-gray-100 rounded-2xl p-8 mb-12">
          <div className="flex items-start gap-6">
            <div className="flex-shrink-0 w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
              <span className="text-4xl">👤</span>
            </div>
            <div className="flex-1">
              <h1 className="text-4xl font-semibold text-[#2C2C2C] mb-2">
                {creator.username}
              </h1>
              {creator.bio && (
                <p className="text-lg text-gray-700 leading-relaxed mb-4">
                  {creator.bio}
                </p>
              )}
              <div className="flex items-center gap-2 text-gray-500">
                <span>✈️</span>
                <span className="text-sm">
                  {itineraries.length} {itineraries.length === 1 ? 'trip' : 'trips'} shared
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Itineraries Section */}
        <div>
          <h2 className="text-3xl font-semibold text-[#2C2C2C] mb-8">
            Shared Itineraries
          </h2>

          {itineraries.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-2xl font-semibold text-[#2C2C2C] mb-2">
                No public itineraries yet
              </h3>
              <p className="text-gray-600">
                {creator.username} hasn't shared any trips yet.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {itineraries.map((itinerary) => (
                <Link
                  key={itinerary.id}
                  href={`/itinerary/${itinerary.id}`}
                  className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300 cursor-pointer"
                >
                  {/* Image */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden">
                    {itinerary.photos && itinerary.photos.length > 0 ? (
                      <img
                        src={itinerary.photos[0]}
                        alt={itinerary.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-6xl opacity-60">📸</span>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <span>📍</span>
                      <span>{itinerary.destination}</span>
                    </div>

                    <h3 className="text-xl font-semibold text-[#2C2C2C] mb-2 group-hover:text-[#0069f0] transition-colors">
                      {itinerary.title}
                    </h3>

                    <p className="text-gray-600 text-[15px] leading-relaxed mb-4 line-clamp-3">
                      {itinerary.description}
                    </p>

                    {itinerary.start_date && itinerary.end_date && (
                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                        <span>📅</span>
                        <span>
                          {new Date(itinerary.start_date).toLocaleDateString()} -{' '}
                          {new Date(itinerary.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    )}

                    {itinerary.itinerary_days && itinerary.itinerary_days.length > 0 && (
                      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          📅 {itinerary.itinerary_days.length} Day{itinerary.itinerary_days.length > 1 ? 's' : ''} Planned
                        </p>
                        <div className="text-xs text-gray-600">
                          {itinerary.itinerary_days[0]?.title}: {itinerary.itinerary_days[0]?.activities[0]}
                          {itinerary.itinerary_days[0]?.activities.length > 1 && ` +${itinerary.itinerary_days[0].activities.length - 1} more`}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
