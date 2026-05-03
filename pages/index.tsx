'use client';

import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
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
import axios from 'axios';

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
  types?: string[];
}

interface UserLike {
  placeId: string;
  placeName: string;
  category: string;
  rating: number;
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

  // ログイン処理
  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      setUser(result.user);
      fetchUserLikes(result.user.uid);
    } catch (error) {
      console.error('ログインエラー:', error);
      alert('ログインに失敗しました');
    }
  };

  // ユーザーのいいね履歴を取得
  const fetchUserLikes = async (userId: string) => {
    try {
      const q = query(collection(db, 'userLikes'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      const likes: UserLike[] = querySnapshot.docs.map((doc) => ({
        placeId: doc.data().placeId,
        placeName: doc.data().placeName,
        category: doc.data().category,
        rating: doc.data().rating,
        location: doc.data().location,
      }));
      setUserLikes(likes);
      if (likes.length > 0) {
        generateRecommendations(userLocation, likes);
      }
    } catch (error) {
      console.error('いいね取得エラー:', error);
    }
  };

  // ユーザーがいいねをクリック
  const handleLikePlace = async (place: Place) => {
    if (!user) return;

    try {
      setLoading(true);
      const location = place.geometry.location;

    await addDoc(collection(db, 'userLikes'), {
  userId: user.uid,
  placeId: place.place_id,
  placeName: place.name,
  category: place.types?.[0] || 'その他',
  rating: place.rating || 0,
  location: {
    latitude: typeof location.lat === 'function' ? location.lat() : location.lat,
    longitude: typeof location.lng === 'function' ? location.lng() : location.lng,
  },
  timestamp: Timestamp.now(),
});

      await fetchUserLikes(user.uid);
    } catch (error) {
      console.error('いいね登録エラー:', error);
      alert('いいね登録に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  // 推薦を生成
  const generateRecommendations = async (location: any, likes: UserLike[]) => {
  try {
    setLoading(true);

    // いいねしたカテゴリを抽出
    const categories = likes.map((like) => like.category).filter(Boolean);
    const topCategory = categories[0] || 'restaurant';

    console.log('🔍 検索開始:', { location, topCategory });

    // Google Maps APIで近くの店を検索
    const response = await axios.get('/api/search-places', {
      params: {
        category: topCategory,
        lat: location.lat,
        lng: location.lng,
      },
    });

    const places = response.data || [];
    console.log('✅ 取得した店舗数:', places.length);
    console.log('📍 店舗データ:', places);

    // いいね済みの店を除外
    const likedPlaceIds = likes.map((like) => like.placeId);
    const filtered = places.filter(
      (place: Place) => !likedPlaceIds.includes(place.place_id)
    );

    console.log('🎯 フィルター後の店舗数:', filtered.length);

    // スコア計算（評価が高い順）
    const scored = filtered
      .map((place: Place) => ({
        ...place,
        score: place.rating || 0,
      }))
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 5);

    console.log('⭐ 推薦店舗:', scored);

    setRecommendations(scored);
  } catch (error) {
    console.error('推薦生成エラー:', error);
  } finally {
    setLoading(false);
  }
};

  // 位置情報取得（ブラウザのGeolocation API）
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(location);
        },
        (error) => {
          console.warn('位置情報取得失敗:', error);
        }
      );
    }
  }, []);

  // 初期化（ログイン状態をチェック）
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        fetchUserLikes(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  if (!user) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-blue-100">
        <div className="text-center">
          <h1 className="text-5xl font-bold mb-4">🗺️</h1>
          <h2 className="text-3xl font-bold mb-2">スポット推薦アプリ</h2>
          <p className="text-gray-600 mb-8">
            あなたの好みを学習して、<br />
            新しいお店を発見しよう
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

      {/* メインコンテンツ */}
      <div className="flex flex-1 gap-4 p-4 overflow-hidden">
       {/* 地図（左側） */}
<div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
  <MapComponent
    userLocation={userLocation}
    userLikes={userLikes}
    recommendations={recommendations}
    onLikePlace={handleLikePlace}
  />
</div>

        {/* サイドバー（右側） */}
        <div className="w-80 flex flex-col gap-4 overflow-auto">
          <LikesList likes={userLikes} />
          <RecommendationsList
            recommendations={recommendations}
            onLikePlace={handleLikePlace}
          />
          <button
            onClick={() => generateRecommendations(userLocation, userLikes)}
            disabled={loading}
            className="w-full px-4 py-3 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg font-semibold transition"
          >
            {loading ? '読み込み中...' : '🔄 推薦を更新'}
          </button>
        </div>
      </div>
    </div>
  );
}