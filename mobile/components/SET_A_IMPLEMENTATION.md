# セット A 実装指示書
## Tinder 式スワイプカード + Spotify 式推薦表示（2.5時間）

---

## 実装概要

**目標：** スワイプ体験を「本物のアプリ」のレベルに引き上げる

```
現在：基本的なスワイプ機能
↓
改善後：Tinder × Spotify のハイブリッドUI
  - Tinder の洗練されたスワイプアニメーション
  - Spotify の視覚的インパクト + 推薦理由
```

---

## 実装順序

```
【フェーズ1：Tinder式スワイプカード】 (2時間)
  ファイル作成：mobile/components/TinderLikeCard.tsx
  → 既存のSwipeCard.tsx を置き換え
  
【フェーズ2：Spotify式グラデーション化】 (0.5時間)
  ファイル修正：mobile/screens/DiscoveryScreen.tsx
  → TinderLikeCard に Spotify 風の背景を追加

合計：2.5時間
```

---

## ファイル 1：mobile/components/TinderLikeCard.tsx（新規作成）

**このファイルを C:\Users\user\spot-recommender\mobile\components\ に作成してください：**

```typescript
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  LinearGradient,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface TinderLikeCardProps {
  place: any;
  reason?: any;
  onLike: () => void;
  onDislike: () => void;
  cardIndex?: number;
  totalCards?: number;
}

export default function TinderLikeCard({
  place,
  reason,
  onLike,
  onDislike,
  cardIndex = 0,
  totalCards = 10,
}: TinderLikeCardProps) {
  const position = useRef(new Animated.ValueXY()).current;
  const scale = useRef(new Animated.Value(1)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isAnimating,
    onMoveShouldSetPanResponder: () => !isAnimating,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });

      // 回転角度を計算（スワイプ距離に応じて）
      const angle = (gesture.dx / SCREEN_WIDTH) * 15; // 最大 ±15度
      rotation.setValue(angle);

      // 右スワイプで LIKE を表示
      if (gesture.dx > 0) {
        likeOpacity.setValue(Math.min(gesture.dx / SWIPE_THRESHOLD, 1));
        nopeOpacity.setValue(0);
      }
      // 左スワイプで NOPE を表示
      else {
        nopeOpacity.setValue(Math.min(-gesture.dx / SWIPE_THRESHOLD, 1));
        likeOpacity.setValue(0);
      }

      // 奥行き効果（次のカードが見える）
      const scaleValue = 1 - Math.abs(gesture.dx) / (SCREEN_WIDTH * 4);
      scale.setValue(Math.max(scaleValue, 0.95));
    },
    onPanResponderRelease: (_, gesture) => {
      const dx = gesture.dx;
      const vx = gesture.vx;

      // スワイプ距離またはスワイプ速度で判定
      const isSwipeRight = dx > SWIPE_THRESHOLD || vx > 0.7;
      const isSwipeLeft = dx < -SWIPE_THRESHOLD || vx < -0.7;

      if (isSwipeRight) {
        // 右スワイプ：いいね
        setIsAnimating(true);
        Animated.parallel([
          Animated.timing(position.x, {
            toValue: SCREEN_WIDTH * 1.5,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(rotation, {
            toValue: 30,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(likeOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start(() => {
          onLike();
          resetCard();
        });
      } else if (isSwipeLeft) {
        // 左スワイプ：嫌い
        setIsAnimating(true);
        Animated.parallel([
          Animated.timing(position.x, {
            toValue: -SCREEN_WIDTH * 1.5,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(rotation, {
            toValue: -30,
            duration: 400,
            useNativeDriver: false,
          }),
          Animated.timing(nopeOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start(() => {
          onDislike();
          resetCard();
        });
      } else {
        // スワイプ不十分：元に戻す
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          tension: 40,
          friction: 8,
          useNativeDriver: false,
        }).start();
        Animated.spring(rotation, {
          toValue: 0,
          tension: 40,
          friction: 8,
          useNativeDriver: false,
        }).start();
        Animated.timing(scale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }).start();
        likeOpacity.setValue(0);
        nopeOpacity.setValue(0);
      }
    },
  });

  const resetCard = () => {
    position.setValue({ x: 0, y: 0 });
    rotation.setValue(0);
    scale.setValue(1);
    likeOpacity.setValue(0);
    nopeOpacity.setValue(0);
    setIsAnimating(false);
  };

  const rotateInterpolate = rotation.interpolate({
    inputRange: [-30, 0, 30],
    outputRange: ['-30deg', '0deg', '30deg'],
  });

  const cardStyle = {
    ...position.getLayout(),
    transform: [{ rotate: rotateInterpolate }, { scale }],
  };

  const photoUrl = place.photos?.[0]?.getUrl?.({ maxWidth: 400 }) || null;

  return (
    <View style={styles.container}>
      {/* カウンター（上部） */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>
          {cardIndex + 1} / {totalCards}
        </Text>
      </View>

      {/* カード */}
      <Animated.View
        style={[styles.card, cardStyle]}
        {...panResponder.panHandlers}
      >
        {/* LIKE スタンプ */}
        <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}>
          <Text style={styles.stampIcon}>❤️</Text>
          <Text style={styles.stampLabel}>LIKE</Text>
        </Animated.View>

        {/* NOPE スタンプ */}
        <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}>
          <Text style={styles.stampIcon}>👎</Text>
          <Text style={styles.stampLabel}>NOPE</Text>
        </Animated.View>

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

        {/* グラデーション背景（テキスト可視化） */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.gradient}
        />

        {/* 情報（下部） */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>
            {place.name}
          </Text>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>⭐ {place.rating?.toFixed(1) || 'N/A'}</Text>
            {place.user_ratings_total && (
              <Text style={styles.reviewCount}>({place.user_ratings_total})</Text>
            )}
          </View>
          {place.types && (
            <Text style={styles.category}>{place.types[0]}</Text>
          )}
        </View>
      </Animated.View>

      {/* ボタン（下部） */}
      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.nope}
          onPress={onDislike}
          disabled={isAnimating}
        >
          <Text style={styles.nopeIcon}>👎</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.like}
          onPress={onLike}
          disabled={isAnimating}
        >
          <Text style={styles.likeIcon}>❤️</Text>
        </TouchableOpacity>
      </View>

      {/* 操作ヒント */}
      <Text style={styles.hint}>← スワイプで選択 →</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
  },
  counter: {
    marginBottom: 16,
  },
  counterText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  card: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.65,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
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
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 140,
  },
  stamp: {
    position: 'absolute',
    top: '25%',
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderRadius: 12,
    zIndex: 10,
  },
  likeStamp: {
    left: 20,
    borderColor: '#FF6B6B',
    transform: [{ rotate: '-15deg' }],
  },
  nopeStamp: {
    right: 20,
    borderColor: '#999',
    transform: [{ rotate: '15deg' }],
  },
  stampIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  stampLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF6B6B',
  },
  info: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 6,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  rating: {
    fontSize: 16,
    color: '#FFD700',
    fontWeight: '600',
  },
  reviewCount: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  category: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  buttons: {
    flexDirection: 'row',
    gap: 32,
    marginTop: 24,
    marginBottom: 16,
    paddingHorizontal: 60,
  },
  nope: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#999',
    justifyContent: 'center',
    alignItems: 'center',
  },
  like: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nopeIcon: {
    fontSize: 28,
  },
  likeIcon: {
    fontSize: 28,
  },
  hint: {
    fontSize: 12,
    color: '#BBB',
    marginTop: 8,
  },
});
```

