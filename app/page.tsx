'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface TravelItem {
  id: number
  title: string
  description: string
}

export default function Home() {
  const [data, setData] = useState<TravelItem[]>([])
  const [error, setError] = useState(false)

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

  return (
    <main className="p-10">
      <h1 className="text-3xl font-bold">Travel App 🌍</h1>

      {error && <p className="text-red-500 mt-4">Error loading data</p>}

      {data?.map((item) => (
        <div key={item.id} className="border p-4 mt-4 rounded-lg">
          <h2 className="text-xl font-semibold">{item.title}</h2>
          <p className="text-gray-600">{item.description}</p>
        </div>
      ))}
    </main>
  )
}
