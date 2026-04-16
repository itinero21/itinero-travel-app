'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
import StarRating from '@/components/StarRating'

interface Itinerary {
  id: number
  title: string
  destination: string
  is_public: boolean
  created_at: string
  photos: string[] | null
  itinerary_days: { id: number }[]
}

interface RecentReview {
  id: number
  rating: number
  review_text: string | null
  created_at: string
  itinerary_id: number
  itinerary_title: string
  reviewer_username: string | null
}

interface LinkPerformance {
  id: number
  url: string
  label: string | null
  category: string | null
  click_count: number
  itinerary_id: number
  itinerary_title: string
}

const CATEGORY_ICONS: Record<string, string> = {
  hotel: '🏨',
  flight: '✈️',
  tour: '🎯',
  transport: '🚌',
  gear: '🎒',
  restaurant: '🍽️',
  other: '🔗',
}

export default function DashboardPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [saveCounts, setSaveCounts] = useState<Record<number, number>>({})
  const [ratings, setRatings] = useState<Record<number, { avg: number; count: number }>>({})
  const [loadingItineraries, setLoadingItineraries] = useState(true)
  const [recentReviews, setRecentReviews] = useState<RecentReview[]>([])
  const [linkPerformance, setLinkPerformance] = useState<LinkPerformance[]>([])
  const [clickTotals, setClickTotals] = useState<Record<number, number>>({})
  const [usedCounts, setUsedCounts] = useState<Record<number, number>>({})
  const [showAllLinks, setShowAllLinks] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [toastMessage, setToastMessage] = useState<{
    text: string
    type: 'success' | 'error' | 'info'
    duration?: number
  } | null>(null)

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Fetch itineraries
  useEffect(() => {
    async function fetchItineraries() {
      if (!user) return

      try {
        const { data, error } = await supabase
          .from('itineraries')
          .select(`
            id,
            title,
            destination,
            is_public,
            created_at,
            photos,
            itinerary_days (id)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        const rows = data || []
        setItineraries(rows)

        // Fetch save counts + review ratings for all itineraries in parallel
        if (rows.length > 0) {
          const ids = rows.map((it) => it.id)
          const [{ data: saveData }, { data: reviewData }, { data: linksData }, { data: usedData }] = await Promise.all([
            supabase.from('saved_itineraries').select('itinerary_id').in('itinerary_id', ids),
            supabase.from('reviews').select('itinerary_id, rating').in('itinerary_id', ids),
            supabase
              .from('itinerary_links')
              .select('id, url, label, category, click_count, itinerary_id')
              .in('itinerary_id', ids)
              .order('click_count', { ascending: false }),
            supabase.from('used_itineraries').select('itinerary_id').in('itinerary_id', ids),
          ])

          const counts: Record<number, number> = {}
          for (const row of saveData || []) {
            counts[row.itinerary_id] = (counts[row.itinerary_id] || 0) + 1
          }
          setSaveCounts(counts)

          const rmap: Record<number, { sum: number; count: number }> = {}
          for (const r of reviewData || []) {
            if (!rmap[r.itinerary_id]) rmap[r.itinerary_id] = { sum: 0, count: 0 }
            rmap[r.itinerary_id].sum += r.rating
            rmap[r.itinerary_id].count += 1
          }
          const computed: Record<number, { avg: number; count: number }> = {}
          for (const [id, { sum, count }] of Object.entries(rmap)) {
            computed[Number(id)] = { avg: Math.round((sum / count) * 10) / 10, count }
          }
          setRatings(computed)

          // Build link performance list + per-itinerary click totals
          if (linksData) {
            const titleMap: Record<number, string> = {}
            for (const it of rows) titleMap[it.id] = it.title
            setLinkPerformance(
              linksData.map((l) => ({
                id: l.id,
                url: l.url,
                label: l.label,
                category: l.category,
                click_count: l.click_count,
                itinerary_id: l.itinerary_id,
                itinerary_title: titleMap[l.itinerary_id] ?? 'Unknown trip',
              }))
            )
            const totals: Record<number, number> = {}
            for (const l of linksData) {
              totals[l.itinerary_id] = (totals[l.itinerary_id] || 0) + l.click_count
            }
            setClickTotals(totals)
          }

          // Build used counts per itinerary
          if (usedData) {
            const uCounts: Record<number, number> = {}
            for (const row of usedData) {
              uCounts[row.itinerary_id] = (uCounts[row.itinerary_id] || 0) + 1
            }
            setUsedCounts(uCounts)
          }

          // Fetch 5 most recent reviews with reviewer username
          const { data: recentData } = await supabase
            .from('reviews')
            .select(`
              id,
              rating,
              review_text,
              created_at,
              itinerary_id,
              user_profiles ( username )
            `)
            .in('itinerary_id', ids)
            .order('created_at', { ascending: false })
            .limit(5)

          if (recentData) {
            const titleMap: Record<number, string> = {}
            for (const it of rows) titleMap[it.id] = it.title
            setRecentReviews(
              (recentData as unknown as Array<{
                id: number
                rating: number
                review_text: string | null
                created_at: string
                itinerary_id: number
                user_profiles: { username: string | null } | null
              }>).map((r) => ({
                id: r.id,
                rating: r.rating,
                review_text: r.review_text,
                created_at: r.created_at,
                itinerary_id: r.itinerary_id,
                itinerary_title: titleMap[r.itinerary_id] ?? 'Unknown trip',
                reviewer_username: r.user_profiles?.username ?? null,
              }))
            )
          }
        }
      } catch (error) {
        console.error('Error fetching itineraries:', error)
      } finally {
        setLoadingItineraries(false)
      }
    }

    if (user) {
      fetchItineraries()
    }
  }, [user])

  // Fetch follower and following counts
  useEffect(() => {
    async function fetchFollowCounts() {
      if (!user) return

      const [{ count: followers }, { count: following }] = await Promise.all([
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.id),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id),
      ])

      setFollowerCount(followers || 0)
      setFollowingCount(following || 0)
    }

    if (user) {
      fetchFollowCounts()
    }
  }, [user])

  // Handle toggle public/private
  const handleTogglePublic = async (itineraryId: number, currentPublic: boolean) => {
    const newPublic = !currentPublic

    // Optimistic update
    setItineraries(prev =>
      prev.map(it => (it.id === itineraryId ? { ...it, is_public: newPublic } : it))
    )

    try {
      const { error } = await supabase
        .from('itineraries')
        .update({ is_public: newPublic })
        .eq('id', itineraryId)

      if (error) throw error

      setToastMessage({
        text: `Trip is now ${newPublic ? 'public' : 'private'}`,
        type: 'success'
      })
    } catch (error) {
      // Revert on error
      setItineraries(prev =>
        prev.map(it => (it.id === itineraryId ? { ...it, is_public: currentPublic } : it))
      )
      setToastMessage({
        text: 'Failed to update visibility',
        type: 'error'
      })
    }
  }

  // Copy profile URL
  const handleCopyProfileUrl = async () => {
    if (!userProfile?.username) return

    const url = `${window.location.origin}/creator/${userProfile.username}`
    try {
      await navigator.clipboard.writeText(url)
      setToastMessage({ text: 'Copied!', type: 'success', duration: 2000 })
    } catch (error) {
      setToastMessage({ text: 'Failed to copy link', type: 'error' })
    }
  }

  // Format date
  const formatMemberSince = (date: string) => {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  // Format time ago
  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const past = new Date(date)
    const diffMs = now.getTime() - past.getTime()
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffMonths = Math.floor(diffDays / 30)
    const diffYears = Math.floor(diffDays / 365)

    if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`
    if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`
    return 'Just now'
  }

  if (loading || !user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-xl text-gray-600">Loading...</p>
      </div>
    )
  }

  // Check if user is a creator
  if (userProfile.role !== 'experienced_traveller') {
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
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-4xl font-semibold text-[#2C2C2C] mb-4">
            Creators Only
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            This area is for experienced travellers who share their itineraries.
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

  const publicCount = itineraries.filter(it => it.is_public).length
  const totalCount = itineraries.length
  const uniqueDestinations = new Set(
    itineraries
      .map(it => it.destination.trim().toLowerCase())
      .filter(dest => dest.length > 0)
  ).size

  return (
    <div className="min-h-screen bg-white">
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
          duration={toastMessage.duration}
        />
      )}

      {/* Navigation Bar */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-semibold text-[#2C2C2C] tracking-tight">
              Itinero
            </Link>
            <div className="flex items-center gap-3">
              {userProfile.username && (
                <>
                  <Link
                    href={`/creator/${userProfile.username}`}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    View public profile
                  </Link>
                  <button
                    onClick={handleCopyProfileUrl}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Copy profile link
                  </button>
                </>
              )}
              <Link
                href="/add-itinerary"
                className="bg-[#0069f0] text-white px-5 py-2.5 rounded-full text-sm font-medium hover:bg-[#0052c7] transition-colors"
              >
                + New itinerary
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Warning Banner for Incomplete Profile */}
        {(!userProfile.username || userProfile.username.trim() === '') && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8 flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div className="flex-1">
              <p className="text-yellow-800 font-medium mb-1">
                Your profile is incomplete — add a username so others can find you
              </p>
              <Link
                href="/profile"
                className="text-yellow-900 underline hover:text-yellow-700 text-sm font-medium"
              >
                Complete your profile →
              </Link>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-semibold text-[#2C2C2C] mb-2">
            Your dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Welcome back, {userProfile.username || 'Creator'}
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <p className="text-4xl font-bold text-[#2C2C2C] mb-2">{publicCount}</p>
            <p className="text-sm text-gray-600">Trips published</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <p className="text-4xl font-bold text-[#2C2C2C] mb-2">{totalCount}</p>
            <p className="text-sm text-gray-600">Total trips</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <p className="text-4xl font-bold text-[#2C2C2C] mb-2">{uniqueDestinations}</p>
            <p className="text-sm text-gray-600">Destinations</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <p className="text-4xl font-bold text-[#2C2C2C] mb-2">{followerCount}</p>
            <p className="text-sm text-gray-600">Followers</p>
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-6">
            <p className="text-4xl font-bold text-[#2C2C2C] mb-2">
              {formatMemberSince(userProfile.id)}
            </p>
            <p className="text-sm text-gray-600">Member since</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* My Itineraries */}
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-semibold text-[#2C2C2C] mb-6">
              My Itineraries
            </h2>

            {loadingItineraries ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : itineraries.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <div className="text-6xl mb-4">✈️</div>
                <h3 className="text-xl font-semibold text-[#2C2C2C] mb-2">
                  No itineraries yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Start sharing your travel experiences!
                </p>
                <Link
                  href="/add-itinerary"
                  className="inline-block bg-[#0069f0] text-white px-6 py-3 rounded-full text-[15px] font-medium hover:bg-[#0052c7] transition-colors"
                >
                  + Create your first itinerary
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {itineraries.map(itinerary => (
                  <div
                    key={itinerary.id}
                    className="bg-white border border-gray-100 rounded-xl p-4 hover:shadow-lg transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      {/* Thumbnail */}
                      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                        {itinerary.photos && itinerary.photos.length > 0 ? (
                          <img
                            src={itinerary.photos[0]}
                            alt={itinerary.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">📸</span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-[#2C2C2C] truncate">
                          {itinerary.title}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-gray-600">
                            📍 {itinerary.destination}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            itinerary.is_public
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {itinerary.is_public ? 'Public' : 'Private'}
                          </span>
                          {itinerary.itinerary_days && itinerary.itinerary_days.length > 0 && (
                            <span className="text-xs text-gray-500">
                              {itinerary.itinerary_days.length} day{itinerary.itinerary_days.length > 1 ? 's' : ''}
                            </span>
                          )}
                          {(saveCounts[itinerary.id] ?? 0) > 0 && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              🔖 {saveCounts[itinerary.id]}
                            </span>
                          )}
                          {ratings[itinerary.id] ? (
                            <span className="text-xs text-amber-600 font-medium">
                              ★ {ratings[itinerary.id].avg}
                              <span className="text-gray-400 font-normal ml-1">
                                ({ratings[itinerary.id].count})
                              </span>
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                          {(clickTotals[itinerary.id] ?? 0) > 0 && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              🔗 {clickTotals[itinerary.id]} click{clickTotals[itinerary.id] === 1 ? '' : 's'}
                            </span>
                          )}
                          {(usedCounts[itinerary.id] ?? 0) > 0 && (
                            <span className="text-xs text-green-600 flex items-center gap-1">
                              ✓ {usedCounts[itinerary.id]} used
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          <span className="text-xs text-gray-400">
                            Last updated {formatTimeAgo(itinerary.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/itinerary/${itinerary.id}`}
                          className="px-3 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          View
                        </Link>
                        <Link
                          href={`/add-itinerary?edit=${itinerary.id}`}
                          className="px-3 py-1.5 text-sm text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleTogglePublic(itinerary.id, itinerary.is_public)}
                          className={`px-3 py-1.5 text-sm border rounded-lg transition-colors ${
                            itinerary.is_public
                              ? 'text-gray-700 border-gray-200 hover:bg-gray-50'
                              : 'text-[#0069f0] border-[#0069f0] hover:bg-blue-50'
                          }`}
                        >
                          {itinerary.is_public ? 'Make Private' : 'Make Public'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <h2 className="text-3xl font-semibold text-[#2C2C2C] mb-6">
              Quick Actions
            </h2>
            <div className="bg-white border border-gray-100 rounded-xl p-6 space-y-6">
              {/* Share profile */}
              <div>
                <p className="text-sm font-medium text-[#2C2C2C] mb-2">
                  Share your profile
                </p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={`/creator/${userProfile.username}`}
                    readOnly
                    className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg text-gray-600"
                  />
                  <button
                    onClick={handleCopyProfileUrl}
                    className="px-4 py-2 bg-[#2C2C2C] text-white rounded-lg text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>

              {/* Edit profile */}
              <div>
                <p className="text-sm font-medium text-[#2C2C2C] mb-2">
                  Edit your profile
                </p>
                <Link
                  href="/profile"
                  className="block w-full text-center px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Go to profile settings
                </Link>
              </div>

              {/* Following count */}
              <div className="pt-2 border-t border-gray-100">
                <p className="text-sm font-medium text-[#2C2C2C] mb-1">Following</p>
                <p className="text-2xl font-bold text-[#2C2C2C]">
                  {followingCount}
                  <span className="text-sm font-normal text-gray-500 ml-1">
                    {followingCount === 1 ? 'creator' : 'creators'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Reviews */}
        <div className="mt-12">
          <h2 className="text-3xl font-semibold text-[#2C2C2C] mb-6">
            Recent reviews
          </h2>
          {!loadingItineraries && recentReviews.length === 0 ? (
            <div className="bg-gray-50 border border-gray-100 rounded-xl p-8 text-center">
              <p className="text-gray-500">
                No reviews yet — share your profile to get feedback
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentReviews.map((review) => (
                <div
                  key={review.id}
                  className="bg-white border border-gray-100 rounded-xl p-4 flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-9 h-9 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-sm font-semibold text-[#2C2C2C]">
                    {review.reviewer_username?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-[#2C2C2C]">
                        {review.reviewer_username ?? 'Traveller'}
                      </span>
                      <StarRating rating={review.rating} size="sm" />
                    </div>
                    <p className="text-xs text-gray-500 mb-1">
                      on{' '}
                      <Link
                        href={`/itinerary/${review.itinerary_id}`}
                        className="text-[#0069f0] hover:underline"
                      >
                        {review.itinerary_title}
                      </Link>
                    </p>
                    {review.review_text && (
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {review.review_text.length > 100
                          ? review.review_text.slice(0, 100) + '…'
                          : review.review_text}
                      </p>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-400">
                    {new Date(review.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Link Performance */}
        {!loadingItineraries && (
          <div className="mt-12">
            <div className="flex items-baseline justify-between mb-6">
              <div className="flex items-baseline gap-3">
                <h2 className="text-3xl font-semibold text-[#2C2C2C]">Link performance</h2>
                {linkPerformance.length > 0 && (
                  <span className="text-sm text-gray-500">
                    {linkPerformance.reduce((s, l) => s + l.click_count, 0)} total clicks
                  </span>
                )}
              </div>
            </div>

            {linkPerformance.length === 0 ? (
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-8 text-center">
                <p className="text-gray-500">
                  No links added yet — add affiliate links to your itineraries to track clicks
                </p>
              </div>
            ) : (
              <>
                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-5 py-3 font-medium text-gray-500">Link</th>
                        <th className="text-left px-5 py-3 font-medium text-gray-500 hidden sm:table-cell">Itinerary</th>
                        <th className="text-right px-5 py-3 font-medium text-gray-500">Clicks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {(showAllLinks ? linkPerformance : linkPerformance.slice(0, 10)).map((link) => (
                        <tr key={link.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span className="text-lg flex-shrink-0">
                                {CATEGORY_ICONS[link.category ?? 'other'] ?? '🔗'}
                              </span>
                              <div className="min-w-0">
                                <a
                                  href={link.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#0069f0] hover:underline font-medium truncate block"
                                >
                                  {link.label || link.url}
                                </a>
                                <span className="text-xs text-gray-400 truncate block sm:hidden">
                                  {link.itinerary_title}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3 hidden sm:table-cell">
                            <Link
                              href={`/itinerary/${link.itinerary_id}`}
                              className="text-gray-500 hover:text-[#0069f0] transition-colors truncate block max-w-[200px]"
                            >
                              {link.itinerary_title}
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <span className={`font-bold ${link.click_count > 0 ? 'text-[#2C2C2C]' : 'text-gray-300'}`}>
                              {link.click_count > 0 ? link.click_count : '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {linkPerformance.length > 10 && (
                  <button
                    onClick={() => setShowAllLinks((v) => !v)}
                    className="mt-3 text-sm text-[#0069f0] hover:underline font-medium"
                  >
                    {showAllLinks
                      ? 'Show less'
                      : `Show all ${linkPerformance.length} links`}
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
