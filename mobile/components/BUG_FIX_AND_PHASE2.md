# スワイプバグ修正 + Phase 2 機能実装指示書

---

## 🐛 バグ修正：左スワイプ（嫌い）が機能していない

### 問題
- 右スワイプ（いいね）：✅ 機能している
- 左スワイプ（嫌い）：❌ 機能していない（元の場所に戻る）

### 原因
`mobile/components/SwipeCard.tsx` の `onPanResponderRelease` 処理で、回転アニメーションが干渉している可能性があります。

### 修正方法

**修正ファイル：** `mobile/components/SwipeCard.tsx`

以下の部分を完全に置き換えてください：

```typescript
// ❌ 現在の onPanResponderRelease
onPanResponderRelease: (_, gesture) => {
  if (gesture.dx > SWIPE_THRESHOLD) {
    // 右スワイプ
    Animated.spring(position, {
      toValue: { x: SCREEN_WIDTH + 100, y: gesture.dy },
      useNativeDriver: false,
    }).start(() => {
      onSwipeRight();
      position.setValue({ x: 0, y: 0 });
      likeOpacity.setValue(0);
    });
  } else if (gesture.dx < -SWIPE_THRESHOLD) {
    // 左スワイプ
    Animated.spring(position, {
      toValue: { x: -SCREEN_WIDTH - 100, y: gesture.dy },
      useNativeDriver: false,
    }).start(() => {
      onSwipeLeft();  // ← ここが実行されていない可能性
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
}
```

**✅ 修正後のコード：**

```typescript
onPanResponderRelease: (_, gesture) => {
  const threshold = SWIPE_THRESHOLD;

  // 右スワイプ（いいね）
  if (gesture.dx > threshold) {
    Animated.timing(position.x, {
      toValue: SCREEN_WIDTH + 100,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      // コールバック実行（重要）
      onSwipeRight();
      // 次のカードのためにリセット
      position.setValue({ x: 0, y: 0 });
      likeOpacity.setValue(0);
      nopeOpacity.setValue(0);
    });
  }
  // 左スワイプ（嫌い）
  else if (gesture.dx < -threshold) {
    Animated.timing(position.x, {
      toValue: -SCREEN_WIDTH - 100,
      duration: 300,
      useNativeDriver: false,
    }).start(() => {
      // コールバック実行（重要）
      onSwipeLeft();  // ← これが実行されることを確認
      // 次のカードのためにリセット
      position.setValue({ x: 0, y: 0 });
      likeOpacity.setValue(0);
      nopeOpacity.setValue(0);
    });
  }
  // スワイプ不十分（元に戻す）
  else {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      useNativeDriver: false,
    }).start();
    likeOpacity.setValue(0);
    nopeOpacity.setValue(0);
  }
};
```

### 主な修正点

1. **Animated.spring() → Animated.timing()** に変更
   - より確実にアニメーションを完了

2. **コールバックの順序を修正**
   - `.start(() => { onSwipeLeft(); ... })` で確実に実行

3. **position.x のみを指定**
   - y 軸の干渉を排除

4. **リセット時に opacity もクリア**
   - 次のカードで余計なスタンプが残らない

---

## テスト手順

修正後、以下をテストしてください：

```bash
cd C:\Users\user\spot-recommender\mobile
npx expo start --clear
```

スマホで以下を確認：

- [ ] 右スワイプ → ❤️ LIKE が表示 → カードが消える
- [ ] 左スワイプ → 👎 NOPE が表示 → カードが消える
- [ ] スワイプ後、次のカードが自動表示
- [ ] スタンプが残らない（きれいに消える）
- [ ] Firebase に badFeedback が保存される

---

---

## Phase 2 実装内容

修正完了後、以下の 3 つの機能を実装します：

### ⑤時間帯最適化（実装時間：20分）

**概要：** 現在時刻に応じて推薦カテゴリを自動切り替え

```
朝 (6-11時) → カフェ、パン屋
昼 (11-17時) → レストラン、ラーメン
夜 (17-23時) → 居酒屋、バー
深夜 (23-6時) → ラーメン、居酒屋
```

**実装ファイル：** `mobile/App.tsx` に追加

```typescript
const getTimeBasedCategory = (): string => {
  const hour = new Date().getHours();
  
  if (hour >= 6 && hour < 11) return 'cafe';
  if (hour >= 11 && hour < 17) return 'restaurant';
  if (hour >= 17 && hour < 23) return 'bar';
  return 'restaurant'; // 深夜はレストラン（ラーメン含む）
};

// useEffect で起動時に時間帯カテゴリを適用
useEffect(() => {
  const timeCategory = getTimeBasedCategory();
  setSelectedCategory(timeCategory);
  fetchRecommendations(userLocation, timeCategory);
}, []);
```

UI に表示：
```typescript
<Text style={styles.timeLabel}>
  🕐 {getTimeBasedCategoryLabel()}
</Text>
```

---

### ⑥いつもの＋少し冒険（80/20）（実装時間：30分）

**概要：** 推薦を 80% = 好み × 20% = 新しいカテゴリで混ぜる

```
ユーザーがラーメン好き 8回
+ 新しいカフェ 2回
= バランスの取れた推薦
```

**実装ファイル：** `mobile/App.tsx` の `fetchRecommendations` を修正

