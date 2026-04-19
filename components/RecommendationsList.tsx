'use client';

import React from 'react';

interface Place {
  place_id: string;
  name: string;
  rating?: number;
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
}

interface RecommendationsListProps {
  recommendations: Place[];
  onLikePlace: (place: Place) => void;
}

export default function RecommendationsList({
  recommendations,
  onLikePlace,
}: RecommendationsListProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-bold mb-3">🎯 推薦 ({recommendations.length})</h2>
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {recommendations.length === 0 ? (
          <p className="text-gray-500 text-sm">まずお気に入りを追加してください</p>
        ) : (
          recommendations.map((rec) => (
            <div
              key={rec.place_id}
              className="p-2 bg-red-50 rounded border-l-4 border-red-400 flex justify-between items-start"
            >
              <div className="flex-1">
                <p className="font-semibold text-sm">{rec.name}</p>
                <p className="text-xs text-gray-600">
                  ⭐ {rec.rating ? rec.rating.toFixed(1) : 'N/A'}
                </p>
              </div>
              <button
                onClick={() => onLikePlace(rec)}
                className="ml-2 px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
              >
                ❤️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}