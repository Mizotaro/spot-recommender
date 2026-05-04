import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView,
  ActivityIndicator, Alert, RefreshControl, Image, SafeAreaView, Platform,
} from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import {
  collection, addDoc, query, where, getDocs, Timestamp,
} from 'firebase/firestore';

import { auth, db } from '../lib/firebase';
import {
  searchNearby, fetchDetails, photoUrl, PlaceResult, PlaceDetails,
} from '../lib/places';
import { haversineMeters, formatDistance } from '../utils/distance';
import LikeDialog from '../components/LikeDialog';
import SpotDetailModal from '../components/SpotDetailModal';
import DiscoveryScreen from './DiscoveryScreen';
import MoodSelector, { Mood } from '../components/MoodSelector';

// react-native-maps は Expo Go 非対応のため条件ロード
const isExpoGo =
  Constants.executionEnvironment === 'storeClient' ||
  (Constants as any).appOwnership === 'expo';
let MapView: any = null;
let Marker: any = null;
if (!isExpoGo) {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
  } catch {}
}
const MAPS_AVAILABLE = !!MapView && !isExpoGo;

// ── 定数 ────────────────────────────────
const CATEGORIES = [
  { value: 'restaurant',        label: '🍽️ 飯' },
  { value: 'cafe',              label: '☕ カフェ' },
  { value: 'bar',               label: '🍺 バー' },
  { value: 'museum',            label: '🏛️ 美術館' },
  { value: 'park',              label: '🌳 公園' },
  { value: 'tourist_attraction',label: '🎡 観光地' },
  { value: 'shopping_mall',     label: '🛍️ ショップ' },
  { value: 'movie_theater',     label: '🎬 映画館' },
];

const PRICE: Record<number, string> = { 1: '¥', 2: '¥¥', 3: '¥¥¥', 4: '¥¥¥¥' };
const STATUS_ICON: Record<string, string> = { visited: '✅', want_to_go: '🎯', interested: '💭' };
const TOKYO = { lat: 35.6762, lng: 139.6503 };

// ── 時間帯最適化 ─────────────────────────
function getTimeBasedCategory(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 11) return 'cafe';
  if (h >= 11 && h < 17) return 'restaurant';
  if (h >= 17 && h < 23) return 'bar';
  return 'restaurant';
}

function getTimeBasedLabel(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 11) return '☀️ 朝：カフェ時間';
  if (h >= 11 && h < 17) return '🍽️ 昼：ランチ時間';
  if (h >= 17 && h < 23) return '🌙 夜：バー時間';
  return '🌃 深夜モード';
}

// ── 80/20 バランス推薦 ────────────────────
function generateBalancedRecommendations(
  spots: any[],
  userLikes: Array<{ category: string }>,
): any[] {
  if (userLikes.length === 0) {
    return spots.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 10);
  }

  const catCount: Record<string, number> = {};
  userLikes.forEach((l) => { catCount[l.category] = (catCount[l.category] ?? 0) + 1; });

  const topCats = Object.entries(catCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([c]) => c);

  const favorites = spots.filter((s) => topCats.includes(s.types?.[0] ?? ''));
  const others    = spots.filter((s) => !topCats.includes(s.types?.[0] ?? ''));

  const favCount = Math.ceil(Math.min(favorites.length, 8));
  const newCount = Math.ceil(Math.min(others.length, 2));

  return [
    ...favorites.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, favCount),
    ...others.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, newCount),
  ];
}

// ── 型 ──────────────────────────────────
type Tab = 'spots' | 'likes' | 'discovery';
type SortBy = 'rating' | 'distance';

interface UserLike {
  placeId: string; placeName: string; category: string;
  rating: number; memo: string; status: string;
  location: { latitude: number; longitude: number };
}

interface PlaceWithDist extends PlaceResult { distanceM: number }

