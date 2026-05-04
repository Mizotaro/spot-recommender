# スワイプカードUI改善指示書
## 複数写真 + 店情報表示 + クリック詳細表示

---

## 現在の問題

- ✅ 店の外観写真 1 枚のみで判断を迫られる
- ❌ 料理の写真が見られない
- ❌ メニュー写真が見られない
- ❌ 店がどんなところかわからない

---

## 改善案

**パターン：写真をクリック → 詳細ビュー表示**

```
【通常ビュー】
┌─────────────────┐
│  [写真]         │  ← クリック可能
│  店名           │
│  ⭐ 4.5         │
│  ❤️ 👎 ボタン  │
└─────────────────┘
       ↓ クリック
【詳細ビュー】
┌─────────────────┐
│ [写真カルーセル]│
│  <- 写真1 写真2 ->
│ 店名 / 説明文   │
│ ⭐ 4.5 / 150件 │
│ 営業時間 / 住所 │
│ ❤️ 👎 ボタン  │
│     ↑ 位置は同じ
└─────────────────┘
```

---

## 実装ファイル

### ファイル1：`mobile/components/ExpandableSwipeCard.tsx`（新規作成）

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Modal,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ExpandableSwipeCardProps {
  place: any;
  reason: any;
  onLike: () => void;
  onDislike: () => void;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  children?: React.ReactNode; // Tinder式スワイプコンテナ用
}

