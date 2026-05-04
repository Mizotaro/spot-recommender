# Claude Code 実装指示書 - Phase 1
# スポット推薦アプリ - キラー機能 + バグ修正

---

## プロジェクト概要

**アプリ名：** スポット推薦アプリ
**ターゲット：** 若者（10〜40代）
**目標：** Play Store ローンチ
**コンセプト：** TikTok × Spotify × Tinder のような体験でスポットを発見

**プロジェクトパス：** C:\Users\user\spot-recommender
**技術スタック：**
- フロントエンド: Next.js (TypeScript) + Tailwind CSS（Web版）
- モバイル: Expo / React Native（C:\Users\user\spot-recommender\mobile）
- DB: Firebase Firestore
- 認証: Firebase Authentication (Google)
- 地図: Google Maps JavaScript API (@react-google-maps/api)
- API: Pages Router (/pages/api/)

---

## 現在のフォルダ構成

```
C:\Users\user\spot-recommender\
├── .env.local                      ← 環境変数（変更不可）
├── components/
│   ├── MapComponent.tsx            ← 地図コンポーネント（修正済み）
│   ├── LikesList.tsx               ← いいね一覧
│   ├── RecommendationsList.tsx     ← 推薦リスト（修正済み）
│   ├── CategoryFilter.tsx          ← カテゴリフィルター（8種類）
│   └── DetailedPlaceCard.tsx       ← スポット詳細カード
├── lib/
│   └── firebase.ts                 ← Firebase 設定
├── pages/
│   ├── api/
│   │   └── search-places.ts        ← Google Maps API 呼び出し
│   └── index.tsx                   ← メインページ
├── mobile/                         ← Expo アプリ（Expo Go でテスト済み）
│   ├── App.tsx                     ← Expo メイン（全機能実装済み）
│   └── ...
└── package.json
```

---

## 実装済み機能（変更禁止）

以下は既に動作しているため、壊さないこと：

1. Google ログイン（Firebase Authentication）
2. 地図表示（Google Maps）
3. 現在地マーカー（青丸）
4. いいね済みスポットマーカー（青ピン）
5. 推薦スポットマーカー（赤ピン）
6. マーカークリックで詳細カード表示（写真、営業時間、レビュー、価格、住所）
7. カテゴリフィルター（8種類：レストラン/カフェ/美術館/公園/観光地/バー/ショップ/映画館）
8. いいねメモ機能
9. 訪問ステータス（訪問済み/行きたい/気になる）
10. 距離表示
11. 営業時間フィルター
12. Expo Go でスマホテスト動作確認済み

---

## 環境変数（.env.local）

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDrktr_jQnSRjEwI0gVNXJ9VHRdGWFgJXY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=spot-recommender-50536.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=spot-recommender-50536
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=spot-recommender-50536.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=677494767981
NEXT_PUBLIC_FIREBASE_APP_ID=1:677494767981:web:5de39646917b2ec508da64
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyD3285pP-B8ye_z_-oZf3PYwID1fq34-PQ
GOOGLE_MAPS_API_KEY=AIzaSyD3285pP-B8ye_z_-oZf3PYwID1fq34-PQ
```

---

## 実装タスク（優先順位順）

---

### タスク0：バグ修正（15分）

**問題：**
すべてのスポットをいいねすると推薦リストが空になる。

**原因：**
```typescript
// pages/index.tsx の generateRecommendations 関数
const filtered = places.filter(
  (place: Place) => !likedPlaceIds.includes(place.place_id)
);
// → filtered が空になる
```

**修正内容：**
`pages/index.tsx` の `generateRecommendations` 関数を以下に修正：

```typescript
const generateRecommendations = async (
  location: any,
  likes: UserLike[],
  category: string,
  mood?: string
) => {
  try {
    setLoading(true);

    const radii = [3000, 5000, 10000];
    let scored: any[] = [];
    let usedRadius = 3000;

    for (const radius of radii) {
      const response = await axios.get('/api/search-places', {
        params: {
          category: category,
          lat: location.lat,
          lng: location.lng,
          radius: radius,
        },
      });

      const places = response.data || [];
      const likedPlaceIds = likes.map((like: UserLike) => like.placeId);
      const filtered = places.filter(
        (place: Place) => !likedPlaceIds.includes(place.place_id)
      );

      if (filtered.length > 0) {
        usedRadius = radius;
        scored = filtered
          .map((place: Place) => ({ ...place, score: place.rating || 0 }))
          .sort((a: any, b: any) => b.score - a.score)
          .slice(0, 5);
        break;
      }
    }

    setSearchRadius(usedRadius); // 検索範囲を表示
    setRecommendations(scored);

  } catch (error) {
    console.error('推薦生成エラー:', error);
  } finally {
    setLoading(false);
  }
};
```

`pages/index.tsx` に `searchRadius` の state を追加：
```typescript
const [searchRadius, setSearchRadius] = useState(3000);
```

推薦リストの上部に検索範囲を表示：
```tsx
<p className="text-xs text-gray-500 mb-2">
  🌐 {searchRadius / 1000}km の範囲で検索中
