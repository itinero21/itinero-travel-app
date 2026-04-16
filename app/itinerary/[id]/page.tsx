'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import Toast from '@/components/Toast'
import SaveButton from '@/components/SaveButton'
import MarkUsedButton from '@/components/MarkUsedButton'
import ReviewForm from '@/components/ReviewForm'
import ReviewsList from '@/components/ReviewsList'

interface ItineraryDay {
  id: number
  day_number: number
  title: string
  activities: string[]
}

interface Creator {
  username: string | null
  bio: string | null
}

interface ItineraryLink {
  id: number
  url: string
  label: string | null
  category: string | null
  click_count: number
}

interface Itinerary {
  id: number
  user_id: string
  title: string
  description: string
  destination: string
  start_date: string | null
  end_date: string | null
  photos: string[] | null
  recommendations: string | null
  links: string[] | null
  budget: string | null
  is_public: boolean
  created_at: string
  itinerary_days: ItineraryDay[]
}

export default function ItineraryDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [itinerary, setItinerary] = useState<Itinerary | null>(null)
  const [creator, setCreator] = useState<Creator | null>(null)
  const [richLinks, setRichLinks] = useState<ItineraryLink[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [saveCount, setSaveCount] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [existingReview, setExistingReview] = useState<{
    id: number
    rating: number
    review_text: string | null
  } | null>(null)
  const [hasUsed, setHasUsed] = useState(false)
  const [usedCount, setUsedCount] = useState(0)
  const [reviewRefreshKey, setReviewRefreshKey] = useState(0)
  const [toastMessage, setToastMessage] = useState<{
    text: string
    type: 'success' | 'error' | 'info'
  } | null>(null)

  useEffect(() => {
    async function fetchItinerary() {
      if (!params.id) return

      try {
        // Fetch itinerary with its days
        const { data: itineraryData, error: itineraryError } = await supabase
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
          .eq('id', params.id)
          .single()

        if (itineraryError || !itineraryData) {
          setNotFound(true)
          setLoading(false)
          return
        }

        // Check if user has permission to view
        const isOwner = user?.id === itineraryData.user_id
        if (!itineraryData.is_public && !isOwner) {
          setNotFound(true)
          setLoading(false)
          return
        }

        // Sort itinerary days by day_number
        const sortedData = {
          ...itineraryData,
          itinerary_days: (itineraryData.itinerary_days || []).sort(
            (a: ItineraryDay, b: ItineraryDay) => a.day_number - b.day_number
          )
        }

        setItinerary(sortedData)

        // Fetch rich links from itinerary_links table
        const { data: richLinksData } = await supabase
          .from('itinerary_links')
          .select('id, url, label, category, click_count')
          .eq('itinerary_id', params.id)
          .order('created_at', { ascending: true })
        setRichLinks(richLinksData || [])

        // Fetch total save count + review stats + used count in parallel
        const [{ count }, { data: ratingsData }, { count: usedTotal }] = await Promise.all([
          supabase
            .from('saved_itineraries')
            .select('*', { count: 'exact', head: true })
            .eq('itinerary_id', params.id),
          supabase
            .from('reviews')
            .select('rating')
            .eq('itinerary_id', params.id),
          supabase
            .from('used_itineraries')
            .select('*', { count: 'exact', head: true })
            .eq('itinerary_id', params.id),
        ])
        setSaveCount(count || 0)
        setUsedCount(usedTotal || 0)
        if (ratingsData && ratingsData.length > 0) {
          const avg = ratingsData.reduce((sum, r) => sum + r.rating, 0) / ratingsData.length
          setAvgRating(Math.round(avg * 10) / 10)
          setReviewCount(ratingsData.length)
        }

        // Fetch user-specific data in parallel
        if (user) {
          const [{ data: savedData }, { data: reviewData }, { data: usedData }] = await Promise.all([
            supabase
              .from('saved_itineraries')
              .select('id')
              .eq('user_id', user.id)
              .eq('itinerary_id', params.id)
              .maybeSingle(),
            supabase
              .from('reviews')
              .select('id, rating, review_text')
              .eq('user_id', user.id)
              .eq('itinerary_id', params.id)
              .maybeSingle(),
            supabase
              .from('used_itineraries')
              .select('id')
              .eq('user_id', user.id)
              .eq('itinerary_id', params.id)
              .maybeSingle(),
          ])
          setIsSaved(!!savedData)
          setExistingReview(reviewData)
          setHasUsed(!!usedData)
        }

        // Fetch creator profile
        const { data: creatorData, error: creatorError } = await supabase
          .from('user_profiles')
          .select('username, bio')
          .eq('id', itineraryData.user_id)
          .single()

        if (!creatorError && creatorData) {
          setCreator(creatorData)
        }
      } catch (error) {
        console.error('Error fetching itinerary:', error)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchItinerary()
    }
  }, [params.id, user, authLoading])

  // Calculate duration in days
  const calculateDuration = () => {
    if (!itinerary?.start_date || !itinerary?.end_date) return null
    const start = new Date(itinerary.start_date)
    const end = new Date(itinerary.end_date)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays + 1 // Include both start and end days
  }

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
        <div className="max-w-6xl mx-auto px-6 py-12 animate-pulse">
          {/* Cover photo skeleton */}
          <div className="aspect-[21/9] bg-gray-200 rounded-2xl mb-8" />

          {/* Title skeleton */}
          <div className="mb-8 space-y-4">
            <div className="h-12 bg-gray-200 rounded w-2/3" />
            <div className="flex gap-4">
              <div className="h-6 bg-gray-200 rounded w-32" />
              <div className="h-6 bg-gray-200 rounded w-48" />
            </div>
            <div className="h-20 bg-gray-200 rounded w-full" />
          </div>

          {/* Content skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="h-64 bg-gray-200 rounded-xl" />
              <div className="h-64 bg-gray-200 rounded-xl" />
            </div>
            <div className="h-48 bg-gray-200 rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !itinerary) {
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
          <div className="text-6xl mb-6">🗺️</div>
          <h1 className="text-4xl font-semibold text-[#2C2C2C] mb-4">
            Itinerary Not Found
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            This itinerary doesn't exist or is not available.
          </p>
          <Link
            href="/"
            className="inline-block bg-[#0069f0] text-white px-8 py-3 rounded-full text-[15px] font-medium hover:bg-[#0052c7] transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    )
  }

  const duration = calculateDuration()
  const isOwner = user?.id === itinerary.user_id

  const CATEGORY_ICONS: Record<string, string> = {
    hotel: '🏨',
    flight: '✈️',
    tour: '🎯',
    transport: '🚌',
    gear: '🎒',
    restaurant: '🍽️',
    other: '🔗',
  }

  const getDomain = (url: string): string => {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return url.slice(0, 40)
    }
  }

  const truncateUrl = (url: string): string =>
    url.length > 40 ? url.slice(0, 40) + '…' : url

  const handleLinkClick = (linkId: number) => {
    supabase.rpc('increment_link_click', { link_id: linkId }).catch(() => {})
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setToastMessage({ text: 'Link copied to clipboard!', type: 'success' })
    } catch (error) {
      setToastMessage({ text: 'Failed to copy link', type: 'error' })
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {toastMessage && (
        <Toast
          message={toastMessage.text}
          type={toastMessage.type}
          onClose={() => setToastMessage(null)}
        />
      )}
      {/* Navigation Bar */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-semibold text-[#2C2C2C] tracking-tight">
              Itinero
            </Link>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              <span>←</span>
              <span>Back</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Cover Photo */}
        <div className="aspect-[21/9] rounded-2xl overflow-hidden mb-4">
          {itinerary.photos && itinerary.photos.length > 0 ? (
            <img
              src={itinerary.photos[0]}
              alt={itinerary.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
              <span className="text-8xl opacity-40">🌍</span>
            </div>
          )}
        </div>

        {/* Photo Strip - Show if more than one photo */}
        {itinerary.photos && itinerary.photos.length > 1 && (
          <div className="mb-8 overflow-x-auto">
            <div className="flex gap-3 pb-2">
              {itinerary.photos.slice(1).map((photo, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 w-48 h-32 rounded-xl overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img
                    src={photo}
                    alt={`${itinerary.title} - Photo ${index + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Title and Meta Information */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-5xl font-semibold text-[#2C2C2C] mb-4">
                {itinerary.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-gray-600">
                <div className="flex items-center gap-2">
                  <span>📍</span>
                  <span className="text-lg">{itinerary.destination}</span>
                </div>
                {itinerary.start_date && itinerary.end_date && (
                  <>
                    <div className="flex items-center gap-2">
                      <span>📅</span>
                      <span>
                        {new Date(itinerary.start_date).toLocaleDateString()} - {new Date(itinerary.end_date).toLocaleDateString()}
                      </span>
                    </div>
                    {duration && (
                      <div className="flex items-center gap-2">
                        <span>⏱️</span>
                        <span>{duration} {duration === 1 ? 'day' : 'days'}</span>
                      </div>
                    )}
                  </>
                )}
                {itinerary.budget && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <span>💰</span>
                    {itinerary.budget}
                  </span>
                )}
                {reviewCount > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200">
                    <span>★</span>
                    {avgRating}
                    <span className="text-amber-600 font-normal">({reviewCount})</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-50 text-gray-500 border border-gray-200">
                    No reviews yet
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {isOwner && (
                <Link
                  href={`/add-itinerary?edit=${itinerary.id}`}
                  className="px-4 py-2 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <span>✏️</span>
                  Edit
                </Link>
              )}
              {itinerary.is_public && (
                <button
                  onClick={handleShare}
                  className="px-4 py-2 border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <span>🔗</span>
                  Share
                </button>
              )}
              <SaveButton
                itineraryId={itinerary.id}
                initialSaved={isSaved}
                showCount={true}
                count={saveCount}
              />
              <MarkUsedButton
                itineraryId={itinerary.id}
                itineraryOwnerId={itinerary.user_id}
                initialUsed={hasUsed}
                onMarkedUsed={() => {
                  setHasUsed(true)
                  setUsedCount((c) => c + 1)
                }}
              />
              <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                itinerary.is_public
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700'
              }`}>
                {itinerary.is_public ? 'Public' : 'Private'}
              </span>
            </div>
          </div>

          {itinerary.description && (
            <p className="text-lg text-gray-700 leading-relaxed">
              {itinerary.description}
            </p>
          )}
          {usedCount > 0 && (
            <p className="mt-3 text-sm text-gray-500">
              ✓ {usedCount} {usedCount === 1 ? 'traveller has' : 'travellers have'} used this itinerary
            </p>
          )}
        </div>

        <div className="space-y-10">

          {/* Creator Card */}
          {creator && (
            <div className="bg-white border border-gray-100 rounded-xl p-6 flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center text-xl">
                  👤
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-0.5">Created by</p>
                  <p className="font-semibold text-[#2C2C2C]">
                    {creator.username || 'Anonymous'}
                  </p>
                  {creator.bio && (
                    <p className="text-sm text-gray-600 leading-relaxed mt-0.5 line-clamp-1">
                      {creator.bio}
                    </p>
                  )}
                </div>
              </div>
              {creator.username && (
                <Link
                  href={`/creator/${creator.username}`}
                  className="flex-shrink-0 bg-[#2C2C2C] text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-[#1a1a1a] transition-colors"
                >
                  View Profile
                </Link>
              )}
            </div>
          )}

          {/* Recommendations */}
          {itinerary.recommendations && (
            <div>
              <h2 className="text-2xl font-semibold text-[#2C2C2C] mb-4">
                Recommendations
              </h2>
              <div className="bg-green-50 border border-green-100 rounded-xl p-6">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">💡</span>
                  <p className="text-gray-700 leading-relaxed flex-1">
                    {itinerary.recommendations}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Useful Links — prefer rich links table, fall back to plain array */}
          {(richLinks.length > 0 || (itinerary.links && itinerary.links.length > 0)) && (
            <div>
              <h2 className="text-2xl font-semibold text-[#2C2C2C] mb-4">
                Useful Links
              </h2>
              {richLinks.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {richLinks.map((link) => (
                    <a
                      key={link.id}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => handleLinkClick(link.id)}
                      className="group bg-white border border-gray-100 rounded-xl p-5 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                    >
                      <span className="text-2xl leading-none">
                        {CATEGORY_ICONS[link.category ?? 'other'] ?? '🔗'}
                      </span>
                      <div className="flex-1">
                        <p className="font-medium text-[#2C2C2C] text-sm leading-snug">
                          {link.label || getDomain(link.url)}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {truncateUrl(link.url)}
                        </p>
                      </div>
                      <span className="text-xs font-medium text-[#0069f0] group-hover:underline">
                        Visit link →
                      </span>
                    </a>
                  ))}
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                  <ul className="space-y-3">
                    {(itinerary.links ?? []).map((link, idx) => (
                      <li key={idx}>
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-[#0069f0] hover:underline"
                        >
                          <span>🔗</span>
                          <span className="break-all">{link}</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Day-by-Day Plan */}
          {itinerary.itinerary_days && itinerary.itinerary_days.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-[#2C2C2C] mb-4">
                Day-by-Day Plan
              </h2>
              <div className="space-y-4">
                {itinerary.itinerary_days.map((day) => (
                  <div
                    key={day.id}
                    className="bg-white border border-gray-100 rounded-xl p-6 hover:shadow-lg transition-shadow"
                  >
                    <h3 className="text-lg font-semibold text-[#2C2C2C] mb-3">
                      {day.title}
                    </h3>
                    <ul className="space-y-2">
                      {day.activities.map((activity, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="text-[#0069f0] mt-1 flex-shrink-0">•</span>
                          <span className="text-gray-700 leading-relaxed">
                            {activity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews */}
          <div>
            <h2 className="text-2xl font-semibold text-[#2C2C2C] mb-4">
              Reviews
            </h2>
            <ReviewsList
              itineraryId={itinerary.id}
              refreshKey={reviewRefreshKey}
              currentUserReview={existingReview}
              onEditClick={
                existingReview
                  ? () => {
                      document.getElementById('review-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }
                  : undefined
              }
            />
            {!isOwner && (
              <div id="review-form" className="mt-6">
                <ReviewForm
                  itineraryId={itinerary.id}
                  itineraryOwnerId={itinerary.user_id}
                  existingReview={existingReview}
                  onSubmit={() => setReviewRefreshKey((k) => k + 1)}
                  hasUsed={user ? hasUsed : undefined}
                  onMarkedUsed={() => {
                    setHasUsed(true)
                    setUsedCount((c) => c + 1)
                  }}
                />
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
