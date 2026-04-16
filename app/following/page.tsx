'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import ItineraryCardSkeleton from '@/components/ItineraryCardSkeleton'
import ImageWithFallback from '@/components/ImageWithFallback'
import SaveButton from '@/components/SaveButton'

interface Itinerary {
  id: number
  user_id: string
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

export default function FollowingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [savedIds, setSavedIds] = useState<Set<number>>(new Set())
  const [ratings, setRatings] = useState<Record<number, { avg: number; count: number }>>({})
  const [followedCount, setFollowedCount] = useState(0)
  const [loadingData, setLoadingData] = useState(true)
  const [noFollows, setNoFollows] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return

    async function fetchFeed() {
      setLoadingData(true)
      try {
        // 1. Get followed user IDs
        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user!.id)

        const followedIds = (followData || []).map((f) => f.following_id as string)
        setFollowedCount(followedIds.length)

        if (followedIds.length === 0) {
          setNoFollows(true)
          setLoadingData(false)
          return
        }

        // 2. Fetch public itineraries from followed creators
        const { data: itinData } = await supabase
          .from('itineraries')
          .select(`
            id,
            user_id,
            title,
            description,
            destination,
            start_date,
            end_date,
            photos,
            budget,
            created_at,
            user_profiles ( username )
          `)
          .in('user_id', followedIds)
          .eq('is_public', true)
          .order('created_at', { ascending: false })

        const rows = (itinData || []) as Itinerary[]
        setItineraries(rows)

        if (rows.length === 0) {
          setLoadingData(false)
          return
        }

        // 3. Fetch saved IDs + ratings in parallel
        const ids = rows.map((it) => it.id)
        const [{ data: savedData }, { data: reviewData }] = await Promise.all([
          supabase
            .from('saved_itineraries')
            .select('itinerary_id')
            .eq('user_id', user!.id),
          supabase
            .from('reviews')
            .select('itinerary_id, rating')
            .in('itinerary_id', ids),
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
      } catch (err) {
        console.error('Error fetching following feed:', err)
      } finally {
        setLoadingData(false)
      }
    }

    fetchFeed()
  }, [user])

  if (loading || (!user && !loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-xl">Loading...</p>
      </div>
    )
  }

  const uniqueCreators = new Set(itineraries.map((it) => it.user_id)).size

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
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

      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Heading */}
        <div className="mb-12">
          <h1 className="text-5xl font-semibold text-[#2C2C2C] mb-4">
            From creators you follow
          </h1>
          {!loadingData && !noFollows && (
            <p className="text-xl text-gray-600">
              {itineraries.length > 0
                ? `${itineraries.length} ${itineraries.length === 1 ? 'itinerary' : 'itineraries'} from ${uniqueCreators} ${uniqueCreators === 1 ? 'creator' : 'creators'} you follow`
                : `You follow ${followedCount} ${followedCount === 1 ? 'creator' : 'creators'}`}
            </p>
          )}
        </div>

        {/* Loading */}
        {loadingData ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <ItineraryCardSkeleton key={i} />
            ))}
          </div>
        ) : noFollows ? (
          /* Empty state — not following anyone */
          <div className="text-center py-24 max-w-md mx-auto">
            <div className="text-6xl mb-6">👥</div>
            <h3 className="text-2xl font-semibold text-[#2C2C2C] mb-3">
              You are not following anyone yet
            </h3>
            <p className="text-gray-500 mb-8">
              Follow creators whose trips inspire you and their new itineraries will appear here.
            </p>
            <Link
              href="/browse"
              className="inline-block bg-[#0069f0] text-white px-8 py-3 rounded-full text-[15px] font-medium hover:bg-[#0052c7] transition-colors"
            >
              Discover creators
            </Link>
          </div>
        ) : itineraries.length === 0 ? (
          /* Empty state — following people but no itineraries yet */
          <div className="text-center py-24 max-w-md mx-auto">
            <div className="text-6xl mb-6">🗺️</div>
            <h3 className="text-2xl font-semibold text-[#2C2C2C] mb-3">
              Nothing here yet
            </h3>
            <p className="text-gray-500 mb-8">
              No itineraries yet from the creators you follow — check back soon.
            </p>
            <Link
              href="/browse"
              className="inline-block bg-[#0069f0] text-white px-8 py-3 rounded-full text-[15px] font-medium hover:bg-[#0052c7] transition-colors"
            >
              Browse all itineraries
            </Link>
          </div>
        ) : (
          /* Card grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {itineraries.map((itinerary) => (
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
                    <div
                      className="flex items-center gap-2 text-sm text-gray-600 mb-3"
                      onClick={(e) => e.preventDefault()}
                    >
                      <span>👤</span>
                      <Link
                        href={`/creator/${itinerary.user_profiles.username}`}
                        className="hover:text-[#0069f0] hover:underline transition-colors"
                      >
                        {itinerary.user_profiles.username}
                      </Link>
                    </div>
                  )}

                  <h3 className="text-xl font-semibold text-[#2C2C2C] mb-1 group-hover:text-[#0069f0] transition-colors">
                    {itinerary.title}
                  </h3>

                  {ratings[itinerary.id] && (
                    <p className="text-sm text-amber-600 font-medium mb-2">
                      ★ {ratings[itinerary.id].avg}&nbsp;
                      <span className="text-gray-400 font-normal">
                        ({ratings[itinerary.id].count}{' '}
                        {ratings[itinerary.id].count === 1 ? 'review' : 'reviews'})
                      </span>
                    </p>
                  )}

                  <p className="text-gray-600 text-[15px] leading-relaxed mb-4 line-clamp-3">
                    {itinerary.description}
                  </p>

                  {itinerary.start_date && itinerary.end_date && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <span>📅</span>
                      <span>
                        {new Date(itinerary.start_date).toLocaleDateString()} —{' '}
                        {new Date(itinerary.end_date).toLocaleDateString()}
                      </span>
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
