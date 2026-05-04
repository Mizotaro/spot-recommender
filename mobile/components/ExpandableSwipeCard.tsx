import React, { useState } from 'react';
import {
  View, Text, Image, StyleSheet, TouchableOpacity,
  ScrollView, Modal,
} from 'react-native';
import { photoUrl } from '../lib/places';

interface Reason {
  userPreference: string;
  spotQuality: string;
  timeRelevance: string;
}

interface ExpandableSwipeCardProps {
  place: any;
  reason?: Reason | null;
  onLike: () => void;
  onDislike: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

const CATEGORY_DESC: Record<string, string> = {
  restaurant: '様々な料理を楽しめるレストラン',
  cafe: 'コーヒーと落ち着きの空間',
  bar: 'お酒と会話を楽しむバー',
  museum: '文化と芸術を味わえる空間',
  park: '自然とリラックスの場所',
  shopping_mall: 'ショッピングの楽しさ',
  movie_theater: '映画鑑賞の最高の体験',
  night_club: 'ナイトライフの中心',
  tourist_attraction: '人気の観光スポット',
};

function placeDescription(place: any): string {
  const type = place.types?.[0] ?? '';
  return CATEGORY_DESC[type] ?? `評価 ${place.rating ?? 'N/A'} の人気スポット`;
}

function openingText(place: any): string {
  if (!place.opening_hours) return '営業時間情報なし';
  return place.opening_hours.open_now ? '🟢 営業中' : '🔴 営業外';
}

export default function ExpandableSwipeCard({
  place,
  reason,
  onLike,
  onDislike,
}: ExpandableSwipeCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  const photos: Array<{ photo_reference: string }> = place.photos ?? [];
  const currentRef = photos[photoIndex]?.photo_reference ?? null;
  const currentUrl = currentRef ? photoUrl(currentRef, 400) : null;

  const handleLike = () => { onLike(); setShowDetails(false); };
  const handleDislike = () => { onDislike(); setShowDetails(false); };

  // ── 通常ビュー ────────────────────────────
  if (!showDetails) {
    return (
      <TouchableOpacity activeOpacity={0.9} onPress={() => setShowDetails(true)} style={s.container}>
        <View style={s.card}>
          {currentUrl ? (
            <Image source={{ uri: currentUrl }} style={s.image} />
          ) : (
            <View style={[s.image, s.noImage]}>
              <Text style={s.noImageText}>📍</Text>
            </View>
          )}

          {photos.length > 1 && (
            <View style={s.photoIndicator}>
              <Text style={s.photoIndicatorText}>{photoIndex + 1} / {photos.length}</Text>
            </View>
          )}

          <View style={s.info}>
            <Text style={s.name} numberOfLines={1}>{place.name}</Text>
            <Text style={s.description} numberOfLines={2}>{placeDescription(place)}</Text>
            <View style={s.ratingRow}>
              <Text style={s.rating}>⭐ {place.rating?.toFixed(1) ?? 'N/A'} / 5</Text>
              {!!place.user_ratings_total && (
                <Text style={s.reviewCount}>({place.user_ratings_total}件)</Text>
              )}
            </View>
          </View>

          <View style={s.buttons}>
            <TouchableOpacity style={s.dislikeButton} onPress={handleDislike}>
              <Text style={s.btnText}>👎</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.likeButton} onPress={handleLike}>
              <Text style={s.btnText}>❤️</Text>
            </TouchableOpacity>
          </View>

          <Text style={s.hint}>📸 タップで詳細を見る</Text>
        </View>
      </TouchableOpacity>
    );
  }

