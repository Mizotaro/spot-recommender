import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import TinderLikeCard from '../components/TinderLikeCard';
import ExpandableSwipeCard from '../components/ExpandableSwipeCard';

interface Reason {
  userPreference: string;
  spotQuality: string;
  timeRelevance: string;
}

interface DiscoveryScreenProps {
  recommendations: any[];
  userLocation: { lat: number; lng: number };
  userLikes?: any[];
  onRefresh: () => void;
}

function generateRecommendationReason(
  place: any,
  userLikes: any[],
  hour: number,
): Reason {
  // 1. ユーザーの好み
  const categoryLikes = userLikes.filter((l) => l.category === place.types?.[0]);
  const userPreference =
    categoryLikes.length > 2
      ? `あなたは同ジャンルを${categoryLikes.length}回いいね`
      : '新しいジャンルに挑戦！';

  // 2. スポット品質
  const rating = place.rating ?? 0;
  const reviewCount = place.user_ratings_total ?? 0;
  const spotQuality =
    rating >= 4.5
      ? `高評価 ⭐${rating.toFixed(1)} (${reviewCount}件)`
      : `評価 ⭐${rating.toFixed(1)}`;

  // 3. 時間帯関連性
  let timeRelevance = '営業中 ✅';
  if (hour >= 11 && hour < 17 && place.types?.includes('restaurant')) {
    timeRelevance = '今この時間、お手頃です';
  } else if (hour >= 17 && place.types?.includes('bar')) {
    timeRelevance = '夜のお供に最適';
  } else if (hour >= 6 && hour < 12 && place.types?.includes('cafe')) {
    timeRelevance = '朝のカフェに最適';
  }

  return { userPreference, spotQuality, timeRelevance };
}

export default function DiscoveryScreen({
  recommendations,
  userLocation,
  userLikes = [],
  onRefresh,
}: DiscoveryScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentPlace = recommendations[currentIndex];

  const goNext = () => {
    if (currentIndex >= recommendations.length - 1) {
      onRefresh();
      setCurrentIndex(0);
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  };

  const handleSwipeRight = async () => {
    const place = recommendations[currentIndex];
    const user = auth.currentUser;
    if (user && place) {
      await addDoc(collection(db, 'userLikes'), {
        userId: user.uid,
        placeId: place.place_id,
        placeName: place.name,
        category: place.types?.[0] ?? 'spot',
        rating: place.rating ?? 0,
        swipeDirection: 'right',
        location: {
          latitude: typeof place.geometry.location.lat === 'function'
            ? place.geometry.location.lat()
            : place.geometry.location.lat,
          longitude: typeof place.geometry.location.lng === 'function'
            ? place.geometry.location.lng()
            : place.geometry.location.lng,
        },
        timestamp: Timestamp.now(),
      });
    }
    goNext();
  };

  const handleSwipeLeft = async () => {
    const place = recommendations[currentIndex];
    const user = auth.currentUser;
    if (user && place) {
      await addDoc(collection(db, 'badFeedback'), {
        userId: user.uid,
        placeId: place.place_id,
        placeName: place.name,
        category: place.types?.[0] ?? 'spot',
        swipeDirection: 'left',
        timestamp: Timestamp.now(),
      });
    }
    goNext();
  };

  if (!currentPlace) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyText}>📍</Text>
        <Text style={s.emptyLabel}>スポットを読み込み中...</Text>
        <ActivityIndicator color="#4285F4" />
      </View>
    );
  }

  const reason = generateRecommendationReason(
    currentPlace,
    userLikes,
    new Date().getHours(),
  );

  return (
    <View style={s.container}>
      <TinderLikeCard
        key={currentPlace.place_id}
        place={currentPlace}
        reason={reason}
        onLike={handleSwipeRight}
        onDislike={handleSwipeLeft}
        cardIndex={currentIndex}
        totalCards={recommendations.length}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 48 },
  emptyLabel: { fontSize: 16, color: '#666' },
});
