import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

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
    description: 'エネルギッシュに',
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
    description: '自分の世界に',
    categoryPriority: ['cafe', 'museum', 'park', 'movie_theater'],
    minRating: 3.8,
  },
];

interface Props {
  selectedMood: string | null;
  onMoodSelect: (mood: Mood) => void;
}

export default function MoodSelector({ selectedMood, onMoodSelect }: Props) {
  return (
    <View style={s.container}>
      <Text style={s.title}>今の気分は？</Text>
      <View style={s.grid}>
        {MOODS.map((mood) => (
          <TouchableOpacity
            key={mood.id}
            style={[s.btn, selectedMood === mood.id && s.btnActive]}
            onPress={() => onMoodSelect(mood)}
          >
            <Text style={s.emoji}>{mood.emoji}</Text>
            <Text style={[s.label, selectedMood === mood.id && s.labelActive]}>
              {mood.label}
            </Text>
            <Text style={[s.desc, selectedMood === mood.id && s.descActive]}>
              {mood.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6b7280',
    marginBottom: 6,
  },
  grid: {
    flexDirection: 'row',
    gap: 6,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
  },
  btnActive: {
    backgroundColor: '#3b82f6',
  },
  emoji: { fontSize: 18, marginBottom: 2 },
  label: { fontSize: 11, fontWeight: '700', color: '#374151' },
  labelActive: { color: '#fff' },
  desc: { fontSize: 9, color: '#9ca3af', marginTop: 1, textAlign: 'center' },
  descActive: { color: '#bfdbfe' },
});
