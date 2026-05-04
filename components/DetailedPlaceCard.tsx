'use client';

import React from 'react';

interface DetailedPlaceCardProps {
  place: any;
  onClose: () => void;
  onLike: () => void;
}

export default function DetailedPlaceCard({
  place,
  onClose,
  onLike,
}: DetailedPlaceCardProps) {
  const {
    name,
    rating,
    user_ratings_total,
    photos,
    opening_hours,
    formatted_address,
    formatted_phone_number,
    price_level,
    business_status,
  } = place;

  const priceMap: Record<number, string> = {
    1: '💰 安い',
    2: '💰💰 中程度',
    3: '💰💰💰 高め',
    4: '💰💰💰💰 非常に高い',
  };
  const priceDisplay = priceMap[price_level as number] || '価格情報なし';

  const photoUrl = photos?.[0]?.getUrl?.({ maxWidth: 400 }) || null;
  const isOpen = opening_hours?.isOpen?.() ?? null;

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden max-w-sm">
      {/* 写真 */}
      {photoUrl && (
        <img
          src={photoUrl}
          alt={name}
          className="w-full h-48 object-cover"
        />
      )}

      {/* 内容 */}
      <div className="p-4">
        {/* タイトル */}
        <h2 className="text-xl font-bold mb-2">{name}</h2>

        {/* ステータス */}
        {business_status && (
          <p className={`text-sm font-semibold mb-2 ${
            business_status === 'OPERATIONAL'
              ? 'text-green-600'
              : 'text-red-600'
          }`}>
            {business_status === 'OPERATIONAL' ? '✅ 営業中' : '❌ 閉業中'}
          </p>
        )}

        {/* 営業時間 */}
        {isOpen !== null && (
          <p className={`text-sm mb-2 ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
            {isOpen ? '🟢 現在営業中' : '🔴 現在閉業中'}
          </p>
        )}

        {/* 評価 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-lg font-bold">⭐ {rating?.toFixed(1)}</span>
          <span className="text-sm text-gray-600">
            ({user_ratings_total?.toLocaleString()} 件)
          </span>
        </div>

        {/* 価格帯 */}
        <p className="text-sm mb-2">{priceDisplay}</p>

        {/* 住所 */}
        {formatted_address && (
          <p className="text-sm text-gray-600 mb-2">📍 {formatted_address}</p>
        )}

        {/* 電話番号 */}
        {formatted_phone_number && (
          <p className="text-sm text-gray-600 mb-3">📞 {formatted_phone_number}</p>
        )}

        {/* アクション */}
        <div className="flex gap-2">
          <button
            onClick={onLike}
            className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition"
          >
            ❤️ いいねする
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded-lg font-semibold transition"
          >
            ✕ 閉じる
          </button>
        </div>
      </div>
    </div>
  );
}