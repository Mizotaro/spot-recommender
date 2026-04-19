'use client';

import React from 'react';

interface Like {
  placeId: string;
  placeName: string;
  rating: number;
  category: string;
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
              <p className="font-semibold text-sm">{like.placeName}</p>
              <p className="text-xs text-gray-600">
                ⭐ {like.rating.toFixed(1)} • {like.category}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}