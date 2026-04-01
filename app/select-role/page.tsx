'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SelectRolePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<'traveller' | 'experienced_traveller' | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="text-xl">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleSubmit = async () => {
    if (!selectedRole) return

    setSubmitting(true)
    try {
      const { error } = await supabase.from('user_profiles').insert([
        {
          id: user.id,
          email: user.email,
          role: selectedRole,
        },
      ])

      if (error) {
        console.error('Error creating profile:', error)
        alert(`Error saving role: ${error.message}\n\nPlease make sure you've run the SQL setup in Supabase Dashboard.`)
        setSubmitting(false)
        return
      }

      // Successfully created profile, redirect to home
      router.push('/')
    } catch (error: any) {
      console.error('Error creating profile:', error)
      alert('Error saving role. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation Bar */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <Link href="/" className="text-2xl font-semibold text-[#2C2C2C] tracking-tight">
            Itinero
          </Link>
        </div>
      </nav>

      {/* Role Selection */}
      <div className="max-w-5xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-semibold text-[#2C2C2C] mb-4">
            Welcome to Itinero!
          </h1>
          <p className="text-xl text-gray-600">
            Choose how you'd like to use the platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Traveller Option */}
          <button
            onClick={() => setSelectedRole('traveller')}
            className={`p-8 rounded-2xl border-2 text-left transition-all ${
              selectedRole === 'traveller'
                ? 'border-[#0069f0] bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="text-5xl mb-4">🧳</div>
            <h2 className="text-2xl font-semibold text-[#2C2C2C] mb-3">
              Traveller
            </h2>
            <p className="text-gray-600 text-[15px] leading-relaxed mb-4">
              Looking for inspiration and travel ideas? Browse amazing itineraries created by experienced travelers around the world.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Browse public itineraries
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                View photos and recommendations
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Save favorite destinations
              </li>
            </ul>
          </button>

          {/* Experienced Traveller Option */}
          <button
            onClick={() => setSelectedRole('experienced_traveller')}
            className={`p-8 rounded-2xl border-2 text-left transition-all ${
              selectedRole === 'experienced_traveller'
                ? 'border-[#0069f0] bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="text-5xl mb-4">✈️</div>
            <h2 className="text-2xl font-semibold text-[#2C2C2C] mb-3">
              Experienced Traveller
            </h2>
            <p className="text-gray-600 text-[15px] leading-relaxed mb-4">
              Share your travel experiences! Create detailed itineraries with photos, recommendations, and helpful links for other travelers.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Create public itineraries
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Upload photos and add links
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-600">✓</span>
                Share travel recommendations
              </li>
            </ul>
          </button>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={handleSubmit}
            disabled={!selectedRole || submitting}
            className="bg-[#2C2C2C] text-white px-12 py-4 rounded-full text-lg font-medium hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Setting up...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}
