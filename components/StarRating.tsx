'use client'

import { useState } from 'react'

interface StarRatingProps {
  rating: number
  interactive?: boolean
  onRate?: (rating: number) => void
  size?: 'sm' | 'md' | 'lg'
}

const sizeMap = { sm: 14, md: 20, lg: 28 }

export default function StarRating({
  rating,
  interactive = false,
  onRate,
  size = 'md',
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0)
  const px = sizeMap[size]
  const active = interactive ? (hovered || rating) : rating

  return (
    <span className="inline-flex items-center gap-0.5" style={{ fontSize: px }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{
            color: star <= active ? '#f59e0b' : '#d1d5db',
            cursor: interactive ? 'pointer' : 'default',
            lineHeight: 1,
            userSelect: 'none',
          }}
          onMouseEnter={() => interactive && setHovered(star)}
          onMouseLeave={() => interactive && setHovered(0)}
          onClick={() => interactive && onRate?.(star)}
          aria-label={interactive ? `Rate ${star} star${star > 1 ? 's' : ''}` : undefined}
        >
          {star <= active ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}
