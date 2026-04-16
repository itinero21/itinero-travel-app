'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import ItineraryCardSkeleton from '@/components/ItineraryCardSkeleton'
import ImageWithFallback from '@/components/ImageWithFallback'

interface TravellerProfile {
  id: string
  username: string
  bio: string | null
  role: string
  created_at: string
}

interface SavedItinerary {
  id: number
  title: string
  description: string
  destination: string
  photos: string[] | null
  start_date: string | null
  end_date: string | null
}

export default function TravellerProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  const [profile, setProfile] = useState<TravellerProfile | null>(null)
  const [savedItineraries, setSavedItineraries] = useState<SavedItinerary[]>([])
  const [savedCount, setSavedCount] = useState(0)
  const [reviewCount, setReviewCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (profile?.username) {
      document.title = `${profile.username} — Itinero`
    }
    return () => {
      document.title = 'Itinero'
    }
  }, [profile?.username])

  useEffect(() => {
    async function fetchProfile() {
      if (!params.username) return

      try {
        // Fetch profile by username
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id, username, bio, role, created_at')
          .eq('username', params.username)
          .single()

        if (profileError || !profileData) {
          setNotFound(true)
          setLoading(false)
          return
        }

        // Redirect experienced travellers to their creator page
        if (profileData.role === 'experienced_traveller') {
          router.replace(`/creator/${profileData.username}`)
          return
        }

        setProfile(profileData)

        // Fetch stats + saved itineraries in parallel
        const [
          { count: sCount },
          { count: rCount },
          { count: fCount },
          { data: savedData },
        ] = await Promise.all([
          supabase
            .from('saved_itineraries')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profileData.id),
          supabase
            .from('reviews')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profileData.id),
          supabase
            .from('follows')
            .select('*', { count: 'exact', head: true })
            .eq('follower_id', profileData.id),
          supabase
            .from('saved_itineraries')
            .select(`
              itineraries (
                id,
                title,
                description,
                destination,
                photos,
                start_date,
                end_date,
                is_public
              )
            `)
            .eq('user_id', profileData.id)
            .order('created_at', { ascending: false })
            .limit(20),
        ])

        setSavedCount(sCount || 0)
        setReviewCount(rCount || 0)
        setFollowingCount(fCount || 0)

        // Filter to public only, take first 6
        type RawRow = { itineraries: (SavedItinerary & { is_public: boolean }) | null }
        const publicSaved = ((savedData || []) as unknown as RawRow[])
          .map((row) => row.itineraries)
          .filter((it): it is SavedItinerary & { is_public: boolean } => !!it && it.is_public)
          .slice(0, 6)

        setSavedItineraries(publicSaved)
      } catch (err) {
        console.error('Error fetching traveller profile:', err)
        setNotFound(true)
      } finally {
        setLoading(false)
      }
    }

    if (!authLoading) {
      fetchProfile()
    }
  }, [params.username, authLoading, router])

  const formatMemberSince = (date: string) =>
    new Date(date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  // Loading skeleton
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
        <div className="max-w-5xl mx-auto px-6 py-16 animate-pulse">
          <div className="bg-white border border-gray-100 rounded-2xl p-8 mb-10">
            <div className="flex items-start gap-6">
              <div className="w-20 h-20 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="h-9 bg-gray-200 rounded w-1/3" />
                <div className="h-5 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-1/4" />
              </div>
            </div>
            <div className="mt-8 grid grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <ItineraryCardSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // Not found
  if (notFound || !profile) {
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
          <h1 className="text-4xl font-semibold text-[#2C2C2C] mb-4">User Not Found</h1>
          <p className="text-xl text-gray-600 mb-8">
            This profile doesn't exist or has been removed.
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

  const isOwnProfile = user?.id === profile.id

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
              href="/browse"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Browse itineraries
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Profile header card */}
        <div className="bg-white border border-gray-100 rounded-2xl p-8 mb-10">
          <div className="flex items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0 w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center">
              <span className="text-3xl font-semibold text-gray-600">
                {profile.username.charAt(0).toUpperCase()}
              </span>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className="text-4xl font-semibold text-[#2C2C2C]">{profile.username}</h1>
                {isOwnProfile && (
                  <Link
                    href="/profile"
                    className="text-sm text-gray-500 hover:text-[#0069f0] transition-colors underline underline-offset-2"
                  >
                    Edit profile
                  </Link>
                )}
              </div>
              {profile.bio && (
                <p className="text-lg text-gray-700 leading-relaxed mb-3">{profile.bio}</p>
              )}
              <p className="text-sm text-gray-400">
                Member since {formatMemberSince(profile.created_at)}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-8 grid grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl px-5 py-4">
              <p className="text-3xl font-bold text-[#2C2C2C] mb-0.5">{savedCount}</p>
              <p className="text-sm text-gray-500">
                {savedCount === 1 ? 'Trip saved' : 'Trips saved'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl px-5 py-4">
              <p className="text-3xl font-bold text-[#2C2C2C] mb-0.5">{reviewCount}</p>
              <p className="text-sm text-gray-500">
                {reviewCount === 1 ? 'Review written' : 'Reviews written'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl px-5 py-4">
              <p className="text-3xl font-bold text-[#2C2C2C] mb-0.5">{followingCount}</p>
              <p className="text-sm text-gray-500">
                {followingCount === 1 ? 'Creator followed' : 'Creators followed'}
              </p>
            </div>
          </div>
        </div>

        {/* Recently saved section */}
        <div>
          <h2 className="text-3xl font-semibold text-[#2C2C2C] mb-8">Recently saved</h2>

          {savedItineraries.length === 0 ? (
            <div className="text-center py-20 bg-gray-50 rounded-2xl">
              <div className="text-6xl mb-4">🗺️</div>
              <h3 className="text-2xl font-semibold text-[#2C2C2C] mb-2">Nothing saved yet</h3>
              <p className="text-gray-500">
                {isOwnProfile
                  ? 'Browse itineraries and save the ones that inspire you.'
                  : `${profile.username} hasn't saved any public trips yet.`}
              </p>
              {isOwnProfile && (
                <Link
                  href="/browse"
                  className="inline-block mt-6 bg-[#0069f0] text-white px-7 py-3 rounded-full text-[15px] font-medium hover:bg-[#0052c7] transition-colors"
                >
                  Discover itineraries
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {savedItineraries.map((itinerary) => (
                <Link
                  key={itinerary.id}
                  href={`/itinerary/${itinerary.id}`}
                  className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300"
                >
                  {/* Image */}
                  <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden">
                    {itinerary.photos && itinerary.photos.length > 0 ? (
                      <ImageWithFallback
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
                    <p className="text-gray-600 text-[15px] leading-relaxed line-clamp-3 mb-3">
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
    </div>
  )
}
