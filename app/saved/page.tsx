'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ItineraryCardSkeleton from '@/components/ItineraryCardSkeleton'
import ImageWithFallback from '@/components/ImageWithFallback'
import SaveButton from '@/components/SaveButton'

interface SavedItinerary {
  id: number
  title: string
  description: string
  destination: string
  start_date: string | null
  end_date: string | null
  photos: string[] | null
  budget: string | null
  created_at: string
  user_profiles: {
    username: string | null
  } | null
}

export default function SavedPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [itineraries, setItineraries] = useState<SavedItinerary[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    async function fetchSaved() {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('saved_itineraries')
          .select(`
            itinerary_id,
            itineraries (
              id,
              title,
              description,
              destination,
              start_date,
              end_date,
              photos,
              budget,
              created_at,
              user_profiles (
                username
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        const extracted = (data || [])
          .map((row) => row.itineraries as unknown as SavedItinerary)
          .filter(Boolean)

        setItineraries(extracted)
      } catch (error) {
        console.error('Error fetching saved itineraries:', error)
      } finally {
        setLoadingData(false)
      }
    }

    if (user) {
      fetchSaved()
    }
  }, [user])

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-xl">Loading...</p>
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
              Browse all trips
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-5xl font-semibold text-[#2C2C2C] mb-4">
            Saved Trips
          </h1>
          <p className="text-xl text-gray-600">
            Your personal collection of travel itineraries
          </p>
        </div>

        {loadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <ItineraryCardSkeleton key={i} />
            ))}
          </div>
        ) : itineraries.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🔖</div>
            <h3 className="text-2xl font-semibold text-[#2C2C2C] mb-2">
              No saved trips yet
            </h3>
            <p className="text-gray-600 mb-6">
              Browse itineraries and save ones you love
            </p>
            <Link
              href="/browse"
              className="inline-block bg-[#0069f0] text-white px-8 py-3 rounded-full text-[15px] font-medium hover:bg-[#0052c7] transition-colors"
            >
              Browse Itineraries
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-8">
              {itineraries.length} saved {itineraries.length === 1 ? 'trip' : 'trips'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {itineraries.map((itinerary) => (
                <Link
                  key={itinerary.id}
                  href={`/itinerary/${itinerary.id}`}
                  className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300"
                >
                  {/* Image */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden relative">
                    {itinerary.photos && itinerary.photos.length > 0 ? (
                      <ImageWithFallback
                        src={itinerary.photos[0]}
                        alt={itinerary.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <span className="text-6xl opacity-60">📸</span>
                    )}
                    <div className="absolute top-3 right-3">
                      <SaveButton
                        itineraryId={itinerary.id}
                        initialSaved={true}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <span>📍</span>
                      <span>{itinerary.destination}</span>
                    </div>

                    {itinerary.user_profiles?.username && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <span>👤</span>
                        <span>by {itinerary.user_profiles.username}</span>
                      </div>
                    )}

                    <h3 className="text-xl font-semibold text-[#2C2C2C] mb-2 group-hover:text-[#0069f0] transition-colors">
                      {itinerary.title}
                    </h3>

                    <p className="text-gray-600 text-[15px] leading-relaxed mb-4 line-clamp-3">
                      {itinerary.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      {itinerary.start_date && itinerary.end_date && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <span>📅</span>
                          <span>
                            {new Date(itinerary.start_date).toLocaleDateString()} -{' '}
                            {new Date(itinerary.end_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {itinerary.budget && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                          <span>💰</span>
                          {itinerary.budget}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
