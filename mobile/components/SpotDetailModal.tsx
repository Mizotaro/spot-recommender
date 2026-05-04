import React from 'react';
import {
  Modal, View, Text, Image, TouchableOpacity, ScrollView,
  Linking, ActivityIndicator, StyleSheet,
} from 'react-native';
import { PlaceDetails, photoUrl } from '../lib/places';
import { formatDistance } from '../utils/distance';

const PRICE: Record<number, string> = { 1: '¥', 2: '¥¥', 3: '¥¥¥', 4: '¥¥¥¥' };

interface Props {
  visible: boolean;
  spot: PlaceDetails | null;
  distanceM?: number;
  detailLoading: boolean;
  isLiked: boolean;
  onLike: () => void;
  onClose: () => void;
}

export default function SpotDetailModal({
  visible, spot, distanceM, detailLoading, isLiked, onLike, onClose,
}: Props) {
  if (!spot) return null;

  const imgUrl = spot.photos?.[0]?.photo_reference
    ? photoUrl(spot.photos[0].photo_reference, 600)
    : null;

  const todayHours = (): string | null => {
    const wt = spot.opening_hours?.weekday_text;
    if (!wt?.length) return null;
    return wt[(new Date().getDay() + 6) % 7] ?? null;
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />
          <TouchableOpacity style={s.closeBtn} onPress={onClose}>
            <Text style={s.closeTxt}>✕</Text>
          </TouchableOpacity>

          <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
            {imgUrl ? (
              <Image source={{ uri: imgUrl }} style={s.photo} resizeMode="cover" />
            ) : (
              <View style={[s.photo, s.photoEmpty]}>
                <Text style={{ fontSize: 44 }}>🏪</Text>
                <Text style={s.photoEmptyTxt}>写真なし</Text>
              </View>
            )}

            <View style={s.body}>
              <Text style={s.name}>{spot.name}</Text>

              {detailLoading && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <ActivityIndicator size="small" color="#9ca3af" />
                  <Text style={s.loadingTxt}>詳細を読み込み中...</Text>
                </View>
              )}

              {/* 距離 */}
              {distanceM !== undefined && (
                <Text style={s.distance}>📍 {formatDistance(distanceM)}</Text>
              )}

              {/* 営業状況 */}
              {spot.opening_hours?.open_now !== undefined && (
                <Text style={spot.opening_hours.open_now ? s.openNow : s.closedNow}>
                  {spot.opening_hours.open_now ? '🟢 現在営業中' : '🔴 現在閉業中'}
                </Text>
              )}

              {/* 今日の営業時間 */}
              {todayHours() && <Text style={s.hours}>🕐 {todayHours()}</Text>}

              {/* 評価 */}
              <View style={s.row}>
                <Text style={s.rating}>⭐ {spot.rating?.toFixed(1) ?? 'N/A'}</Text>
                {spot.user_ratings_total && (
                  <Text style={s.ratingCount}>({spot.user_ratings_total}件)</Text>
                )}
                {spot.price_level && <Text style={s.price}>💰 {PRICE[spot.price_level]}</Text>}
              </View>

              {/* 住所 */}
              {spot.formatted_address && (
                <Text style={s.meta}>📍 {spot.formatted_address}</Text>
              )}

              {/* 電話 */}
              {spot.formatted_phone_number && (
                <TouchableOpacity
                  onPress={() => Linking.openURL(`tel:${spot.formatted_phone_number}`)}
                >
                  <Text style={[s.meta, { color: '#3b82f6' }]}>📞 {spot.formatted_phone_number}</Text>
                </TouchableOpacity>
              )}

              {/* Google Maps */}
              <TouchableOpacity
                onPress={() => Linking.openURL(`https://www.google.com/maps/search/${encodeURIComponent(spot.name)}`)}
              >
                <Text style={[s.meta, { color: '#3b82f6', marginBottom: 12 }]}>🗺️ Google Maps で見る</Text>
              </TouchableOpacity>

              {/* クチコミ */}
              {spot.reviews && spot.reviews.length > 0 && (
                <View style={s.reviews}>
                  <Text style={s.reviewsTitle}>💬 クチコミ</Text>
                  {spot.reviews.slice(0, 2).map((r, i) => (
                    <View key={i} style={s.reviewCard}>
                      <View style={s.reviewHeader}>
                        <Text style={s.reviewAuthor} numberOfLines={1}>{r.author_name}</Text>
                        <Text style={s.reviewStars}>
                          {'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}
                        </Text>
                      </View>
                      <Text style={s.reviewTxt} numberOfLines={3}>{r.text}</Text>
                      <Text style={s.reviewTime}>{r.relative_time_description}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* いいねボタン */}
              <TouchableOpacity
                style={[s.likeBtn, isLiked && s.likeBtnDone]}
                onPress={onLike}
                disabled={isLiked}
              >
                <Text style={s.likeBtnTxt}>
                  {isLiked ? '❤️ いいね済み' : '❤️ いいねする'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    maxHeight: '88%', paddingBottom: 34,
  },
  handle: {
    width: 40, height: 4, backgroundColor: '#d1d5db', borderRadius: 2,
    alignSelf: 'center', marginTop: 12, marginBottom: 4,
  },
  closeBtn: {
    position: 'absolute', top: 10, right: 14, zIndex: 10,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },
  closeTxt: { fontSize: 13, color: '#4b5563' },
  photo: { width: '100%', height: 200 },
  photoEmpty: { backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  photoEmptyTxt: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  body: { padding: 16 },
  name: { fontSize: 18, fontWeight: '700', marginBottom: 10 },
  loadingTxt: { fontSize: 12, color: '#9ca3af' },
  distance: { fontSize: 13, color: '#3b82f6', fontWeight: '600', marginBottom: 4 },
  openNow: { fontSize: 14, fontWeight: '600', color: '#16a34a', marginBottom: 4 },
  closedNow: { fontSize: 14, fontWeight: '600', color: '#dc2626', marginBottom: 4 },
  hours: { fontSize: 12, color: '#374151', marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  rating: { fontSize: 14, fontWeight: '700' },
  ratingCount: { fontSize: 12, color: '#6b7280' },
  price: { fontSize: 13, color: '#6b7280', marginLeft: 4 },
  meta: { fontSize: 12, color: '#6b7280', marginBottom: 5 },
  reviews: { marginTop: 4, marginBottom: 4 },
  reviewsTitle: { fontSize: 12, fontWeight: '700', color: '#6b7280', marginBottom: 8 },
  reviewCard: { backgroundColor: '#f9fafb', borderRadius: 10, padding: 10, marginBottom: 8 },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  reviewAuthor: { fontSize: 12, fontWeight: '600', flex: 1, marginRight: 4 },
  reviewStars: { fontSize: 11, color: '#f59e0b' },
  reviewTxt: { fontSize: 11, color: '#6b7280', lineHeight: 16 },
  reviewTime: { fontSize: 10, color: '#9ca3af', marginTop: 4 },
  likeBtn: {
    marginTop: 16, backgroundColor: '#22c55e',
    borderRadius: 12, paddingVertical: 13, alignItems: 'center',
  },
  likeBtnDone: { backgroundColor: '#d1d5db' },
  likeBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