export default function ExpandableSwipeCard({
  place,
  reason,
  onLike,
  onDislike,
  onSwipeLeft,
  onSwipeRight,
  children,
}: ExpandableSwipeCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);

  // 店情報を生成
  const generatePlaceDescription = (place: any): string => {
    const types = place.types?.[0] || 'スポット';
    const rating = place.rating || 'N/A';
    const reviewCount = place.user_ratings_total || 0;

    // カテゴリから説明を生成
    const descriptions: { [key: string]: string } = {
      restaurant: '様々な料理を楽しめるレストラン',
      cafe: 'コーヒーと落ち着きの空間',
      bar: 'お酒と会話を楽しむバー',
      museum: '文化と芸術を味わえる空間',
      park: '自然とリラックスの場所',
      shopping_mall: 'ショッピングの楽しさ',
      movie_theater: '映画鑑賞の最高の体験',
      night_club: 'ナイトライフの中心',
    };

    return descriptions[types] || `評価 ${rating} の人気スポット`;
  };

  // 営業時間を取得
  const getOpeningHoursText = (place: any): string => {
    if (!place.opening_hours) return '営業時間情報なし';
    const isOpen = place.opening_hours.open_now ? '営業中 ✅' : '営業外 ❌';
    return isOpen;
  };

  // 写真を取得
  const getPhotoUrl = (photo: any): string | null => {
    if (!photo?.getUrl) return null;
    try {
      return photo.getUrl({ maxWidth: 400 });
    } catch {
      return null;
    }
  };

  const photos = place.photos || [];
  const hasPhotos = photos.length > 0;
  const currentPhoto = hasPhotos ? photos[photoIndex] : null;
  const photoUrl = currentPhoto ? getPhotoUrl(currentPhoto) : null;

  // 通常ビュー
  if (!showDetails) {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => setShowDetails(true)}
        style={styles.container}
      >
        {children ? (
          // Tinder式スワイプコンテナをラップ
          <View>{children}</View>
        ) : (
          // フォールバック：簡易カード表示
          <View style={styles.card}>
            {/* 写真 */}
            {photoUrl ? (
              <Image
                source={{ uri: photoUrl }}
                style={styles.image}
              />
            ) : (
              <View style={[styles.image, styles.noImage]}>
                <Text style={styles.noImageText}>📍</Text>
              </View>
            )}

            {/* 写真枚数インジケーター */}
            {hasPhotos && photos.length > 1 && (
              <View style={styles.photoIndicator}>
                <Text style={styles.photoIndicatorText}>
                  {photoIndex + 1} / {photos.length}
                </Text>
              </View>
            )}

            {/* 基本情報 */}
            <View style={styles.info}>
              <Text style={styles.name} numberOfLines={1}>
                {place.name}
              </Text>
              <Text style={styles.description} numberOfLines={2}>
                {generatePlaceDescription(place)}
              </Text>
              <View style={styles.ratingRow}>
                <Text style={styles.rating}>
                  ⭐ {place.rating?.toFixed(1) || 'N/A'} / 5
                </Text>
                {place.user_ratings_total && (
                  <Text style={styles.reviewCount}>
                    ({place.user_ratings_total}件)
                  </Text>
                )}
              </View>
            </View>

            {/* ボタン */}
            <View style={styles.buttons}>
              <TouchableOpacity
                style={styles.dislikeButton}
                onPress={() => {
                  onDislike();
                  onSwipeLeft();
                }}
              >
                <Text style={styles.dislikeButtonText}>👎</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.likeButton}
                onPress={() => {
                  onLike();
                  onSwipeRight();
                }}
              >
                <Text style={styles.likeButtonText}>❤️</Text>
              </TouchableOpacity>
            </View>

            {/* タップヒント */}
            <Text style={styles.hint}>📸 タップで詳細を見る</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  // 詳細ビュー（モーダル）
  return (
    <Modal
      visible={showDetails}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowDetails(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {/* ヘッダー */}
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowDetails(false)}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>詳細情報</Text>
            <View style={{ width: 30 }} />
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* 写真カルーセル */}
            {hasPhotos && (
              <View style={styles.carouselContainer}>
                {photoUrl && (
                  <Image
                    source={{ uri: photoUrl }}
                    style={styles.carouselImage}
                  />
                )}

                {/* 写真ナビゲーション */}
                {photos.length > 1 && (
                  <View style={styles.carouselNav}>
                    <TouchableOpacity
                      style={styles.navButton}
                      onPress={() =>
                        setPhotoIndex((i) =>
                          i > 0 ? i - 1 : photos.length - 1
                        )
                      }
                    >
                      <Text style={styles.navButtonText}>‹ 前</Text>
                    </TouchableOpacity>

                    <Text style={styles.carouselIndicator}>
                      {photoIndex + 1} / {photos.length}
                    </Text>

                    <TouchableOpacity
                      style={styles.navButton}
                      onPress={() =>
                        setPhotoIndex((i) =>
                          i < photos.length - 1 ? i + 1 : 0
                        )
                      }
                    >
                      <Text style={styles.navButtonText}>次 ›</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}

            {/* 店情報 */}
            <View style={styles.detailSection}>
              <Text style={styles.detailName}>{place.name}</Text>

              {/* 説明 */}
              <Text style={styles.detailDescription}>
                {generatePlaceDescription(place)}
              </Text>

              {/* 評価 */}
              <View style={styles.detailRating}>
                <Text style={styles.detailRatingText}>
                  ⭐ {place.rating?.toFixed(1) || 'N/A'} / 5
                  {place.user_ratings_total && (
                    <Text> ({place.user_ratings_total}件)</Text>
                  )}
                </Text>
              </View>

              {/* 営業時間 */}
              <View style={styles.detailField}>
                <Text style={styles.detailFieldLabel}>営業時間</Text>
                <Text style={styles.detailFieldValue}>
                  {getOpeningHoursText(place)}
                </Text>
              </View>

              {/* 住所 */}
              {place.formatted_address && (
                <View style={styles.detailField}>
                  <Text style={styles.detailFieldLabel}>住所</Text>
                  <Text style={styles.detailFieldValue}>
                    {place.formatted_address}
                  </Text>
                </View>
              )}

              {/* 推薦理由 */}
              {reason && (
                <View style={styles.reasonBox}>
                  <Text style={styles.reasonTitle}>💡 なぜこれ？</Text>
                  <Text style={styles.reasonText}>
                    {reason.userPreference}
                  </Text>
                  <Text style={styles.reasonText}>
                    {reason.spotQuality}
                  </Text>
                  <Text style={styles.reasonText}>
                    {reason.timeRelevance}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* ボタン（詳細ビューの下部に固定） */}
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={styles.modalDislikeButton}
              onPress={() => {
                onDislike();
                onSwipeLeft();
                setShowDetails(false);
              }}
            >
              <Text style={styles.modalDislikeButtonText}>👎 嫌い</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalLikeButton}
              onPress={() => {
                onLike();
                onSwipeRight();
                setShowDetails(false);
              }}
            >
              <Text style={styles.modalLikeButtonText}>❤️ いいね</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // 通常ビュー
  container: { width: '100%' },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  image: { width: '100%', height: 300, resizeMode: 'cover' },
  noImage: { backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  noImageText: { fontSize: 60 },
  photoIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  photoIndicatorText: { color: 'white', fontSize: 11, fontWeight: '600' },
  info: { padding: 16 },
  name: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  description: { fontSize: 13, color: '#666', marginBottom: 8, lineHeight: 18 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rating: { fontSize: 14, fontWeight: '600' },
  reviewCount: { fontSize: 12, color: '#999' },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  dislikeButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dislikeButtonText: { fontSize: 24 },
  likeButton: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButtonText: { fontSize: 24 },
  hint: { textAlign: 'center', color: '#bbb', fontSize: 12, paddingBottom: 12 },

  // 詳細ビュー（モーダル）
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    flex: 1,
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  closeButton: { fontSize: 28, fontWeight: 'bold', color: '#666' },
  modalTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  modalBody: { flex: 1, paddingHorizontal: 16 },
  carouselContainer: { marginVertical: 16 },
  carouselImage: { width: '100%', height: 280, borderRadius: 12 },
  carouselNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  navButton: { paddingHorizontal: 12, paddingVertical: 6 },
  navButtonText: { fontSize: 14, fontWeight: '600', color: '#4285F4' },
  carouselIndicator: { fontSize: 12, color: '#999' },
  detailSection: { marginBottom: 20 },
  detailName: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  detailDescription: { fontSize: 14, color: '#666', marginBottom: 12, lineHeight: 20 },
  detailRating: { backgroundColor: '#f5f5f5', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, marginBottom: 12 },
  detailRatingText: { fontSize: 14, fontWeight: '600', color: '#333' },
  detailField: { marginBottom: 12 },
  detailFieldLabel: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 4 },
  detailFieldValue: { fontSize: 14, color: '#333' },
  reasonBox: { backgroundColor: '#E3F2FD', borderRadius: 8, padding: 12, marginTop: 12 },
  reasonTitle: { fontSize: 12, fontWeight: '600', color: '#1976D2', marginBottom: 6 },
  reasonText: { fontSize: 12, color: '#0D47A1', marginBottom: 4, lineHeight: 16 },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalDislikeButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#ffebee',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f44336',
  },
  modalDislikeButtonText: { fontSize: 14, fontWeight: '600', color: '#f44336' },
  modalLikeButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  modalLikeButtonText: { fontSize: 14, fontWeight: '600', color: '#4CAF50' },
});
```

---

### ファイル2：`mobile/screens/DiscoveryScreen.tsx` を修正

現在の `SwipeCard` の import を以下に変更：

```typescript
// ❌ 現在
import SwipeCard from '../components/SwipeCard';

// ✅ 新規
import ExpandableSwipeCard from '../components/ExpandableSwipeCard';
```

そして、SwipeCard の使用部分を修正：

```typescript
// ❌ 現在
<SwipeCard
  key={currentPlace.place_id}
  place={currentPlace}
  onSwipeLeft={handleSwipeLeft}
  onSwipeRight={handleSwipeRight}
/>

// ✅ 新規
<ExpandableSwipeCard
  place={currentPlace}
  reason={generateRecommendationReason(
    currentPlace,
    userLikes,
    new Date().getHours()
  )}
  onLike={handleSwipeRight}
  onDislike={handleSwipeLeft}
  onSwipeLeft={handleSwipeLeft}
  onSwipeRight={handleSwipeRight}
/>
```

---

## テスト手順

```bash
cd C:\Users\user\spot-recommender\mobile
npx expo start --clear
```

スマホで以下をテスト：

- [ ] 通常ビューが表示される
- [ ] 写真をタップ → 詳細ビューが開く
- [ ] 詳細ビューで複数写真をナビゲート（前/次ボタン）
- [ ] 店の説明文が表示される
- [ ] 営業時間と住所が表示される
- [ ] 推薦理由が表示される
- [ ] 詳細ビューのボタンをクリック → 詳細が閉じてカード切り替え
- [ ] 通常ビューのボタンをクリック → 即座にカード切り替え

---

## チェックリスト

- [ ] 複数の写真が見られる
- [ ] 店の説明文が分かりやすい
- [ ] タップで詳細ビューが開く
- [ ] 詳細ビューでも「いいね」「よくないね」が機能する
- [ ] 詳細ビューを閉じるとカードが切り替わる
- [ ] エラーが出ていない

---

## 注意事項

1. **既存の SwipeCard.tsx は削除しない**（互換性のため保留）
2. **Google Maps API の photos は 1-3 枚程度**
3. **詳細ビューのスクロール確認**（特に長い住所等）

完成後は以下を実行：

```bash
git add .
git commit -m "Mobile: Add expandable swipe card with photo carousel and place details"
git push origin main
```
