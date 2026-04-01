'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface TravelItem {
  id: number
  title: string
  description: string
}

export default function Home() {
  const [data, setData] = useState<TravelItem[]>([])
  const [error, setError] = useState(false)
  const { user, userProfile, loading, signOut } = useAuth()
  const router = useRouter()

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: items, error } = await supabase
          .from('travel_items')
          .select('*')

        if (error) throw error

        setData(items || [])
      } catch (err) {
        console.error('Error fetching data:', err)
        setError(true)
      }
    }

    fetchData()
  }, [])

  // Redirect to role selection if user is logged in but has no role
  useEffect(() => {
    if (!loading && user && !userProfile) {
      router.push('/select-role')
    }
  }, [user, userProfile, loading, router])

  const handleLogout = async () => {
    await signOut()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link href="/" className="text-2xl font-semibold text-[#2C2C2C] tracking-tight">
              Itinero
            </Link>

            {/* Auth Actions */}
            <div className="flex gap-3 items-center">
              {loading ? (
                <div className="h-10 w-20 bg-gray-100 animate-pulse rounded-full"></div>
              ) : user && userProfile ? (
                <>
                  <span className="text-sm text-gray-500 hidden md:inline">
                    {user.email}
                  </span>
                  {userProfile.role === 'experienced_traveller' && (
                    <Link
                      href="/add-itinerary"
                      className="bg-[#2C2C2C] text-white px-6 py-2.5 rounded-full text-[15px] font-medium hover:bg-[#1a1a1a] transition-colors"
                    >
                      Create Itinerary
                    </Link>
                  )}
                  {userProfile.role === 'traveller' && (
                    <Link
                      href="/browse"
                      className="bg-[#2C2C2C] text-white px-6 py-2.5 rounded-full text-[15px] font-medium hover:bg-[#1a1a1a] transition-colors"
                    >
                      Browse Trips
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="text-gray-600 hover:text-gray-900 px-4 py-2.5 text-[15px] font-medium transition-colors"
                  >
                    Sign Out
                  </button>
                </>
              ) : user ? (
                <div className="text-sm text-gray-500">Setting up...</div>
              ) : (
                <Link
                  href="/login"
                  className="bg-[#2C2C2C] text-white px-6 py-2.5 rounded-full text-[15px] font-medium hover:bg-[#1a1a1a] transition-colors"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-6xl font-semibold text-[#2C2C2C] mb-6 leading-tight">
            Plan Your Next Adventure
          </h1>
          <p className="text-xl text-gray-600 mb-10 leading-relaxed">
            Create, organize, and share your travel itineraries with ease. Your journey starts here.
          </p>
          {!user && (
            <Link
              href="/login"
              className="inline-block bg-[#0069f0] text-white px-8 py-4 rounded-full text-lg font-medium hover:bg-[#0052c7] transition-colors"
            >
              Get Started
            </Link>
          )}
        </div>
      </section>

      {/* Destinations Grid */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-semibold text-[#2C2C2C] mb-10">
          Popular Destinations
        </h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-8">
            <p className="text-red-800 text-sm">Error loading destinations</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.map((item) => (
            <div
              key={item.id}
              className="group bg-white border border-gray-100 rounded-2xl overflow-hidden hover:shadow-xl hover:border-gray-200 transition-all duration-300"
            >
              <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
                <span className="text-6xl opacity-60">🌍</span>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-[#2C2C2C] mb-2 group-hover:text-[#0069f0] transition-colors">
                  {item.title}
                </h3>
                <p className="text-gray-600 text-[15px] leading-relaxed">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="max-w-7xl mx-auto px-6 py-20">
          <div className="bg-gradient-to-br from-[#2C2C2C] to-[#1a1a1a] rounded-3xl p-16 text-center">
            <h2 className="text-4xl font-semibold text-white mb-4">
              Ready to explore the world?
            </h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of travelers who trust Itinero to plan their perfect trips.
            </p>
            <Link
              href="/login"
              className="inline-block bg-white text-[#2C2C2C] px-8 py-4 rounded-full text-lg font-medium hover:bg-gray-100 transition-colors"
            >
              Start Planning Today
            </Link>
          </div>
        </section>
      )}
    </div>
  )
}