// ── コンポーネント ─────────────────────
export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>('spots');
  const [userLoc, setUserLoc]   = useState<{ lat: number; lng: number }>(TOKYO);
  const [recs, setRecs]         = useState<PlaceWithDist[]>([]);
  const [likes, setLikes]       = useState<UserLike[]>([]);
  const [selectedBase, setSelectedBase] = useState<PlaceWithDist | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<PlaceDetails | null>(null);
  const [showDetail, setShowDetail]   = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [pendingLike, setPendingLike] = useState<PlaceWithDist | null>(null);
  const [loading, setLoading]   = useState(false);
  const [category, setCategory] = useState('restaurant');
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [sortBy, setSortBy]     = useState<SortBy>('rating');
  const [showMap, setShowMap]   = useState(MAPS_AVAILABLE);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState(3000);

  // ── ライフサイクル ───────────────────
  useEffect(() => {
    setCategory(getTimeBasedCategory());
    initLocation();
    fetchLikes();
  }, []);
  useEffect(() => { if (userLoc !== TOKYO) findSpots(); }, [userLoc]);

  // ── 位置情報 ─────────────────────────
  const initLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('位置情報', '設定から位置情報アクセスを許可してください');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
  };

  // ── いいね取得 ───────────────────────
  const fetchLikes = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const snap = await getDocs(query(collection(db, 'userLikes'), where('userId', '==', uid)));
    setLikes(snap.docs.map((d) => ({
      placeId: d.data().placeId,  placeName: d.data().placeName,
      category: d.data().category, rating: d.data().rating ?? 0,
      memo: d.data().memo ?? '',  status: d.data().status ?? '',
      location: d.data().location,
    })));
  };

  // ── スポット検索（半径自動拡大: 3km→5km→10km）─────
  const findSpots = useCallback(async (
    loc = userLoc, cat = category, openNow = openNowOnly,
  ) => {
    setLoading(true);
    try {
      const radii = [3000, 5000, 10000];
      const likedIds = new Set(likes.map((l) => l.placeId));
      let results: PlaceWithDist[] = [];
      let usedRadius = 3000;

      for (const radius of radii) {
        const places = await searchNearby(loc.lat, loc.lng, cat, radius);
        const filtered = places
          .filter((p) => !likedIds.has(p.place_id))
          .filter((p) => !openNow || p.opening_hours?.open_now === true)
          .map((p) => ({
            ...p,
            distanceM: haversineMeters(
              loc.lat, loc.lng,
              p.geometry.location.lat, p.geometry.location.lng,
            ),
          }));

        if (filtered.length > 0) {
          usedRadius = radius;
          results = generateBalancedRecommendations(filtered, likes);
          break;
        }
      }

      setSearchRadius(usedRadius);
      setRecs(results);
    } catch {
      Alert.alert('エラー', 'スポットの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [userLoc, category, openNowOnly, likes]);

  // ── 気分選択 ─────────────────────────
  const handleMoodSelect = (mood: Mood) => {
    setSelectedMood(mood.id);
    const moodCategory = mood.categoryPriority[0];
    setCategory(moodCategory);
    findSpots(userLoc, moodCategory, openNowOnly);
  };

  // ── 詳細表示 ─────────────────────────
  const openDetail = async (place: PlaceWithDist) => {
    setSelectedBase(place);
    setSelectedDetail({ ...place } as any);
    setShowDetail(true);
    setDetailLoading(true);
    try {
      const d = await fetchDetails(place.place_id);
      if (d) setSelectedDetail({ ...d, geometry: place.geometry } as PlaceDetails);
    } catch {}
    finally { setDetailLoading(false); }
  };

  // ── いいね ───────────────────────────
  const handleLike = (place: PlaceWithDist) => {
    setShowDetail(false);
    setPendingLike(place);
  };

  const confirmLike = async (memo: string, status: string) => {
    if (!pendingLike || !auth.currentUser) return;
    try {
      await addDoc(collection(db, 'userLikes'), {
        userId: auth.currentUser.uid,
        placeId: pendingLike.place_id, placeName: pendingLike.name,
        category, rating: pendingLike.rating ?? 0,
        memo, status,
        location: {
          latitude: pendingLike.geometry.location.lat,
          longitude: pendingLike.geometry.location.lng,
        },
        timestamp: Timestamp.now(),
      });
      setPendingLike(null);
      await fetchLikes();
      findSpots();
    } catch {
      Alert.alert('エラー', 'いいね登録に失敗しました');
    }
  };

  // ── ソート ───────────────────────────
  const sorted = [...recs].sort((a, b) =>
    sortBy === 'distance' ? a.distanceM - b.distanceM : (b.rating ?? 0) - (a.rating ?? 0)
  );
  const likedIds = new Set(likes.map((l) => l.placeId));

  // ── スポットカード ───────────────────
  const SpotCard = ({ item }: { item: PlaceWithDist }) => {
    const ref = item.photos?.[0]?.photo_reference;
    return (
      <TouchableOpacity style={s.spotCard} onPress={() => openDetail(item)}>
        {ref ? (
          <Image source={{ uri: photoUrl(ref, 150) }} style={s.thumb} />
        ) : (
          <View style={[s.thumb, s.thumbEmpty]}><Text style={{ fontSize: 26 }}>🏪</Text></View>
        )}
        <View style={s.spotInfo}>
          <Text style={s.spotName} numberOfLines={2}>{item.name}</Text>
          <Text style={s.spotRating}>
            ⭐ {item.rating?.toFixed(1) ?? 'N/A'}
            {item.user_ratings_total ? `  (${item.user_ratings_total}件)` : ''}
          </Text>
          {item.price_level && <Text style={s.spotMeta}>💰 {PRICE[item.price_level]}</Text>}
          <Text style={s.spotDist}>📍 {formatDistance(item.distanceM)}</Text>
          {item.opening_hours?.open_now !== undefined && (
            <Text style={item.opening_hours.open_now ? s.openNow : s.closedNow}>
              {item.opening_hours.open_now ? '🟢 営業中' : '🔴 閉業中'}
            </Text>
          )}
        </View>
        <TouchableOpacity
          style={[s.heartBtn, likedIds.has(item.place_id) && s.heartBtnDone]}
          onPress={() => !likedIds.has(item.place_id) && handleLike(item)}
        >
          <Text>❤️</Text>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ── いいね履歴カード ─────────────────
  const LikeCard = ({ item }: { item: UserLike }) => (
    <View style={s.likeCard}>
      <View style={s.likeHeader}>
        <Text style={s.likeName} numberOfLines={1}>{item.placeName}</Text>
        <Text style={{ fontSize: 18 }}>{STATUS_ICON[item.status] ?? '❤️'}</Text>
      </View>
      <Text style={s.likeMeta}>⭐ {item.rating.toFixed(1)} · {item.category}</Text>
      {item.memo ? <Text style={s.likeMemo}>"{item.memo}"</Text> : null}
    </View>
  );

  // ── Map ビュー ───────────────────────
  const MapSection = () => {
    if (!MAPS_AVAILABLE || !MapView) return null;
    return (
      <MapView
        style={StyleSheet.absoluteFillObject}
        initialRegion={{
          latitude: userLoc.lat, longitude: userLoc.lng,
          latitudeDelta: 0.02, longitudeDelta: 0.02,
        }}
        showsUserLocation
      >
        {sorted.map((rec) => (
          <Marker
            key={rec.place_id}
            coordinate={{ latitude: rec.geometry.location.lat, longitude: rec.geometry.location.lng }}
            title={rec.name}
            onPress={() => openDetail(rec)}
            pinColor="#ef4444"
          />
        ))}
      </MapView>
    );
  };

  // ── ベースコントロール ────────────────
  const Controls = () => (
    <View style={s.controls}>
      {/* 時間帯バナー */}
      <View style={s.timeBanner}>
        <Text style={s.timeLabel}>{getTimeBasedLabel()}</Text>
        <Text style={s.balanceLabel}>💡 好み 80% + 新発見 20%</Text>
      </View>

      {/* 気分選択 */}
      <MoodSelector selectedMood={selectedMood} onMoodSelect={handleMoodSelect} />

      {/* カテゴリ */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[s.catBtn, category === c.value && s.catBtnActive]}
            onPress={() => { setCategory(c.value); findSpots(userLoc, c.value, openNowOnly); }}
          >
            <Text style={[s.catTxt, category === c.value && s.catTxtActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 今開いている + 探すボタン */}
      <View style={s.ctrlRow}>
        <TouchableOpacity
          style={[s.openNowBtn, openNowOnly && s.openNowBtnOn]}
          onPress={() => { const v = !openNowOnly; setOpenNowOnly(v); findSpots(userLoc, category, v); }}
        >
          <Text style={[s.openNowTxt, openNowOnly && s.openNowTxtOn]}>
            {openNowOnly ? '🟢' : '⭕'} 今開いている
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.findBtn, loading && { opacity: 0.5 }]}
          onPress={() => findSpots()} disabled={loading}
        >
          <Text style={s.findTxt}>{loading ? '検索中…' : '🔍 探す'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── メインレンダー ────────────────────
  return (
    <SafeAreaView style={s.root}>
      {/* ヘッダー */}
      <View style={s.header}>
        <Text style={s.headerTitle}>🗺️ スポット推薦</Text>
        <TouchableOpacity onPress={() => auth.signOut()}>
          <Text style={s.logoutTxt}>ログアウト</Text>
        </TouchableOpacity>
      </View>

      {/* メインエリア */}
      {tab === 'spots' && (
        <View style={{ flex: 1 }}>
          {/* マップ / リスト 切り替え（ネイティブビルド時のみ） */}
          {MAPS_AVAILABLE && (
            <View style={s.viewToggle}>
              <TouchableOpacity style={[s.toggleBtn, !showMap && s.toggleBtnActive]} onPress={() => setShowMap(false)}>
                <Text style={[s.toggleTxt, !showMap && s.toggleTxtActive]}>📋 リスト</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.toggleBtn, showMap && s.toggleBtnActive]} onPress={() => setShowMap(true)}>
                <Text style={[s.toggleTxt, showMap && s.toggleTxtActive]}>🗺️ マップ</Text>
              </TouchableOpacity>
            </View>
          )}

          {showMap && MAPS_AVAILABLE ? (
            <View style={{ flex: 1 }}>
              <MapSection />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              {/* ソートボタン */}
              <View style={s.sortRow}>
                {(['rating', 'distance'] as SortBy[]).map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[s.sortBtn, sortBy === v && s.sortBtnActive]}
                    onPress={() => setSortBy(v)}
                  >
                    <Text style={[s.sortTxt, sortBy === v && s.sortTxtActive]}>
                      {v === 'rating' ? '⭐ 評価順' : '📍 距離順'}
                    </Text>
                  </TouchableOpacity>
                ))}
                <Text style={s.recCount}>{recs.length}件</Text>
                <Text style={s.radiusTxt}>🌐 {searchRadius / 1000}km</Text>
              </View>

              {loading ? (
                <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 48 }} />
              ) : (
                <FlatList
                  data={sorted}
                  keyExtractor={(item) => item.place_id}
                  renderItem={({ item }) => <SpotCard item={item} />}
                  contentContainerStyle={s.listPad}
                  refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={() => findSpots()} />
                  }
                  ListEmptyComponent={
                    <View style={s.empty}>
                      <Text style={s.emptyIcon}>🔍</Text>
                      <Text style={s.emptyTxt}>「探す」ボタンで近くのスポットを検索</Text>
                    </View>
                  }
                />
              )}
            </View>
          )}
        </View>
      )}

      {tab === 'discovery' && (
        <DiscoveryScreen
          recommendations={recs}
          userLocation={userLoc}
          userLikes={likes}
          onRefresh={() => findSpots()}
        />
      )}

      {tab === 'likes' && (
        <FlatList
          data={likes}
          keyExtractor={(item) => item.placeId}
          renderItem={({ item }) => <LikeCard item={item} />}
          contentContainerStyle={s.listPad}
          refreshControl={<RefreshControl refreshing={false} onRefresh={fetchLikes} />}
          ListHeaderComponent={<Text style={s.sectionTitle}>❤️ いいね済み ({likes.length})</Text>}
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyIcon}>❤️</Text>
              <Text style={s.emptyTxt}>まだいいねしたスポットがありません</Text>
            </View>
          }
        />
      )}

      {/* 下部コントロール（spotsタブのみ） */}
      {tab === 'spots' && <Controls />}

      {/* タブバー */}
      <View style={s.tabBar}>
        {(
          [
            ['spots', '🔍', 'スポット'],
            ['discovery', '💫', '発見'],
            ['likes', '❤️', `いいね (${likes.length})`],
          ] as [Tab, string, string][]
        ).map(([t, icon, label]) => (
          <TouchableOpacity key={t} style={s.tabBtn} onPress={() => setTab(t)}>
            <Text style={s.tabIcon}>{icon}</Text>
            <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* モーダル群 */}
      <SpotDetailModal
        visible={showDetail}
        spot={selectedDetail}
        distanceM={selectedBase?.distanceM}
        detailLoading={detailLoading}
        isLiked={selectedDetail ? likedIds.has(selectedDetail.place_id) : false}
        onLike={() => selectedBase && handleLike(selectedBase)}
        onClose={() => setShowDetail(false)}
      />
      <LikeDialog
        visible={!!pendingLike}
        placeName={pendingLike?.name ?? ''}
        onConfirm={confirmLike}
        onCancel={() => setPendingLike(null)}
      />
    </SafeAreaView>
  );
}

