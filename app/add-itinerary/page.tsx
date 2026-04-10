'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Toast from '@/components/Toast'

interface LinkEntry {
  url: string
  label: string
  category: string
}

const LINK_CATEGORIES = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'flight', label: 'Flight' },
  { value: 'tour', label: 'Tour' },
  { value: 'transport', label: 'Transport' },
  { value: 'gear', label: 'Gear' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'other', label: 'Other' },
]

export default function AddItineraryPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    destination: '',
    budget: '',
    start_date: '',
    end_date: '',
    recommendations: '',
    is_public: true,
  })
  const [photoUrls, setPhotoUrls] = useState<string[]>([''])
  const [links, setLinks] = useState<LinkEntry[]>([{ url: '', label: '', category: 'other' }])
  const [days, setDays] = useState<Array<{ title: string; activities: string[] }>>([
    { title: 'Day 1', activities: [''] }
  ])
  const [submitting, setSubmitting] = useState(false)
  const [toastMessage, setToastMessage] = useState<{
    text: string
    type: 'success' | 'error' | 'info'
  } | null>(null)
  const [showAffiliateTip, setShowAffiliateTip] = useState(false)
  const [linkValidation, setLinkValidation] = useState<Record<number, 'valid' | 'invalid' | ''>>({})

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

    // Validation
    if (!formData.title.trim()) {
      setToastMessage({ text: 'Please enter a trip name', type: 'error' })
      setSubmitting(false)
      return
    }

    if (!formData.destination.trim()) {
      setToastMessage({ text: 'Please enter a destination', type: 'error' })
      setSubmitting(false)
      return
    }

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date)
      const end = new Date(formData.end_date)
      if (end < start) {
        setToastMessage({ text: 'End date must be after start date', type: 'error' })
        setSubmitting(false)
        return
      }
    }

    try {
      // Filter out empty photo URLs and links
      const validPhotos = photoUrls.filter(url => url.trim() !== '')
      const validLinks = links.filter(l => l.url.trim() !== '')

      // Create itinerary — links column left null for new itineraries (rich links stored in itinerary_links)
      const { data: itinerary, error: itineraryError } = await supabase
        .from('itineraries')
        .insert([
          {
            user_id: user.id,
            title: formData.title,
            description: formData.description,
            destination: formData.destination,
            budget: formData.budget.trim() || null,
            start_date: formData.start_date || null,
            end_date: formData.end_date || null,
            recommendations: formData.recommendations || null,
            photos: validPhotos.length > 0 ? validPhotos : null,
            links: null,
            is_public: formData.is_public,
          },
        ])
        .select()
        .single()

      if (itineraryError) throw itineraryError

      // Insert rich links into itinerary_links table
      if (validLinks.length > 0) {
        const { error: linksError } = await supabase
          .from('itinerary_links')
          .insert(
            validLinks.map((l) => ({
              itinerary_id: itinerary.id,
              url: l.url.trim(),
              label: l.label.trim() || null,
              category: l.category || 'other',
            }))
          )
        if (linksError) throw linksError
      }

      // Create days for the itinerary
      const daysToInsert = days
        .filter(day => day.title.trim() !== '' && day.activities.some(a => a.trim() !== ''))
        .map((day, index) => ({
          itinerary_id: itinerary.id,
          day_number: index + 1,
          title: day.title,
          activities: day.activities.filter(a => a.trim() !== ''),
        }))

      if (daysToInsert.length > 0) {
        const { error: daysError } = await supabase
          .from('itinerary_days')
          .insert(daysToInsert)

        if (daysError) throw daysError
      }

      setToastMessage({ text: 'Itinerary created successfully!', type: 'success' })
      setFormData({
        title: '',
        description: '',
        destination: '',
        budget: '',
        start_date: '',
        end_date: '',
        recommendations: '',
        is_public: true,
      })
      setPhotoUrls([''])
      setLinks([{ url: '', label: '', category: 'other' }])
      setDays([{ title: 'Day 1', activities: [''] }])
      setLinkValidation({})

      if (validLinks.length === 0) {
        // Show nudge after 2s, redirect after 4s to give user time to read it
        setTimeout(() => {
          setToastMessage({
            text: "Tip: itineraries with affiliate links earn more — you can add them by editing your trip",
            type: 'info',
          })
        }, 2000)
        setTimeout(() => router.push('/'), 4000)
      } else {
        setTimeout(() => router.push('/'), 1500)
      }
    } catch (error: any) {
      setToastMessage({ text: error.message || 'Error creating itinerary', type: 'error' })
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
    setLinks([...links, { url: '', label: '', category: 'other' }])
  }

  const removeLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index))
  }

  const updateLink = (index: number, field: keyof LinkEntry, value: string) => {
    const newLinks = [...links]
    newLinks[index] = { ...newLinks[index], [field]: value }
    setLinks(newLinks)
    // Clear validation state when user types
    if (field === 'url') {
      setLinkValidation(prev => ({ ...prev, [index]: '' }))
    }
  }

  const handleLinkUrlBlur = (index: number) => {
    const raw = links[index].url.trim()
    if (!raw) {
      setLinkValidation(prev => ({ ...prev, [index]: '' }))
      return
    }
    // Auto-prepend https:// if no protocol
    let normalized = raw
    if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
      normalized = 'https://' + raw
      const newLinks = [...links]
      newLinks[index] = { ...newLinks[index], url: normalized }
      setLinks(newLinks)
    }
    // Validate
    try {
      const parsed = new URL(normalized)
      const valid = parsed.hostname.includes('.')
      setLinkValidation(prev => ({ ...prev, [index]: valid ? 'valid' : 'invalid' }))
    } catch {
      setLinkValidation(prev => ({ ...prev, [index]: 'invalid' }))
    }
  }

  // Day management functions
  const addDay = () => {
    setDays([...days, { title: `Day ${days.length + 1}`, activities: [''] }])
  }

  const removeDay = (dayIndex: number) => {
    setDays(days.filter((_, i) => i !== dayIndex))
  }

  const updateDayTitle = (dayIndex: number, value: string) => {
    const newDays = [...days]
    newDays[dayIndex].title = value
    setDays(newDays)
  }

  const addActivity = (dayIndex: number) => {
    const newDays = [...days]
    newDays[dayIndex].activities.push('')
    setDays(newDays)
  }

  const removeActivity = (dayIndex: number, activityIndex: number) => {
    const newDays = [...days]
    newDays[dayIndex].activities = newDays[dayIndex].activities.filter((_, i) => i !== activityIndex)
    setDays(newDays)
  }

  const updateActivity = (dayIndex: number, activityIndex: number, value: string) => {
    const newDays = [...days]
    newDays[dayIndex].activities[activityIndex] = value
    setDays(newDays)
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

          <div>
            <label
              htmlFor="budget"
              className="block text-sm font-medium text-[#2C2C2C] mb-2"
            >
              Estimated Budget
            </label>
            <input
              id="budget"
              name="budget"
              type="text"
              value={formData.budget}
              onChange={handleChange}
              className="w-full px-4 py-3.5 border border-gray-200 rounded-xl text-[15px] focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all"
              placeholder="e.g. $1,500 total, ~$200/day, Budget-friendly"
            />
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

            {/* Collapsible affiliate tip box */}
            <button
              type="button"
              onClick={() => setShowAffiliateTip((v) => !v)}
              className="w-full text-left mb-4 border-l-4 border-blue-400 bg-blue-50 rounded-lg px-4 py-3 flex items-center justify-between hover:bg-blue-100 transition-colors"
            >
              <span className="text-sm font-medium text-blue-800">
                How to earn with affiliate links
              </span>
              <svg
                className={`w-4 h-4 text-blue-600 flex-shrink-0 transition-transform duration-200 ${showAffiliateTip ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showAffiliateTip && (
              <div className="mb-4 border-l-4 border-blue-400 bg-blue-50 rounded-lg px-4 py-3 text-sm text-blue-900">
                <p className="mb-2">
                  Add affiliate links from these programs and earn commission when travellers book:
                </p>
                <ul className="space-y-1 mb-3">
                  {[
                    'Booking.com Partner Program',
                    'GetYourGuide Affiliate',
                    'Skyscanner Affiliate',
                    'Amazon Associates (for gear)',
                    'Viator Affiliate Program',
                  ].map((program) => (
                    <li key={program} className="flex items-center gap-2">
                      <span className="text-blue-500">•</span>
                      {program}
                    </li>
                  ))}
                </ul>
                <p className="text-blue-700 italic">
                  Tip: Label your links clearly — &quot;Hotel I stayed at&quot; converts better than a raw URL.
                </p>
              </div>
            )}

            <div className="space-y-4">
              {links.map((link, index) => {
                const validation = linkValidation[index]
                return (
                  <div key={index} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 relative">
                        <input
                          type="url"
                          value={link.url}
                          onChange={(e) => updateLink(index, 'url', e.target.value)}
                          onBlur={() => handleLinkUrlBlur(index)}
                          placeholder="https://example.com"
                          className={`w-full px-4 py-3 border rounded-xl text-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all ${
                            validation === 'invalid'
                              ? 'border-amber-400'
                              : validation === 'valid'
                              ? 'border-green-400'
                              : 'border-gray-200'
                          }`}
                        />
                        {validation === 'valid' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500 text-base">
                            ✓
                          </span>
                        )}
                        {validation === 'invalid' && (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 text-base">
                            ⚠
                          </span>
                        )}
                      </div>
                      {links.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLink(index)}
                          className="px-3 py-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    {validation === 'invalid' && (
                      <p className="text-xs text-amber-600">
                        This doesn&apos;t look like a valid URL — check it includes a domain (e.g. booking.com)
                      </p>
                    )}
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={link.label}
                        onChange={(e) => updateLink(index, 'label', e.target.value)}
                        placeholder="Give this link a label"
                        className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all"
                      />
                      <select
                        value={link.category}
                        onChange={(e) => updateLink(index, 'category', e.target.value)}
                        className="px-4 py-2.5 border border-gray-200 rounded-xl text-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all"
                      >
                        {LINK_CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
              <button
                type="button"
                onClick={addLink}
                className="text-[#0069f0] text-sm font-medium hover:underline"
              >
                + Add another link
              </button>
            </div>
          </div>

          {/* Day-by-Day Itinerary */}
          <div className="border-t border-gray-200 pt-8">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-[#2C2C2C]">
                Day-by-Day Plan
              </label>
              <button
                type="button"
                onClick={addDay}
                className="text-[#0069f0] text-sm font-medium hover:underline"
              >
                + Add Day
              </button>
            </div>

            <div className="space-y-6">
              {days.map((day, dayIndex) => (
                <div key={dayIndex} className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <div className="flex items-center justify-between mb-4">
                    <input
                      type="text"
                      value={day.title}
                      onChange={(e) => updateDayTitle(dayIndex, e.target.value)}
                      placeholder={`Day ${dayIndex + 1}`}
                      className="text-lg font-semibold bg-transparent border-none focus:outline-none text-[#2C2C2C] w-full"
                    />
                    {days.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDay(dayIndex)}
                        className="text-red-600 hover:bg-red-50 px-3 py-1 rounded-lg text-sm transition-colors"
                      >
                        Remove Day
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm text-gray-600 mb-2">Activities</label>
                    {day.activities.map((activity, activityIndex) => (
                      <div key={activityIndex} className="flex gap-2">
                        <input
                          type="text"
                          value={activity}
                          onChange={(e) => updateActivity(dayIndex, activityIndex, e.target.value)}
                          placeholder="e.g., Visit Eiffel Tower at 9 AM"
                          className="flex-1 px-4 py-2.5 border border-gray-200 rounded-lg text-[15px] bg-white focus:outline-none focus:ring-2 focus:ring-[#0069f0] focus:border-transparent transition-all"
                        />
                        {day.activities.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeActivity(dayIndex, activityIndex)}
                            className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addActivity(dayIndex)}
                      className="text-[#0069f0] text-sm font-medium hover:underline mt-2"
                    >
                      + Add Activity
                    </button>
                  </div>
                </div>
              ))}
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
      </div>
    </div>
  )
}
