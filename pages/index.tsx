'use client';

import React, { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged, signInWithRedirect, getRedirectResult, GoogleAuthProvider } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import MapComponent from '@/components/MapComponent';
import LikesList from '@/components/LikesList';
import RecommendationsList from '@/components/RecommendationsList';
import CategoryFilter from '@/components/CategoryFilter';
import LikeDialog from '@/components/LikeDialog';
import MoodSelector, { Mood } from '@/components/MoodSelector';
import OneClickProposal from '@/components/OneClickProposal';
import { haversineMeters } from '@/lib/distance';
import axios from 'axios';

interface Place {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  photos?: any[];
  opening_hours?: { open_now?: boolean };
  geometry: {
    location: {
      lat: number | (() => number);
      lng: number | (() => number);
    };
  };
  types?: string[];
  distanceM?: number;
}

interface UserLike {
  placeId: string;
  placeName: string;
  category: string;
  rating: number;
  memo?: string;
  status?: string;
  location: {
    latitude: number;
    longitude: number;
  };
}

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [userLikes, setUserLikes] = useState<UserLike[]>([]);
  const [recommendations, setRecommendations] = useState<Place[]>([]);
  const [userLocation, setUserLocation] = useState({ lat: 35.6762, lng: 139.6503 });
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('restaurant');
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [pendingLike, setPendingLike] = useState<Place | null>(null);
  const [searchRadius, setSearchRadius] = useState(3000);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [oneClickProposal, setOneClickProposal] = useState<any>(null);
  const [proposalReason, setProposalReason] = useState('');

  const selectPlaceCallbackRef = useRef<((place: Place) => void) | null>(null);
  const closeInfoWindowRef = useRef<(() => void) | null>(null);

  // ログイン
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
  };

  // いいね履歴取得
  const fetchUserLikes = async (userId: string) => {
    try {
      const q = query(collection(db, 'userLikes'), where('userId', '==', userId));
      const snap = await getDocs(q);
      const likes: UserLike[] = snap.docs.map((doc) => ({
        placeId: doc.data().placeId,
        placeName: doc.data().placeName,
        category: doc.data().category,
        rating: doc.data().rating,
        memo: doc.data().memo ?? '',
        status: doc.data().status ?? '',
        location: doc.data().location,
      }));
      setUserLikes(likes);
      generateRecommendations(userLocation, likes, selectedCategory);
    } catch (error) {
      console.error('いいね取得エラー:', error);
    }
  };

  // いいねボタン → ダイアログを開く
  const handleLikePlace = (place: Place) => {
    setPendingLike(place);
  };

  // ダイアログ確定 → Firestore に保存
  const handleConfirmLike = async (memo: string, status: string) => {
    if (!pendingLike || !user) return;
    try {
      setLoading(true);
      const loc = pendingLike.geometry.location;
      await addDoc(collection(db, 'userLikes'), {
        userId: user.uid,
        placeId: pendingLike.place_id,
        placeName: pendingLike.name,
        category: selectedCategory,
        rating: pendingLike.rating ?? 0,
        memo,
        status,
        location: {
          latitude: typeof loc.lat === 'function' ? loc.lat() : loc.lat,
          longitude: typeof loc.lng === 'function' ? loc.lng() : loc.lng,
        },
        timestamp: Timestamp.now(),
      });
      closeInfoWindowRef.current?.();
      await fetchUserLikes(user.uid);
    } catch (error) {
      console.error('いいね登録エラー:', error);
      alert('いいね登録に失敗しました');
    } finally {
      setLoading(false);
      setPendingLike(null);
    }
  };

  // 推薦生成（半径を自動拡大）
  // openNow は通常 openNowOnly を使用するが、toggleと同時呼び出し時は明示的に渡す
  const generateRecommendations = async (
    location: { lat: number; lng: number },
    likes: UserLike[],
    category: string,
    mood?: string,
    explicitOpenNow?: boolean,
  ) => {
    try {
      setLoading(true);
      const openNow = explicitOpenNow !== undefined ? explicitOpenNow : openNowOnly;
      const radii = [3000, 5000, 10000];
      let scored: Place[] = [];
      let usedRadius = 3000;

      for (const radius of radii) {
        const response = await axios.get('/api/search-places', {
          params: { category, lat: location.lat, lng: location.lng, radius },
        });
        const places: Place[] = response.data ?? [];
        const likedIds = new Set(likes.map((l) => l.placeId));

        const filtered = places
          .filter((p) => !likedIds.has(p.place_id))
          .filter((p) => !openNow || p.opening_hours?.open_now === true);

        if (filtered.length > 0) {
          usedRadius = radius;
          const withDistance = filtered.map((p) => {
            const lat = typeof p.geometry.location.lat === 'function'
              ? p.geometry.location.lat()
              : p.geometry.location.lat;
            const lng = typeof p.geometry.location.lng === 'function'
              ? p.geometry.location.lng()
              : p.geometry.location.lng;
            return { ...p, distanceM: haversineMeters(location.lat, location.lng, lat, lng) };
          });
          scored = withDistance
            .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
            .slice(0, 5);
          break;
        }
      }

      setSearchRadius(usedRadius);
      setRecommendations(scored);
    } catch (error) {
      console.error('推薦生成エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  // 推薦理由を生成
  const generateReason = (place: any, likes: UserLike[], mood: string | null): string => {
    const reasons: string[] = [];
    const categoryLikes = likes.filter((l) => l.category === place.types?.[0]);
    if (categoryLikes.length > 2) {
      reasons.push(`あなたは同カテゴリを${categoryLikes.length}回いいね済み`);
    }
    if (mood === 'date') reasons.push('デートにぴったりな雰囲気');
    if (mood === 'chill') reasons.push('まったりできるスポット');
    if (mood === 'energetic') reasons.push('活気があって盛り上がれる');
    if (mood === 'solo') reasons.push('一人でも楽しめる');
    if ((place.rating ?? 0) >= 4.5) {
      reasons.push(`高評価 ⭐${place.rating} (${place.user_ratings_total}件)`);
    } else if ((place.rating ?? 0) >= 4.0) {
      reasons.push(`評価 ⭐${place.rating}`);
    }
    return reasons.slice(0, 3).join('\n') || '周辺の人気スポット';
  };

  // 気分ボタン選択
  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood.id);
    const moodCategory = mood.categoryPriority[0];
    setSelectedCategory(moodCategory);
    generateRecommendations(userLocation, userLikes, moodCategory, mood.id);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    generateRecommendations(userLocation, userLikes, category);
  };

  const handleOpenNowChange = (v: boolean) => {
    setOpenNowOnly(v);
    generateRecommendations(userLocation, userLikes, selectedCategory, undefined, v);
  };

  // 位置情報取得
  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => console.warn('位置情報取得失敗:', err),
    );
  }, []);

  // リダイレクト後のログイン結果を取得
  useEffect(() => {
    getRedirectResult(auth).then((result) => {
      if (result?.user) {
        setUser(result.user);
        fetchUserLikes(result.user.uid);
      }
    }).catch((error) => {
      console.error('リダイレクトログインエラー:', error);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ログイン状態チェック
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setUser(u);
        fetchUserLikes(u.uid);
      }
    });
    return () => unsub();
  }, []);

  // 推薦更新時にワンタップ提案をセット
  useEffect(() => {
    if (recommendations.length > 0) {
      setOneClickProposal(recommendations[0]);
      setProposalReason(generateReason(recommendations[0], userLikes, selectedMood));
    }
  }, [recommendations]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">🗺️</h1>
          <h2 className="text-3xl font-bold mb-2">スポット推薦アプリ</h2>
          <p className="text-gray-600 mb-8">
            あなたの好みを学習して、<br />新しいスポットを発見しよう
          </p>
          <button
            onClick={handleLogin}
            className="px-8 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold shadow-lg transition"
          >
            🔐 Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* ヘッダー */}
      <div className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">🗺️ スポット推薦</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <button
            onClick={() => auth.signOut()}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
          >
            ログアウト
          </button>
        </div>
      </div>

      {/* メイン */}
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
        {/* 地図 */}
        <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
          <MapComponent
            userLocation={userLocation}
            userLikes={userLikes}
            recommendations={recommendations}
            onLikePlace={handleLikePlace}
            selectPlaceCallbackRef={selectPlaceCallbackRef}
            closeInfoWindowRef={closeInfoWindowRef}
          />
        </div>

        {/* サイドバー */}
        <div className="w-80 flex flex-col gap-4 overflow-auto">
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
              onViewDetail={() => selectPlaceCallbackRef.current?.(oneClickProposal)}
            />
          )}
          <MoodSelector
            selectedMood={selectedMood}
            onMoodSelect={handleMoodSelect}
          />
          <CategoryFilter
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            openNowOnly={openNowOnly}
            onOpenNowChange={handleOpenNowChange}
          />
          <LikesList likes={userLikes} />
          <p className="text-xs text-gray-500 -mt-2">
            🌐 {searchRadius / 1000}km の範囲で検索中
          </p>
          <RecommendationsList
            recommendations={recommendations}
            onLikePlace={handleLikePlace}
            onSelectPlace={(place) => selectPlaceCallbackRef.current?.(place)}
          />
          <button
            onClick={() => generateRecommendations(userLocation, userLikes, selectedCategory)}
            disabled={loading}
            className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
          >
            {loading ? '読み込み中...' : '🔄 推薦を更新'}
          </button>
        </div>
      </div>

      {/* いいねダイアログ */}
      {pendingLike && (
        <LikeDialog
          placeName={pendingLike.name}
          onConfirm={handleConfirmLike}
          onCancel={() => setPendingLike(null)}
        />
      )}
    </div>
  );
}
