'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
  start_date: string
  end_date: string
  photos: string[]
  recommendations: string
  links: string[]
  created_at: string
  user_profiles: {
    username: string | null
  }
  itinerary_days: ItineraryDay[]
}

export default function BrowsePage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loadingData, setLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    async function fetchItineraries() {
      try {
        const { data, error } = await supabase
          .from('itineraries')
          .select(`
            *,
            user_profiles (
              username
            ),
            itinerary_days (
              id,
              day_number,
              title,
              activities
            )
          `)
          .eq('is_public', true)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Sort itinerary_days by day_number for each itinerary
        const sortedData = (data || []).map(itinerary => ({
          ...itinerary,
          itinerary_days: (itinerary.itinerary_days || []).sort(
            (a, b) => a.day_number - b.day_number
          )
        }))

        setItineraries(sortedData)
      } catch (error) {
        console.error('Error fetching itineraries:', error)
      } finally {
        setLoadingData(false)
      }
    }

    if (user) {
      fetchItineraries()
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
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </nav>

      {/* Browse Section */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-5xl font-semibold text-[#2C2C2C] mb-4">
            Discover Travel Itineraries
          </h1>
          <p className="text-xl text-gray-600">
            Explore amazing trips shared by experienced travelers
          </p>
        </div>

        {loadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-gray-100 h-96 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : itineraries.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🌍</div>
            <h3 className="text-2xl font-semibold text-[#2C2C2C] mb-2">
              No itineraries yet
            </h3>
            <p className="text-gray-600">
              Check back soon for amazing travel experiences!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {itineraries.map((itinerary) => (
              <div
                key={itinerary.id}
                className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300"
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
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        📅 {itinerary.itinerary_days.length} Day{itinerary.itinerary_days.length > 1 ? 's' : ''} Planned
                      </p>
                      <div className="text-xs text-gray-600">
                        {itinerary.itinerary_days[0]?.title}: {itinerary.itinerary_days[0]?.activities[0]}
                        {itinerary.itinerary_days[0]?.activities.length > 1 && ` +${itinerary.itinerary_days[0].activities.length - 1} more`}
                      </div>
                    </div>
                  )}

                  {itinerary.recommendations && (
                    <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-4">
                      <p className="text-sm text-gray-700 line-clamp-2">
                        💡 {itinerary.recommendations}
                      </p>
                    </div>
                  )}

                  {itinerary.links && itinerary.links.length > 0 && (
                    <div className="flex gap-2">
                      {itinerary.links.slice(0, 2).map((link, idx) => (
                        <a
                          key={idx}
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-[#0069f0] hover:underline"
                        >
                          🔗 Link {idx + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
