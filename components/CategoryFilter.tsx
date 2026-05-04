'use client';

import React from 'react';

interface CategoryFilterProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  openNowOnly: boolean;
  onOpenNowChange: (v: boolean) => void;
}

const CATEGORIES = [
  { value: 'restaurant',       label: '🍽️ レストラン' },
  { value: 'cafe',             label: '☕ カフェ' },
  { value: 'museum',           label: '🏛️ 美術館' },
  { value: 'park',             label: '🌳 公園' },
  { value: 'tourist_attraction', label: '🎡 観光地' },
  { value: 'bar',              label: '🍺 バー' },
  { value: 'shopping_mall',    label: '🛍️ ショップ' },
  { value: 'movie_theater',    label: '🎬 映画館' },
];

export default function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  openNowOnly,
  onOpenNowChange,
}: CategoryFilterProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h3 className="text-lg font-bold mb-3">🏷️ カテゴリを選択</h3>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => onCategoryChange(cat.value)}
            className={`px-3 py-2 rounded-lg font-semibold text-sm transition ${
              selectedCategory === cat.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 今開いているフィルター */}
      <button
        onClick={() => onOpenNowChange(!openNowOnly)}
        className={`w-full py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${
          openNowOnly
            ? 'bg-green-500 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        <span>{openNowOnly ? '🟢' : '⭕'}</span>
        今開いている場所だけ
      </button>
    </div>
  );
}
