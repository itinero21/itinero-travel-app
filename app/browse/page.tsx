'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ItineraryCardSkeleton from '@/components/ItineraryCardSkeleton'
import ImageWithFallback from '@/components/ImageWithFallback'
import SaveButton from '@/components/SaveButton'
import TopCreators from '@/components/TopCreators'

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
  budget: string | null
  created_at: string
  user_profiles: {
    username: string | null
  }
  itinerary_days: ItineraryDay[]
}

export default function BrowsePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [filteredItineraries, setFilteredItineraries] = useState<Itinerary[]>([])
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [ratings, setRatings] = useState<Record<number, { avg: number; count: number }>>({})
  const [loadingData, setLoadingData] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDestination, setSelectedDestination] = useState('')
  const [selectedBudget, setSelectedBudget] = useState('')
  const [selectedDuration, setSelectedDuration] = useState('')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'top_rated' | 'most_reviewed' | 'highest_rated'>('newest')

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
            (a: ItineraryDay, b: ItineraryDay) => a.day_number - b.day_number
          )
        }))

        setItineraries(sortedData)
        setFilteredItineraries(sortedData)

        // Fetch saved IDs + ratings in parallel
        const [{ data: savedData }, { data: reviewData }] = await Promise.all([
          supabase
            .from('saved_itineraries')
            .select('itinerary_id')
            .eq('user_id', user!.id),
          supabase
            .from('reviews')
            .select('itinerary_id, rating'),
        ])

        if (savedData) {
          setSavedIds(new Set(savedData.map((s) => s.itinerary_id as number)))
        }

        if (reviewData) {
          const map: Record<number, { sum: number; count: number }> = {}
          for (const r of reviewData) {
            if (!map[r.itinerary_id]) map[r.itinerary_id] = { sum: 0, count: 0 }
            map[r.itinerary_id].sum += r.rating
            map[r.itinerary_id].count += 1
          }
          const computed: Record<number, { avg: number; count: number }> = {}
          for (const [id, { sum, count }] of Object.entries(map)) {
            computed[Number(id)] = { avg: Math.round((sum / count) * 10) / 10, count }
          }
          setRatings(computed)
        }
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

  // Calculate trip duration in days
  const getDuration = (itinerary: Itinerary): number | null => {
    if (itinerary.start_date && itinerary.end_date) {
      const diff = Math.round(
        (new Date(itinerary.end_date).getTime() - new Date(itinerary.start_date).getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1
      return diff > 0 ? diff : null
    }
    if (itinerary.itinerary_days?.length > 0) {
      return itinerary.itinerary_days.length
    }
    return null
  }

  // Filter and sort itineraries
  useEffect(() => {
    let filtered = [...itineraries]

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (itinerary) =>
          itinerary.title.toLowerCase().includes(query) ||
          itinerary.description.toLowerCase().includes(query) ||
          itinerary.destination.toLowerCase().includes(query) ||
          itinerary.user_profiles?.username?.toLowerCase().includes(query)
      )
    }

    if (selectedDestination) {
      filtered = filtered.filter(
        (itinerary) => itinerary.destination === selectedDestination
      )
    }

    if (selectedBudget) {
      filtered = filtered.filter((itinerary) => {
        if (!itinerary.budget) return true
        return itinerary.budget.toLowerCase().includes(selectedBudget.toLowerCase())
      })
    }

    if (selectedDuration) {
      filtered = filtered.filter((itinerary) => {
        const days = getDuration(itinerary)
        if (days === null) return true
        if (selectedDuration === 'weekend') return days >= 1 && days <= 3
        if (selectedDuration === 'week') return days >= 4 && days <= 7
        if (selectedDuration === 'twoweeks') return days >= 8 && days <= 14
        if (selectedDuration === 'long') return days >= 15
        return true
      })
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === 'top_rated' || sortBy === 'highest_rated') {
        const rA = ratings[a.id]?.avg ?? -1
        const rB = ratings[b.id]?.avg ?? -1
        return rB - rA
      }
      if (sortBy === 'most_reviewed') {
        const cA = ratings[a.id]?.count ?? 0
        const cB = ratings[b.id]?.count ?? 0
        return cB - cA
      }
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB
    })

    setFilteredItineraries(filtered)
  }, [searchQuery, selectedDestination, selectedBudget, selectedDuration, sortBy, itineraries, ratings])

  // Get unique destinations for filter
  const uniqueDestinations = Array.from(
    new Set(itineraries.map((i) => i.destination))
  ).sort()

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
          <p className="text-xl text-gray-600 mb-8">
            Explore amazing trips shared by experienced travelers
          </p>

          {/* Search and Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search by title, destination, or creator..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-5 py-3.5 pl-12 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                🔍
              </span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={selectedDestination}
                onChange={(e) => setSelectedDestination(e.target.value)}
                className="px-5 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all bg-white min-w-[180px]"
              >
                <option value="">All Destinations</option>
                {uniqueDestinations.map((destination) => (
                  <option key={destination} value={destination}>
                    {destination}
                  </option>
                ))}
              </select>
              <select
                value={selectedBudget}
                onChange={(e) => setSelectedBudget(e.target.value)}
                className="px-5 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all bg-white min-w-[150px]"
              >
                <option value="">Any budget</option>
                <option value="budget">Budget</option>
                <option value="mid">Mid-range</option>
                <option value="luxury">Luxury</option>
              </select>
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(e.target.value)}
                className="px-5 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all bg-white min-w-[170px]"
              >
                <option value="">Any length</option>
                <option value="weekend">Weekend (1–3 days)</option>
                <option value="week">One week (4–7 days)</option>
                <option value="twoweeks">Two weeks (8–14 days)</option>
                <option value="long">Long trip (15+ days)</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'top_rated' | 'most_reviewed' | 'highest_rated')}
                className="px-5 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all bg-white"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="highest_rated">Highest Rated</option>
                <option value="most_reviewed">Most Reviewed</option>
              </select>
            </div>
          </div>

          {/* Featured Creators */}
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-[#2C2C2C] mb-4">Featured creators</h2>
            <TopCreators />
          </div>

          {/* Results count */}
          {!loadingData && (
            <p className="text-sm text-gray-500 mt-6">
              Showing {filteredItineraries.length} of {itineraries.length} itineraries
            </p>
          )}
        </div>

        {loadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ItineraryCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredItineraries.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">
              {searchQuery || selectedDestination || selectedBudget || selectedDuration ? '🔍' : '🌍'}
            </div>
            <h3 className="text-2xl font-semibold text-[#2C2C2C] mb-2">
              {searchQuery || selectedDestination || selectedBudget || selectedDuration
                ? 'No matching itineraries'
                : 'No itineraries yet'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchQuery || selectedDestination || selectedBudget || selectedDuration
                ? 'Try adjusting your search or filters'
                : 'Check back soon for amazing travel experiences!'}
            </p>
            {(searchQuery || selectedDestination || selectedBudget || selectedDuration) && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  setSelectedDestination('')
                  setSelectedBudget('')
                  setSelectedDuration('')
                }}
                className="text-[#0069f0] hover:underline text-sm font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredItineraries.map((itinerary) => (
              <Link
                key={itinerary.id}
                href={`/itinerary/${itinerary.id}`}
                className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300 cursor-pointer"
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
                      initialSaved={savedIds.has(itinerary.id)}
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

                  <h3 className="text-xl font-semibold text-[#2C2C2C] mb-1 group-hover:text-[#0069f0] transition-colors">
                    {itinerary.title}
                  </h3>

                  {ratings[itinerary.id] && (
                    <p className="text-sm text-amber-600 font-medium mb-2">
                      ★ {ratings[itinerary.id].avg}&nbsp;
                      <span className="text-gray-400 font-normal">
                        ({ratings[itinerary.id].count} {ratings[itinerary.id].count === 1 ? 'review' : 'reviews'})
                      </span>
                    </p>
                  )}

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
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