// ── スタイル ─────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#f3f4f6' },

  // ヘッダー
  header: {
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  logoutTxt: { fontSize: 13, color: '#ef4444' },

  // ビュー切り替え
  viewToggle: {
    flexDirection: 'row', backgroundColor: '#fff', padding: 8,
    gap: 8, borderBottomWidth: 1, borderBottomColor: '#e5e7eb',
  },
  toggleBtn: {
    flex: 1, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#f3f4f6', alignItems: 'center',
  },
  toggleBtnActive: { backgroundColor: '#dbeafe' },
  toggleTxt: { fontSize: 13, color: '#6b7280', fontWeight: '600' },
  toggleTxtActive: { color: '#1d4ed8' },

  // ソート
  sortRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fff',
  },
  sortBtn: {
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
    backgroundColor: '#f3f4f6',
  },
  sortBtnActive: { backgroundColor: '#3b82f6' },
  sortTxt: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  sortTxtActive: { color: '#fff' },
  recCount: { marginLeft: 'auto', fontSize: 12, color: '#9ca3af' },
  radiusTxt: { fontSize: 11, color: '#3b82f6', fontWeight: '600' },

  // スポットカード
  spotCard: {
    backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 5,
    borderRadius: 12, flexDirection: 'row', overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  thumb: { width: 90, height: 90 },
  thumbEmpty: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  spotInfo: { flex: 1, padding: 10, justifyContent: 'space-between' },
  spotName: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  spotRating: { fontSize: 12, color: '#374151' },
  spotMeta: { fontSize: 11, color: '#9ca3af' },
  spotDist: { fontSize: 11, color: '#3b82f6', fontWeight: '600' },
  openNow: { fontSize: 11, color: '#16a34a', fontWeight: '600' },
  closedNow: { fontSize: 11, color: '#dc2626', fontWeight: '600' },
  heartBtn: {
    justifyContent: 'center', paddingHorizontal: 12,
    backgroundColor: '#f0fdf4',
  },
  heartBtnDone: { backgroundColor: '#f9fafb' },

  // いいね履歴カード
  likeCard: {
    backgroundColor: '#fff', marginHorizontal: 12, marginVertical: 5,
    borderRadius: 12, padding: 12, borderLeftWidth: 4, borderLeftColor: '#3b82f6',
  },
  likeHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  likeName: { fontSize: 13, fontWeight: '700', flex: 1, marginRight: 8 },
  likeMeta: { fontSize: 12, color: '#6b7280' },
  likeMemo: { fontSize: 11, color: '#9ca3af', fontStyle: 'italic', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', padding: 12 },

  // コントロール
  controls: {
    backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb',
    paddingBottom: Platform.OS === 'ios' ? 0 : 8,
  },
  timeBanner: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 5,
    backgroundColor: '#eff6ff', borderBottomWidth: 1, borderBottomColor: '#dbeafe',
  },
  timeLabel: { fontSize: 11, fontWeight: '700', color: '#1d4ed8' },
  balanceLabel: { fontSize: 10, color: '#3b82f6' },
  catScroll: { paddingHorizontal: 10, paddingVertical: 8 },
  catBtn: {
    marginRight: 6, paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, backgroundColor: '#f3f4f6',
  },
  catBtnActive: { backgroundColor: '#3b82f6' },
  catTxt: { fontSize: 12, fontWeight: '600', color: '#374151' },
  catTxtActive: { color: '#fff' },
  ctrlRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 12, paddingBottom: 8,
  },
  openNowBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#f3f4f6', alignItems: 'center',
  },
  openNowBtnOn: { backgroundColor: '#22c55e' },
  openNowTxt: { fontSize: 12, fontWeight: '600', color: '#374151' },
  openNowTxtOn: { color: '#fff' },
  findBtn: {
    flex: 1, paddingVertical: 9, borderRadius: 10,
    backgroundColor: '#3b82f6', alignItems: 'center',
  },
  findTxt: { fontSize: 13, fontWeight: '700', color: '#fff' },

  // タブバー
  tabBar: {
    flexDirection: 'row', backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#e5e7eb',
    paddingBottom: Platform.OS === 'ios' ? 20 : 6, paddingTop: 6,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  tabIcon: { fontSize: 20 },
  tabLabel: { fontSize: 11, color: '#9ca3af', marginTop: 2 },
  tabLabelActive: { color: '#3b82f6', fontWeight: '700' },

  // 空状態
  empty: { alignItems: 'center', marginTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTxt: { fontSize: 14, color: '#9ca3af', textAlign: 'center' },
  listPad: { paddingVertical: 8, paddingBottom: 20 },
});
