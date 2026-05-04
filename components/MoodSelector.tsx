'use client';

import React from 'react';

export interface Mood {
  id: string;
  label: string;
  emoji: string;
  description: string;
  categoryPriority: string[];
  minRating: number;
}

export const MOODS: Mood[] = [
  {
    id: 'energetic',
    label: 'がっつり',
    emoji: '🔥',
    description: 'エネルギッシュに楽しみたい',
    categoryPriority: ['restaurant', 'bar', 'night_club'],
    minRating: 4.0,
  },
  {
    id: 'chill',
    label: '軽く',
    emoji: '😴',
    description: 'まったりしたい',
    categoryPriority: ['cafe', 'park', 'museum'],
    minRating: 3.5,
  },
  {
    id: 'date',
    label: 'デート',
    emoji: '💕',
    description: '大事な人と',
    categoryPriority: ['restaurant', 'cafe', 'tourist_attraction'],
    minRating: 4.2,
  },
  {
    id: 'solo',
    label: '一人',
    emoji: '🎧',
    description: '自分の世界に浸りたい',
    categoryPriority: ['cafe', 'museum', 'park', 'movie_theater'],
    minRating: 3.8,
  },
];

interface MoodSelectorProps {
  selectedMood: string | null;
  onMoodSelect: (mood: Mood) => void;
}

export default function MoodSelector({ selectedMood, onMoodSelect }: MoodSelectorProps) {
  return (
    <div className="bg-white rounded-lg shadow p-4 mb-4">
      <h3 className="text-sm font-bold text-gray-500 mb-3">今の気分は？</h3>
      <div className="grid grid-cols-2 gap-2">
        {MOODS.map((mood) => (
          <button
            key={mood.id}
            onClick={() => onMoodSelect(mood)}
            className={`flex flex-col items-center py-3 px-2 rounded-xl font-semibold text-sm transition-all ${
              selectedMood === mood.id
                ? 'bg-blue-500 text-white shadow-md scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <span className="text-2xl mb-1">{mood.emoji}</span>
            <span className="font-bold">{mood.label}</span>
            <span className={`text-xs mt-0.5 ${selectedMood === mood.id ? 'text-blue-100' : 'text-gray-400'}`}>
              {mood.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
