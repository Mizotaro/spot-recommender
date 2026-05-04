'use client';

import React from 'react';

interface OneClickProposalProps {
  place: any;
  reason: string;
  searchRadius: number;
  onLike: () => void;
  onSkip: () => void;
  onViewDetail: () => void;
}

export default function OneClickProposal({
  place,
  reason,
  searchRadius,
  onLike,
  onSkip,
  onViewDetail,
}: OneClickProposalProps) {
  if (!place) return null;

  const photoUrl = place.photos?.[0]?.getUrl?.({ maxWidth: 400 }) || null;

  const getPriceDisplay = (level?: number) => {
    return ['', '💰', '💰💰', '💰💰💰', '💰💰💰💰'][level || 0] || '価格情報なし';
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-4">
      {/* ヘッダー */}
      <div className="px-4 pt-4 pb-2 flex justify-between items-center">
        <div>
          <span className="text-xs font-bold text-blue-500 uppercase tracking-wide">
            💡 今すぐおすすめ
          </span>
          <p className="text-xs text-gray-400">
            🌐 {searchRadius / 1000}km 圏内
          </p>
        </div>
      </div>

      {/* 写真 */}
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={place.name}
          className="w-full h-52 object-cover"
        />
      ) : (
        <div className="w-full h-52 bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400 text-4xl">📍</span>
        </div>
      )}

      {/* コンテンツ */}
      <div className="p-4">
        <h2 className="text-xl font-bold mb-1">{place.name}</h2>

        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-bold">⭐ {place.rating?.toFixed(1) || 'N/A'}</span>
          {place.user_ratings_total && (
            <span className="text-xs text-gray-500">({place.user_ratings_total}件)</span>
          )}
          <span className="text-sm">{getPriceDisplay(place.price_level)}</span>
        </div>

        {/* 推薦理由 */}
        <div className="bg-blue-50 rounded-lg p-3 mb-4">
          <p className="text-xs font-bold text-blue-600 mb-1">💡 なぜこれ？</p>
          {reason.split('\n').map((line, i) => (
            <p key={i} className="text-xs text-blue-700">{line}</p>
          ))}
        </div>

        {/* アクション */}
        <div className="flex gap-2">
          <button
            onClick={onSkip}
            className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
          >
            👎 スキップ
          </button>
          <button
            onClick={onViewDetail}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition"
          >
            詳細を見る
          </button>
          <button
            onClick={onLike}
            className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold text-sm hover:bg-green-600 transition"
          >
            ❤️ 行く！
          </button>
        </div>
      </div>
    </div>
  );
}
