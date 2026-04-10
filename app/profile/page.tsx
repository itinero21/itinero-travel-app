'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'
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
  start_date: string
  end_date: string
  photos: string[]
  is_public: boolean
  created_at: string
  itinerary_days: ItineraryDay[]
}

export default function ProfilePage() {
  const { user, userProfile, loading, refreshProfile } = useAuth()
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [username, setUsername] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [toastMessage, setToastMessage] = useState<{
    text: string
    type: 'success' | 'error' | 'info'
  } | null>(null)
  const [itineraries, setItineraries] = useState<Itinerary[]>([])
  const [loadingItineraries, setLoadingItineraries] = useState(true)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Load profile data
  useEffect(() => {
    if (userProfile) {
      setUsername(userProfile.username || '')
      setBio(userProfile.bio || '')
    }
  }, [userProfile])

  // Fetch user's itineraries
  useEffect(() => {
    async function fetchItineraries() {
      if (!user) return

      try {
        const { data, error } = await supabase
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
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (error) throw error

        // Sort itinerary_days by day_number
        const sortedData = (data || []).map(itinerary => ({
          ...itinerary,
          itinerary_days: (itinerary.itinerary_days || []).sort(
            (a: ItineraryDay, b: ItineraryDay) => a.day_number - b.day_number
          )
        }))

        setItineraries(sortedData)
      } catch (error) {
        console.error('Error fetching itineraries:', error)
      } finally {
        setLoadingItineraries(false)
      }
    }

    fetchItineraries()
  }, [user])

  if (loading || !user || !userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-xl">Loading...</p>
      </div>
    )
  }

  const handleSave = async () => {
    if (!username.trim()) {
      setToastMessage({ text: 'Username is required', type: 'error' })
      return
    }

    setSaving(true)

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({
          username: username.trim(),
          bio: bio.trim() || null,
        })
        .eq('id', user.id)

      if (error) throw error

      await refreshProfile()
      setEditing(false)
      setToastMessage({ text: 'Profile updated successfully!', type: 'success' })
    } catch (error: any) {
      setToastMessage({ text: error.message || 'Error updating profile', type: 'error' })
    } finally {
      setSaving(false)
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
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Back to home
            </Link>
          </div>
        </div>
      </nav>

      {/* Profile Section */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="bg-white border border-gray-100 rounded-2xl p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <h1 className="text-4xl font-semibold text-[#2C2C2C]">
              My Profile
            </h1>
            {!editing && (
              <div className="flex gap-3">
                {userProfile.role === 'experienced_traveller' && (
                  <Link
                    href="/dashboard"
                    className="bg-[#0069f0] text-white px-6 py-2.5 rounded-full text-[15px] font-medium hover:bg-[#0052c7] transition-colors"
                  >
                    Go to Dashboard
                  </Link>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="bg-[#2C2C2C] text-white px-6 py-2.5 rounded-full text-[15px] font-medium hover:bg-[#1a1a1a] transition-colors"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          {editing ? (
            <div className="space-y-6">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-[#2C2C2C] mb-2">
                  Username *
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your_username"
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-[#2C2C2C] mb-2">
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Tell us about yourself..."
                  className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-[#0069f0] text-white px-6 py-2.5 rounded-full text-[15px] font-medium hover:bg-[#0052c7] disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false)
                    setUsername(userProfile.username || '')
                    setBio(userProfile.bio || '')
                  }}
                  className="px-6 py-2.5 border border-gray-200 rounded-full text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 mb-1">Username</p>
                <p className="text-lg font-medium text-[#2C2C2C]">
                  {userProfile.username || 'Not set'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Bio</p>
                <p className="text-[15px] text-gray-700 leading-relaxed">
                  {userProfile.bio || 'No bio yet'}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="text-[15px] text-gray-700">{user.email}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500 mb-1">Role</p>
                <p className="text-[15px] text-gray-700 capitalize">
                  {userProfile.role.replace('_', ' ')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* User's Itineraries */}
        {userProfile.role === 'experienced_traveller' && (
          <div>
            <h2 className="text-3xl font-semibold text-[#2C2C2C] mb-6">
              My Itineraries
            </h2>

            {loadingItineraries ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                  <ItineraryCardSkeleton key={i} />
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
                  Create Your First Itinerary
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {itineraries.map((itinerary) => (
                  <div
                    key={itinerary.id}
                    className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300"
                  >
                    <Link href={`/itinerary/${itinerary.id}`}>
                      <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center overflow-hidden cursor-pointer">
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
                    </Link>

                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>📍</span>
                          <span>{itinerary.destination}</span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          itinerary.is_public
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {itinerary.is_public ? 'Public' : 'Private'}
                        </span>
                      </div>

                      <Link href={`/itinerary/${itinerary.id}`}>
                        <h3 className="text-xl font-semibold text-[#2C2C2C] mb-2 hover:text-[#0069f0] transition-colors cursor-pointer">
                          {itinerary.title}
                        </h3>
                      </Link>

                      <p className="text-gray-600 text-[15px] leading-relaxed line-clamp-2 mb-4">
                        {itinerary.description}
                      </p>

                      {itinerary.itinerary_days && itinerary.itinerary_days.length > 0 && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 mb-4">
                          <p className="text-xs text-gray-700">
                            📅 {itinerary.itinerary_days.length} day{itinerary.itinerary_days.length > 1 ? 's' : ''} planned
                          </p>
                        </div>
                      )}

                      <Link
                        href={`/itinerary/${itinerary.id}`}
                        className="inline-flex items-center gap-2 text-sm font-medium text-[#0069f0] hover:text-[#0052c7] transition-colors"
                      >
                        <span>View Details</span>
                        <span>→</span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