---

## ファイル 2：mobile/screens/DiscoveryScreen.tsx（修正）

**現在のコードから以下を修正：**

### 修正 1：Import を変更

```typescript
// ❌ 現在
import SwipeCard from '../components/SwipeCard';
import ExpandableSwipeCard from '../components/ExpandableSwipeCard';

// ✅ 新規
import TinderLikeCard from '../components/TinderLikeCard';
```

### 修正 2：コンポーネント内で SwipeCard を置き換え

```typescript
// ❌ 現在
<ExpandableSwipeCard
  place={currentPlace}
  reason={generateRecommendationReason(...)}
  onLike={handleSwipeRight}
  onDislike={handleSwipeLeft}
  onSwipeLeft={handleSwipeLeft}
  onSwipeRight={handleSwipeRight}
/>

// ✅ 新規
<TinderLikeCard
  place={currentPlace}
  reason={generateRecommendationReason(
    currentPlace,
    userLikes,
    new Date().getHours()
  )}
  onLike={handleSwipeRight}
  onDislike={handleSwipeLeft}
  cardIndex={currentIndex}
  totalCards={recommendations.length}
/>
```

### 修正 3：ExpandableSwipeCard は詳細ビュー用に保持

通常ビューは TinderLikeCard、詳細ビューは ExpandableSwipeCard という役割分担：

```typescript
// 写真タップで詳細ビュー表示
const handleShowDetail = () => {
  // 詳細モーダル表示
  setShowDetail(true);
};

// 詳細ビュー（モーダル）
{showDetail && (
  <ExpandableSwipeCard
    place={currentPlace}
    reason={generateRecommendationReason(...)}
    onLike={handleSwipeRight}
    onDislike={handleSwipeLeft}
    onSwipeLeft={handleSwipeLeft}
    onSwipeRight={handleSwipeRight}
  />
)}
```

---

## テスト手順

実装後、以下のコマンドで Expo Go をテストしてください：

```bash
cd C:\Users\user\spot-recommender\mobile
npx expo start --clear
```

Expo Go でスマホテスト：

### テスト項目

- [ ] **カウンター表示**：「1 / 10」が上部に表示される
- [ ] **スワイプアニメーション**：カード回転 + フェードアウト
- [ ] **スタンプ表示**：右スワイプで ❤️ LIKE、左スワイプで 👎 NOPE
- [ ] **グラデーション**：下部グラデーション背景で テキスト が見やすい
- [ ] **ボタン配置**：下部中央に大型ボタン 2 個
- [ ] **左スワイプバグ修正**：左スワイプで正常に次のカードに移動
- [ ] **速度感**：スワイプ速度が速い
- [ ] **エラーなし**：コンソールにエラーが出ていない

---

## Claude Code への実装指示

ファイルをプロジェクトに配置した後、Claude Code で以下を実行してください：

```
mobile/components/TinderLikeCard.tsx を新規作成してください。

提供されたコード全文をコピーして実装してください。

その後、mobile/screens/DiscoveryScreen.tsx を修正：
1. SwipeCard → TinderLikeCard に変更
2. props に cardIndex と totalCards を追加
3. 既存の ExpandableSwipeCard は詳細ビュー用に保持

修正後、npx expo start --clear で Expo Go でテストしてください。

テスト項目：
✅ カウンター表示
✅ スワイプアニメーション
✅ スタンプ表示（❤️ / 👎）
✅ グラデーション背景
✅ ボタン配置
✅ 左スワイプ動作
✅ エラーなし
```

---

## 完了確認

実装完了後：

```bash
git add .
git commit -m "UI: Implement Tinder-like swipe card with Spotify-style gradient"
git push origin main
```

その後、「✅ 完了！」と教えてください！

---

## 合計実装時間：2.5時間

- ファイル作成：1.5時間
- テスト＆修正：1時間
- GitHub push：0分

**合計：2.5時間で Play Store ローンチレベルの UI に進化！**