</p>
```

`pages/api/search-places.ts` に radius パラメータを追加：
```typescript
const { category, lat, lng, radius } = req.query;
// ...
radius: Number(radius) || 3000,
```

---

### タスク1：「今の気分」ボタン（30分）

**目的：** 4択気分ボタンで推薦が瞬時に変わる。Spotify ムード推薦のスポット版。

**作成ファイル：** `components/MoodSelector.tsx`

```typescript
'use client';

import React from 'react';

export interface Mood {
  id: string;
  label: string;
  emoji: string;
  description: string;
  categoryPriority: string[]; // Google Maps カテゴリの優先順
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

export default function MoodSelector({
  selectedMood,
  onMoodSelect,
}: MoodSelectorProps) {
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
```

**pages/index.tsx に統合：**

```typescript
// import 追加
import MoodSelector, { MOODS, Mood } from '@/components/MoodSelector';

// state 追加
const [selectedMood, setSelectedMood] = useState<string | null>(null);

// ハンドラー追加
const handleMoodSelect = (mood: Mood) => {
  setSelectedMood(mood.id);
  const moodCategory = mood.categoryPriority[0];
  setSelectedCategory(moodCategory);
  generateRecommendations(userLocation, userLikes, moodCategory, mood.id);
};
```

**サイドバーに MoodSelector を追加（CategoryFilter の上に配置）：**
```tsx
<MoodSelector
  selectedMood={selectedMood}
  onMoodSelect={handleMoodSelect}
/>
<CategoryFilter
  selectedCategory={selectedCategory}
  onCategoryChange={handleCategoryChange}
/>
```

---

### タスク2：ワンタップ提案（45分）

**目的：** アプリを開いた瞬間に「今すぐ行けるスポット」を大型カードで1枚表示。

**作成ファイル：** `components/OneClickProposal.tsx`

```typescript
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
```

**pages/index.tsx に統合：**

```typescript
// import 追加
import OneClickProposal from '@/components/OneClickProposal';

// state 追加
const [oneClickProposal, setOneClickProposal] = useState<any>(null);
const [proposalReason, setProposalReason] = useState('');

// 理由自動生成ロジック
const generateReason = (place: any, likes: UserLike[], mood: string | null): string => {
  const reasons = [];

  // 1. ユーザーの好みからの理由
  const categoryLikes = likes.filter(l => l.category === place.types?.[0]);
  if (categoryLikes.length > 2) {
    reasons.push(`あなたは同カテゴリを${categoryLikes.length}回いいね済み`);
  }

  // 2. 気分からの理由
  if (mood === 'date') reasons.push('デートにぴったりな雰囲気');
  if (mood === 'chill') reasons.push('まったりできるスポット');
  if (mood === 'energetic') reasons.push('活気があって盛り上がれる');
  if (mood === 'solo') reasons.push('一人でも楽しめる');

  // 3. スポットの品質
  if (place.rating >= 4.5) reasons.push(`高評価 ⭐${place.rating} (${place.user_ratings_total}件)`);
  else if (place.rating >= 4.0) reasons.push(`評価 ⭐${place.rating}`);

  return reasons.slice(0, 3).join('\n') || '周辺の人気スポット';
};

// 推薦が更新されたら自動でワンタップ提案を設定
useEffect(() => {
  if (recommendations.length > 0) {
    setOneClickProposal(recommendations[0]);
    setProposalReason(generateReason(recommendations[0], userLikes, selectedMood));
  }
}, [recommendations]);
```

**サイドバーの先頭（MoodSelectorの上）にOneClickProposalを追加：**
```tsx
{oneClickProposal && (
  <OneClickProposal
    place={oneClickProposal}
    reason={proposalReason}
    searchRadius={searchRadius}
    onLike={() => {
      handleLikePlace(oneClickProposal);
      setOneClickProposal(recommendations[1] || null);
    }}
    onSkip={() => {
      setOneClickProposal(recommendations[1] || null);
    }}
    onViewDetail={() => setSelectedPlace(oneClickProposal)}
  />
)}
```

---

### タスク3：スワイプUI（Tinder式）（1時間）

**目的：** 右スワイプ=好き、左スワイプ=嫌い で学習速度を爆上げ。

**必要ライブラリのインストール：**
```bash
cd C:\Users\user\spot-recommender\mobile
npx expo install react-native-gesture-handler react-native-reanimated
```

**作成ファイル：** `mobile/components/SwipeCard.tsx`

```typescript
import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
} from 'react-native';
import { TouchableOpacity } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface SwipeCardProps {
  place: any;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export default function SwipeCard({ place, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const position = useRef(new Animated.ValueXY()).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });

      // 右に動かすと ❤️ を表示
      if (gesture.dx > 0) {
        likeOpacity.setValue(gesture.dx / SWIPE_THRESHOLD);
        nopeOpacity.setValue(0);
      } else {
        nopeOpacity.setValue(-gesture.dx / SWIPE_THRESHOLD);
        likeOpacity.setValue(0);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > SWIPE_THRESHOLD) {
        // 右スワイプ：好き
        Animated.spring(position, {
          toValue: { x: SCREEN_WIDTH + 100, y: gesture.dy },
          useNativeDriver: false,
        }).start(() => {
          onSwipeRight();
          position.setValue({ x: 0, y: 0 });
          likeOpacity.setValue(0);
        });
      } else if (gesture.dx < -SWIPE_THRESHOLD) {
        // 左スワイプ：嫌い
        Animated.spring(position, {
          toValue: { x: -SCREEN_WIDTH - 100, y: gesture.dy },
          useNativeDriver: false,
        }).start(() => {
          onSwipeLeft();
          position.setValue({ x: 0, y: 0 });
          nopeOpacity.setValue(0);
        });
      } else {
        // 元に戻す
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
        likeOpacity.setValue(0);
        nopeOpacity.setValue(0);
      }
    },
  });

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const cardStyle = {
    ...position.getLayout(),
    transform: [{ rotate }],
  };

  return (
    <Animated.View style={[styles.card, cardStyle]} {...panResponder.panHandlers}>
      {/* LIKE スタンプ */}
      <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}>
        <Text style={styles.likeText}>❤️ LIKE</Text>
      </Animated.View>

      {/* NOPE スタンプ */}
      <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}>
        <Text style={styles.nopeText}>👎 NOPE</Text>
      </Animated.View>

      {/* 写真 */}
      {place.photos?.[0] ? (
        <Image
          source={{ uri: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}` }}
          style={styles.image}
        />
      ) : (
        <View style={[styles.image, styles.noImage]}>
          <Text style={styles.noImageText}>📍</Text>
        </View>
      )}

      {/* 情報 */}
      <View style={styles.info}>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.rating}>⭐ {place.rating?.toFixed(1) || 'N/A'}</Text>
        {place.formatted_address && (
          <Text style={styles.address} numberOfLines={1}>📍 {place.formatted_address}</Text>
        )}
      </View>

      {/* ボタン */}
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.nopeButton} onPress={onSwipeLeft}>
          <Text style={styles.nopeButtonText}>👎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeButton} onPress={onSwipeRight}>
          <Text style={styles.likeButtonText}>❤️</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 32,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    position: 'absolute',
    left: 16,
  },
  stamp: {
    position: 'absolute',
    top: 40,
    zIndex: 10,
    padding: 10,
    borderWidth: 4,
    borderRadius: 8,
  },
  likeStamp: {
    left: 20,
    borderColor: '#4CAF50',
    transform: [{ rotate: '-15deg' }],
  },
  nopeStamp: {
    right: 20,
    borderColor: '#f44336',
    transform: [{ rotate: '15deg' }],
  },
  likeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  nopeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f44336',
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  noImage: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: {
    fontSize: 60,
  },
  info: {
    padding: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  rating: {
    fontSize: 16,
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: '#888',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    paddingTop: 8,
  },
  nopeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nopeButtonText: {
    fontSize: 28,
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButtonText: {
    fontSize: 28,
  },
});
```

**作成ファイル：** `mobile/screens/DiscoveryScreen.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import SwipeCard from '../components/SwipeCard';
import { addDoc, collection, Timestamp } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

interface DiscoveryScreenProps {
  recommendations: any[];
  userLocation: { lat: number; lng: number };
  onRefresh: () => void;
}

export default function DiscoveryScreen({
  recommendations,
  userLocation,
  onRefresh,
}: DiscoveryScreenProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentPlace = recommendations[currentIndex];

  const handleSwipeRight = async () => {
    // いいね登録
    const place = recommendations[currentIndex];
    const user = auth.currentUser;
    if (user && place) {
      await addDoc(collection(db, 'userLikes'), {
        userId: user.uid,
        placeId: place.place_id,
        placeName: place.name,
        category: place.types?.[0] || 'spot',
        rating: place.rating || 0,
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
    // 嫌い登録
    const place = recommendations[currentIndex];
    const user = auth.currentUser;
    if (user && place) {
      await addDoc(collection(db, 'badFeedback'), {
        userId: user.uid,
        placeId: place.place_id,
        placeName: place.name,
        category: place.types?.[0] || 'spot',
        swipeDirection: 'left',
        timestamp: Timestamp.now(),
      });
    }
    goNext();
  };

  const goNext = () => {
    if (currentIndex >= recommendations.length - 1) {
      onRefresh(); // 全部スワイプしたら新しいセット取得
      setCurrentIndex(0);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (!currentPlace) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>📍</Text>
        <Text style={styles.emptyLabel}>スポットを読み込み中...</Text>
        <ActivityIndicator color="#4285F4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>🔍 スポットを発見</Text>
      <Text style={styles.subHeader}>
        {currentIndex + 1} / {recommendations.length}
      </Text>

      <View style={styles.cardContainer}>
        <SwipeCard
          key={currentPlace.place_id}
          place={currentPlace}
          onSwipeLeft={handleSwipeLeft}
          onSwipeRight={handleSwipeRight}
        />
      </View>

      <Text style={styles.hint}>← スワイプ で嫌い   好き で スワイプ →</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', paddingTop: 20, paddingBottom: 4 },
  subHeader: { fontSize: 13, color: '#999', textAlign: 'center', marginBottom: 16 },
  cardContainer: { flex: 1, alignItems: 'center', position: 'relative' },
  hint: { textAlign: 'center', color: '#bbb', fontSize: 13, paddingBottom: 24 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  emptyText: { fontSize: 48 },
  emptyLabel: { fontSize: 16, color: '#666' },
});
```

**mobile/App.tsx にタブナビゲーションを追加：**

```typescript
// 既存のタブに "発見" タブを追加
// <Tab.Screen name="発見" component={DiscoveryScreen} />
// DiscoveryScreen に recommendations と onRefresh を props で渡す
```

---

## テスト手順

実装後、以下の手順でテストを実行してください：

### Web版テスト（localhost:3000）

1. `npm run dev` でサーバー起動
2. ブラウザで http://localhost:3000 を開く
3. Google ログイン
4. 気分ボタンを4つすべてクリックして、推薦が変わることを確認
5. すべてのスポットをいいね後、「推薦を更新」をクリックして範囲拡大を確認
6. ワンタップ提案の「行く！」「スキップ」「詳細」を確認

### スマホテスト（Expo Go）

1. mobile フォルダで `npx expo start` を実行
2. QR コードをスマホで読み込む
3. 「発見」タブをクリック
4. スワイプ操作が反応良好か確認
5. 右スワイプで ❤️ LIKE が表示されるか確認
6. 左スワイプで 👎 NOPE が表示されるか確認

---

## チェックリスト

### バグ修正
- [ ] すべていいね後、3km → 5km に自動拡大
- [ ] UI に「5km の範囲で検索中」と表示
- [ ] radius パラメータが API に正しく渡される

### 気分ボタン
- [ ] 4つの気分ボタンが表示される
- [ ] がっつり → レストラン/バー優先
- [ ] 軽く → カフェ/公園優先
- [ ] デート → レストラン/観光地優先
- [ ] 一人 → カフェ/美術館優先

### ワンタップ提案
- [ ] 推薦更新後、先頭スポットが大型カードで表示
- [ ] 理由テキストが日本語で表示
- [ ] 「行く！」でいいね登録される
- [ ] 「スキップ」で次のスポットに切り替わる

### スワイプUI
- [ ] スワイプカードが表示される
- [ ] 右スワイプで ❤️ アニメーション
- [ ] 左スワイプで 👎 アニメーション
- [ ] Firebase に userLikes / badFeedback が保存される
- [ ] 全カードスワイプ後に新セットを取得

---

## 注意事項

1. **既存機能を壊さないこと**（MapComponent、LikesList、RecommendationsList）
2. **TypeScript エラーが出る場合は型を `any` で一時回避 OK**
3. **Expo Go で確認する前に `npx expo start --clear` を実行**
4. **エラーが出たらターミナルのログを確認してから修正**
5. **すべてのタスク完了後、GitHub に push すること**

```bash
git add .
git commit -m "Phase 1: Mood selector, one-click proposal, swipe UI, bug fix"
git push origin main
```