'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AddItineraryPage() {
  const { user, userProfile, loading } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    destination: '',
    start_date: '',
    end_date: '',
    recommendations: '',
    is_public: true,
  })
  const [photoUrls, setPhotoUrls] = useState<string[]>([''])
  const [links, setLinks] = useState<string[]>([''])
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-xl">Loading...</p>
      </div>
    )
  }

  // Don't render the form if user is not logged in
  if (!user) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage('')

    try {
      // Filter out empty photo URLs and links
      const validPhotos = photoUrls.filter(url => url.trim() !== '')
      const validLinks = links.filter(link => link.trim() !== '')

      const { error} = await supabase.from('itineraries').insert([
        {
          user_id: user.id,
          title: formData.title,
          description: formData.description,
          destination: formData.destination,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          recommendations: formData.recommendations || null,
          photos: validPhotos.length > 0 ? validPhotos : null,
          links: validLinks.length > 0 ? validLinks : null,
          is_public: formData.is_public,
        },
      ])

      if (error) throw error

      setMessage('Itinerary created successfully!')
      setFormData({
        title: '',
        description: '',
        destination: '',
        start_date: '',
        end_date: '',
        recommendations: '',
        is_public: true,
      })
      setPhotoUrls([''])
      setLinks([''])

      // Redirect to home page after 1.5 seconds
      setTimeout(() => {
        router.push('/')
      }, 1500)
    } catch (error: any) {
      setMessage(error.message || 'Error creating itinerary')
    } finally {
      setSubmitting(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    })
  }

  const addPhotoUrl = () => {
    setPhotoUrls([...photoUrls, ''])
  }

  const removePhotoUrl = (index: number) => {
    setPhotoUrls(photoUrls.filter((_, i) => i !== index))
  }

  const updatePhotoUrl = (index: number, value: string) => {
    const newPhotos = [...photoUrls]
    newPhotos[index] = value
    setPhotoUrls(newPhotos)
  }

  const addLink = () => {
    setLinks([...links, ''])
  }

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const updateLink = (index: number, value: string) => {
    const newLinks = [...links]
    newLinks[index] = value
    setLinks(newLinks)
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

      {/* Form Section */}
      <div className="max-w-3xl mx-auto px-6 py-16">
        <div className="mb-12">
          <h1 className="text-5xl font-semibold text-[#2C2C2C] mb-4">
            Create New Trip
          </h1>
          <p className="text-xl text-gray-600">
            Plan your next adventure with all the details
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-[#2C2C2C] mb-2"
            >
              Trip Name *
            </label>
            <input
              id="title"
              name="title"
              type="text"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all"
              placeholder="Summer in Europe"
            />
          </div>

          <div>
            <label
              htmlFor="destination"
              className="block text-sm font-medium text-[#2C2C2C] mb-2"
            >
              Destination *
            </label>
            <input
              id="destination"
              name="destination"
              type="text"
              value={formData.destination}
              onChange={handleChange}
              required
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all"
              placeholder="Paris, France"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-[#2C2C2C] mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all resize-none"
              placeholder="Tell us about your trip plans, activities, and what you're excited about..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="start_date"
                className="block text-sm font-medium text-[#2C2C2C] mb-2"
              >
                Start Date
              </label>
              <input
                id="start_date"
                name="start_date"
                type="date"
                value={formData.start_date}
                onChange={handleChange}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="end_date"
                className="block text-sm font-medium text-[#2C2C2C] mb-2"
              >
                End Date
              </label>
              <input
                id="end_date"
                name="end_date"
                type="date"
                value={formData.end_date}
                onChange={handleChange}
                className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Recommendations */}
          <div>
            <label
              htmlFor="recommendations"
              className="block text-sm font-medium text-[#2C2C2C] mb-2"
            >
              Recommendations
            </label>
            <textarea
              id="recommendations"
              name="recommendations"
              value={formData.recommendations}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all resize-none"
              placeholder="Share your tips and recommendations for travelers..."
            />
          </div>

          {/* Photo URLs */}
          <div>
            <label className="block text-sm font-medium text-[#2C2C2C] mb-2">
              Photo URLs
            </label>
            <div className="space-y-3">
              {photoUrls.map((photo, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={photo}
                    onChange={(e) => updatePhotoUrl(index, e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all"
                  />
                  {photoUrls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePhotoUrl(index)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addPhotoUrl}
                className="text-[#0069f0] text-sm font-medium hover:underline"
              >
                + Add another photo
              </button>
            </div>
          </div>

          {/* Links */}
          <div>
            <label className="block text-sm font-medium text-[#2C2C2C] mb-2">
              Useful Links
            </label>
            <div className="space-y-3">
              {links.map((link, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => updateLink(index, e.target.value)}
                    placeholder="https://example.com"
                    className="flex-1 px-4 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all"
                  />
                  {links.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLink(index)}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addLink}
                className="text-[#0069f0] text-sm font-medium hover:underline"
              >
                + Add another link
              </button>
            </div>
          </div>

          {/* Public visibility */}
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <input
              type="checkbox"
              id="is_public"
              name="is_public"
              checked={formData.is_public}
              onChange={handleChange}
              className="w-5 h-5 text-[#0069f0] border-gray-300 rounded focus:ring-2 focus:ring-[#0069f0]"
            />
            <label htmlFor="is_public" className="text-sm text-gray-700">
              Make this itinerary public (visible to all travelers)
            </label>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-[#2C2C2C] text-white py-3.5 px-6 rounded-full text-[15px] font-medium hover:bg-[#1a1a1a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Creating your trip...' : 'Create Trip'}
            </button>
            <Link
              href="/"
              className="px-8 py-3.5 border border-gray-200 rounded-full text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>

        {message && (
          <div
            className={`mt-6 p-5 rounded-xl ${
              message.includes('successfully')
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <p
              className={`text-sm ${
                message.includes('successfully')
                  ? 'text-green-800'
                  : 'text-red-800'
              }`}
            >
              {message}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
