'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      })

      if (error) throw error

      setMessage('Check your email for the magic link!')
    } catch (error: any) {
      setMessage(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <nav className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <Link href="/" className="text-2xl font-semibold text-[#2C2C2C] tracking-tight">
            Itinero
          </Link>
        </div>
      </nav>

      {/* Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-semibold text-[#2C2C2C] mb-3">
              Welcome back
            </h1>
            <p className="text-gray-600 text-[15px]">
              Sign in to access your travel plans
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[#2C2C2C] mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#2C2C2C] text-white py-3.5 px-6 rounded-full text-[15px] font-medium hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending magic link...' : 'Continue with Email'}
            </button>
          </form>

          {message && (
            <div
              className={`mt-5 p-4 rounded-xl ${
                message.includes('Check your email')
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-red-50 border border-red-200'
              }`}
            >
              <p
                className={`text-sm ${
                  message.includes('Check your email')
                    ? 'text-green-800'
                    : 'text-red-800'
                }`}
              >
                {message}
              </p>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-sm text-gray-500">
              No password required. We'll send you a secure link to sign in.
            </p>
          </div>

          <div className="mt-8 text-center">
            <Link href="/" className="text-sm text-[#0069f0] hover:underline">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
