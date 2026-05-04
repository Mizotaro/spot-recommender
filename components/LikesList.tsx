'use client';

import React from 'react';

const STATUS_ICON: Record<string, string> = {
  visited:    '✅',
  want_to_go: '🎯',
  interested: '💭',
};

interface Like {
  placeId: string;
  placeName: string;
  rating: number;
  category: string;
  memo?: string;
  status?: string;
}

export default function LikesList({ likes }: { likes: Like[] }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-bold mb-3">❤️ いいね済み ({likes.length})</h2>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {likes.length === 0 ? (
          <p className="text-gray-500 text-sm">まだいいねしたお店がありません</p>
        ) : (
          likes.map((like) => (
            <div key={like.placeId} className="p-2 bg-blue-50 rounded border-l-4 border-blue-400">
              <div className="flex items-start justify-between gap-1">
                <p className="font-semibold text-sm leading-tight">{like.placeName}</p>
                {like.status && (
                  <span className="text-base shrink-0">{STATUS_ICON[like.status] ?? '❤️'}</span>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                ⭐ {like.rating.toFixed(1)} • {like.category}
              </p>
              {like.memo && (
                <p className="text-xs text-gray-500 mt-1 italic line-clamp-2">"{like.memo}"</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