  // ── 詳細ビュー（モーダル）─────────────────
  return (
    <Modal
      visible={showDetails}
      animationType="slide"
      transparent
      onRequestClose={() => setShowDetails(false)}
    >
      <View style={s.modalOverlay}>
        <View style={s.modalContent}>
          {/* ヘッダー */}
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Text style={s.closeButton}>✕</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>詳細情報</Text>
            <View style={{ width: 30 }} />
          </View>

          <ScrollView style={s.modalBody} showsVerticalScrollIndicator={false}>
            {/* 写真カルーセル */}
            {photos.length > 0 && (
              <View style={s.carousel}>
                {currentUrl && (
                  <Image source={{ uri: currentUrl }} style={s.carouselImage} />
                )}
                {photos.length > 1 && (
                  <View style={s.carouselNav}>
                    <TouchableOpacity
                      style={s.navButton}
                      onPress={() => setPhotoIndex((i) => (i > 0 ? i - 1 : photos.length - 1))}
                    >
                      <Text style={s.navText}>‹ 前</Text>
                    </TouchableOpacity>
                    <Text style={s.carouselIndicator}>{photoIndex + 1} / {photos.length}</Text>
                    <TouchableOpacity
                      style={s.navButton}
                      onPress={() => setPhotoIndex((i) => (i < photos.length - 1 ? i + 1 : 0))}
                    >
                      <Text style={s.navText}>次 ›</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* 店情報 */}
            <View style={s.detailSection}>
              <Text style={s.detailName}>{place.name}</Text>
              <Text style={s.detailDescription}>{placeDescription(place)}</Text>

              <View style={s.detailRatingBox}>
                <Text style={s.detailRatingText}>
                  ⭐ {place.rating?.toFixed(1) ?? 'N/A'} / 5
                  {place.user_ratings_total ? `  (${place.user_ratings_total}件)` : ''}
                </Text>
              </View>

              <View style={s.detailField}>
                <Text style={s.fieldLabel}>営業時間</Text>
                <Text style={s.fieldValue}>{openingText(place)}</Text>
              </View>

              {(place.formatted_address || place.vicinity) && (
                <View style={s.detailField}>
                  <Text style={s.fieldLabel}>住所</Text>
                  <Text style={s.fieldValue}>{place.formatted_address ?? place.vicinity}</Text>
                </View>
              )}

              {reason && (
                <View style={s.reasonBox}>
                  <Text style={s.reasonTitle}>💡 なぜこれ？</Text>
                  {reason.userPreference ? <Text style={s.reasonText}>{reason.userPreference}</Text> : null}
                  {reason.spotQuality ? <Text style={s.reasonText}>{reason.spotQuality}</Text> : null}
                  {reason.timeRelevance ? <Text style={s.reasonText}>{reason.timeRelevance}</Text> : null}
                </View>
              )}
            </View>
          </ScrollView>

          {/* 下部ボタン */}
          <View style={s.modalButtons}>
            <TouchableOpacity style={s.modalDislikeButton} onPress={handleDislike}>
              <Text style={s.modalDislikeText}>👎 嫌い</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.modalLikeButton} onPress={handleLike}>
              <Text style={s.modalLikeText}>❤️ いいね</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  // 通常ビュー
  container: { width: '100%' },
  card: {
    backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  image: { width: '100%', height: 300, resizeMode: 'cover' },
  noImage: { backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  noImageText: { fontSize: 60 },
  photoIndicator: {
    position: 'absolute', top: 12, right: 12,
    backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6,
  },
  photoIndicatorText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  info: { padding: 16 },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  description: { fontSize: 13, color: '#666', marginBottom: 8, lineHeight: 18 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { fontSize: 14, fontWeight: '600' },
  reviewCount: { fontSize: 12, color: '#999' },
  buttons: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingHorizontal: 16, paddingBottom: 16, gap: 12,
  },
  dislikeButton: {
    flex: 1, height: 50, borderRadius: 25,
    borderWidth: 2, borderColor: '#f44336',
    justifyContent: 'center', alignItems: 'center',
  },
  likeButton: {
    flex: 1, height: 50, borderRadius: 25,
    borderWidth: 2, borderColor: '#4CAF50',
    justifyContent: 'center', alignItems: 'center',
  },
  btnText: { fontSize: 24 },
  hint: { textAlign: 'center', color: '#bbb', fontSize: 12, paddingBottom: 12 },

  // 詳細ビュー
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: {
    flex: 1, backgroundColor: '#fff',
    borderTopLeftRadius: 24, borderTopRightRadius: 24, marginTop: 40,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  closeButton: { fontSize: 28, fontWeight: 'bold', color: '#666' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  modalBody: { flex: 1, paddingHorizontal: 16 },
  carousel: { marginVertical: 16 },
  carouselImage: { width: '100%', height: 280, borderRadius: 12 },
  carouselNav: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 12,
  },
  navButton: { paddingHorizontal: 12, paddingVertical: 6 },
  navText: { fontSize: 14, fontWeight: '600', color: '#4285F4' },
  carouselIndicator: { fontSize: 12, color: '#999' },
  detailSection: { marginBottom: 20 },
  detailName: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  detailDescription: { fontSize: 14, color: '#666', marginBottom: 12, lineHeight: 20 },
  detailRatingBox: {
    backgroundColor: '#f5f5f5', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 8, marginBottom: 12,
  },
  detailRatingText: { fontSize: 14, fontWeight: '600', color: '#333' },
  detailField: { marginBottom: 12 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 4 },
  fieldValue: { fontSize: 14, color: '#333' },
  reasonBox: { backgroundColor: '#E3F2FD', borderRadius: 8, padding: 12, marginTop: 12 },
  reasonTitle: { fontSize: 12, fontWeight: '600', color: '#1976D2', marginBottom: 6 },
  reasonText: { fontSize: 12, color: '#0D47A1', marginBottom: 4, lineHeight: 16 },
  modalButtons: {
    flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderTopColor: '#f0f0f0',
  },
  modalDislikeButton: {
    flex: 1, height: 50, borderRadius: 12, backgroundColor: '#ffebee',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#f44336',
  },
  modalDislikeText: { fontSize: 14, fontWeight: '600', color: '#f44336' },
  modalLikeButton: {
    flex: 1, height: 50, borderRadius: 12, backgroundColor: '#E8F5E9',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#4CAF50',
  },
  modalLikeText: { fontSize: 14, fontWeight: '600', color: '#4CAF50' },
});
