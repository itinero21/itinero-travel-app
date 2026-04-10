import { supabase } from '@/lib/supabase'

export function calculateCreatorScore(
  trips: number,
  avgRating: number,
  followers: number
): number {
  return trips * 10 + avgRating * 20 + followers * 5
}

export interface CreatorScoreData {
  id: string
  username: string
  bio: string | null
  trips: number
  avgRating: number
  followers: number
  score: number
}

export async function fetchTopCreators(limit = 5): Promise<CreatorScoreData[]> {
  // Query 1: all experienced travellers
  const { data: creators, error: creatorsError } = await supabase
    .from('user_profiles')
    .select('id, username, bio')
    .eq('role', 'experienced_traveller')

  if (creatorsError || !creators || creators.length === 0) return []

  const ids = creators.map((c) => c.id)

  // Query 2: public itinerary counts + ratings (all at once)
  // Query 3: follower counts
  const [{ data: itineraryData }, { data: followerData }] = await Promise.all([
    supabase
      .from('itineraries')
      .select(`
        user_id,
        reviews ( rating )
      `)
      .eq('is_public', true)
      .in('user_id', ids),
    supabase
      .from('follows')
      .select('following_id')
      .in('following_id', ids),
  ])

  // Aggregate trip counts and avg ratings per creator
  const tripMap: Record<string, { count: number; ratings: number[] }> = {}
  for (const row of itineraryData || []) {
    if (!tripMap[row.user_id]) tripMap[row.user_id] = { count: 0, ratings: [] }
    tripMap[row.user_id].count += 1
    const reviews = (row.reviews as { rating: number }[]) || []
    for (const r of reviews) tripMap[row.user_id].ratings.push(r.rating)
  }

  // Aggregate follower counts per creator
  const followerMap: Record<string, number> = {}
  for (const row of followerData || []) {
    followerMap[row.following_id] = (followerMap[row.following_id] || 0) + 1
  }

  // Build scored list
  const scored: CreatorScoreData[] = creators.map((creator) => {
    const trips = tripMap[creator.id]?.count ?? 0
    const ratings = tripMap[creator.id]?.ratings ?? []
    const avgRating =
      ratings.length > 0
        ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 10) / 10
        : 0
    const followers = followerMap[creator.id] ?? 0
    return {
      id: creator.id,
      username: creator.username,
      bio: creator.bio,
      trips,
      avgRating,
      followers,
      score: calculateCreatorScore(trips, avgRating, followers),
    }
  })

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
}