```typescript
const generateBalancedRecommendations = (
  allSpots: any[],
  userLikes: any[]
): any[] => {
  // 1. ユーザーの好みカテゴリを取得
  const categoryCount: { [key: string]: number } = {};
  userLikes.forEach((like) => {
    const cat = like.category;
    categoryCount[cat] = (categoryCount[cat] || 0) + 1;
  });

  const topCategories = Object.entries(categoryCount)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([cat]) => cat);

  // 2. スポットを分類
  const favoriteSpots = allSpots.filter((spot) =>
    topCategories.includes(spot.types?.[0])
  );

  const otherSpots = allSpots.filter(
    (spot) => !topCategories.includes(spot.types?.[0])
  );

  // 3. 80/20 ミックス
  const eachCount = Math.floor(favoriteSpots.length * 0.8);
  const newCount = Math.floor(favoriteSpots.length * 0.2);

  const balanced = [
    ...favoriteSpots.slice(0, eachCount),
    ...otherSpots.slice(0, newCount),
  ];

  return balanced.slice(0, 10);
};

// fetchRecommendations 内で使用
const allSpots = /* 取得したスポット */;
const balanced = generateBalancedRecommendations(allSpots, userLikes);
setRecommendations(balanced);
```

UI に表示：
```typescript
<Text style={styles.balanceLabel}>
  💡 あなたの好み 80% + 新しい発見 20%
</Text>
```

---

### ③理由付きレコメンド（実装時間：25分）

**概要：** 各スポットに「なぜこれ？」を表示

```
「あなたはラーメン好き（4回訪問）」
「この店は同ジャンル高評価（4.6/5）」
→ 信頼度爆上がり
```

**実装ファイル：** `mobile/screens/DiscoveryScreen.tsx` を修正

```typescript
interface RecommendationReason {
  userPreference: string;
  spotQuality: string;
  timeRelevance: string;
}

const generateRecommendationReason = (
  spot: any,
  userLikes: any[],
  hour: number
): RecommendationReason => {
  // 1. ユーザーの好み
  const categoryLikes = userLikes.filter(
    (l) => l.category === spot.types?.[0]
  );
  const userPreference =
    categoryLikes.length > 2
      ? `あなたは同ジャンルを${categoryLikes.length}回いいね`
      : '新しいジャンルに挑戦！';

  // 2. スポット品質
  const spotQuality =
    spot.rating >= 4.5
      ? `高評価 ⭐${spot.rating} (${spot.user_ratings_total}件)`
      : `評価 ⭐${spot.rating}`;

  // 3. 時間帯関連性
  let timeRelevance = '';
  if (hour >= 11 && hour < 17 && spot.types?.includes('restaurant')) {
    timeRelevance = '今この時間、お手頃です';
  } else if (hour >= 17 && spot.types?.includes('bar')) {
    timeRelevance = '夜のお供に最適';
  } else if (hour >= 6 && hour < 12 && spot.types?.includes('cafe')) {
    timeRelevance = '朝のカフェに最適';
  } else {
    timeRelevance = '営業中 ✅';
  }

  return { userPreference, spotQuality, timeRelevance };
};
```

**SwipeCard に理由を表示：**

```typescript
interface SwipeCardProps {
  place: any;
  reason: RecommendationReason;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export default function SwipeCard({
  place,
  reason,
  onSwipeLeft,
  onSwipeRight,
}: SwipeCardProps) {
  return (
    <View style={styles.card}>
      {/* 既存の内容 */}
      
      {/* 理由表示（新規） */}
      <View style={styles.reasonBox}>
        <Text style={styles.reasonLabel}>💡 なぜこれ？</Text>
        <Text style={styles.reasonText}>{reason.userPreference}</Text>
        <Text style={styles.reasonText}>{reason.spotQuality}</Text>
        <Text style={styles.reasonText}>{reason.timeRelevance}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // 既存のスタイル
  
  reasonBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 8,
    marginVertical: 8,
  },
  reasonLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 11,
    color: '#0D47A1',
    lineHeight: 16,
  },
});
```

---

## 実装順序

```
【優先1】バグ修正：左スワイプ機能（10分）
  └ SwipeCard.tsx を修正

【優先2】⑤時間帯最適化（20分）
  └ App.tsx に getTimeBasedCategory() を追加

【優先3】③理由付きレコメンド（25分）
  └ generateRecommendationReason() を実装
  └ SwipeCard に理由表示

【優先4】⑥80/20 冒険（30分）
  └ fetchRecommendations に generateBalancedRecommendations() を統合

合計：85分（1.5時間）
```

---

## テスト手順（修正後）

```bash
cd C:\Users\user\spot-recommender\mobile
npx expo start --clear
```

スマホで確認：

### バグ修正テスト
- [ ] 左スワイプ → 👎 NOPE が表示 → カードが消える
- [ ] Firebase に badFeedback が保存される

### 時間帯最適化テスト
- [ ] 朝起動 → カフェ優先
- [ ] 昼起動 → レストラン優先
- [ ] 夜起動 → 居酒屋優先

### 理由付きレコメンドテスト
- [ ] 「あなたはラーメン好き（◎回）」と表示
- [ ] 「⭐4.5 (150件)」と表示
- [ ] 「営業中 ✅」等が表示

### 80/20 冒険テスト
- [ ] ラーメン好きなら、ラーメン 8 + カフェ 2
- [ ] 推薦が多様になっている

---

## チェックリスト（完了確認）

### バグ修正
- [ ] 左スワイプが機能する
- [ ] Firebase に badFeedback が保存される
- [ ] カードがきれいに消える

### Phase 2 機能
- [ ] 時間帯に応じてカテゴリが変わる
- [ ] 理由が表示される
- [ ] 推薦が多様化している（80/20）
- [ ] すべてエラーなし

---

## 注意事項

1. **バグ修正を最優先**（Phase 2 の前に完了させること）
2. **Firebase スキーマは既に存在**（新規作成不要）
3. **Animated.timing() を使用**（spring よりも確実）
4. **各機能をテストしながら実装**（順番が重要）

---

## 承認ライン

上記の修正 + Phase 2 機能で OK ですか？

修正・追加する部分があれば教えてください！
