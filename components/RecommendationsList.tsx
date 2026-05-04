'use client';

import React, { useState } from 'react';
import { formatDistance } from '@/lib/distance';

interface Place {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  distanceM?: number;
  photos?: Array<{
    photo_reference?: string;
    getUrl?: (opts: { maxWidth: number }) => string;
  }>;
  geometry: {
    location: {
      lat: (() => number) | number;
      lng: (() => number) | number;
    };
  };
}

interface RecommendationsListProps {
  recommendations: Place[];
  onLikePlace: (place: Place) => void;
  onSelectPlace?: (place: Place) => void;
}

const PRICE_LABEL: Record<number, string> = { 1: '¥', 2: '¥¥', 3: '¥¥¥', 4: '¥¥¥¥' };

function getThumbUrl(place: Place): string | null {
  const photo = place.photos?.[0];
  if (!photo) return null;
  if (typeof photo.getUrl === 'function') return photo.getUrl({ maxWidth: 100 });
  if (photo.photo_reference) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=100&photo_reference=${photo.photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`;
  }
  return null;
}

type SortBy = 'rating' | 'distance';

export default function RecommendationsList({
  recommendations,
  onLikePlace,
  onSelectPlace,
}: RecommendationsListProps) {
  const [sortBy, setSortBy] = useState<SortBy>('rating');

  const sorted = [...recommendations].sort((a, b) => {
    if (sortBy === 'distance') {
      return (a.distanceM ?? Infinity) - (b.distanceM ?? Infinity);
    }
    return (b.rating ?? 0) - (a.rating ?? 0);
  });

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* ヘッダー + ソート切り替え */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold">🎯 推薦 ({recommendations.length})</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setSortBy('rating')}
            className={`px-2 py-1 rounded text-xs font-semibold transition ${
              sortBy === 'rating' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            ⭐ 評価順
          </button>
          <button
            onClick={() => setSortBy('distance')}
            className={`px-2 py-1 rounded text-xs font-semibold transition ${
              sortBy === 'distance' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📍 距離順
          </button>
        </div>
      </div>

      {recommendations.length === 0 ? (
        <p className="text-gray-500 text-sm">まずお気に入りを追加してください</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
          {sorted.map((rec) => {
            const thumb = getThumbUrl(rec);
            const price = rec.price_level ? PRICE_LABEL[rec.price_level] : null;

            return (
              <div
                key={rec.place_id}
                className="flex gap-3 p-3 border border-gray-100 rounded-lg hover:bg-red-50 hover:border-red-200 cursor-pointer transition"
                onClick={() => onSelectPlace?.(rec)}
              >
                {/* サムネイル */}
                <div className="w-20 h-20 shrink-0 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                  {thumb ? (
                    <img src={thumb} alt={rec.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-3xl">🏪</span>
                  )}
                </div>

                {/* 情報 */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                  <p className="font-semibold text-sm leading-tight line-clamp-2">{rec.name}</p>
                  <div className="space-y-0.5">
                    <p className="text-xs text-gray-600">
                      ⭐ {rec.rating ? rec.rating.toFixed(1) : 'N/A'}
                      {rec.user_ratings_total ? (
                        <span className="text-gray-400"> ({rec.user_ratings_total}件)</span>
                      ) : null}
                    </p>
                    {price && <p className="text-xs text-gray-500">💰 {price}</p>}
                    {rec.distanceM !== undefined && (
                      <p className="text-xs text-blue-600 font-semibold">
                        📍 {formatDistance(rec.distanceM)}
                      </p>
                    )}
                  </div>
                </div>

                {/* いいねボタン */}
                <button
                  onClick={(e) => { e.stopPropagation(); onLikePlace(rec); }}
                  className="shrink-0 self-center px-2 py-1.5 bg-green-500 text-white rounded text-xs hover:bg-green-600 transition"
                  title="いいねする"
                >
                  ❤️
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
