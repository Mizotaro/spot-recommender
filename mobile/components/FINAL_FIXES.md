# 最終修正指示書
## スワイプ機能 + 日本語化 + Google ログイン実装

---

## 優先度順

```
【優先1】Googleログイン実装（30分）
  → これがないと何も始まらない

【優先2】スワイプ機能バグ修正（20分）
  → 左スワイプの完全修正

【優先3】日本語化（15分）
  → API言語設定を日本語に
```

合計：65分（約1時間）

---

## 修正1：Google ログイン実装（30分）

### 現在の状態確認

mobile/App.tsx でFirebase認証が実装されているか確認：

```typescript
// 確認する部分
import { 
  GoogleAuthProvider, 
  signInWithCredential 
} from 'firebase/auth';
```

### 修正：Google ログイン完全実装

**ファイル：** `mobile/App.tsx`

**Step 1：Import を追加**

```typescript
// 既存の import に追加
import { 
  getAuth, 
  signInWithCredential, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import * as Google from 'expo-google-app-auth';
```

**Step 2：Google認証関数を追加**

```typescript
// App.tsx の冒頭に追加
const auth = getAuth(firebase);
const GOOGLE_CLIENT_ID = '677494767981-o1d2v3e4f5g6h7i8j9k0l1m2n3o4p5q6.apps.googleusercontent.com';
// ↑ Firebase Console から取得したクライアントID

// Google ログイン関数
const handleGoogleSignIn = async () => {
  try {
    const result = await Google.logInAsync({
      iosClientId: GOOGLE_CLIENT_ID,
      androidClientId: GOOGLE_CLIENT_ID,
      scopes: ['profile', 'email'],
    });

    if (result.type === 'success') {
      const { idToken, accessToken } = result;
      const credential = GoogleAuthProvider.credential(idToken, accessToken);
      
      const userCredential = await signInWithCredential(auth, credential);
      console.log('ログイン成功:', userCredential.user.email);
      setUser(userCredential.user);
      
    } else {
      console.log('ログインキャンセル');
    }
  } catch (error) {
    console.error('Google ログインエラー:', error);
    alert('ログインに失敗しました');
  }
};

// ログアウト関数
const handleLogout = async () => {
  try {
    await signOut(auth);
    setUser(null);
    console.log('ログアウト完了');
  } catch (error) {
    console.error('ログアウトエラー:', error);
  }
};

// 起動時に認証状態をチェック
useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
    if (currentUser) {
      setUser(currentUser);
    } else {
      setUser(null);
    }
  });

  return unsubscribe;
}, []);
```

**Step 3：ログイン画面を実装**

App.tsx の render 部分：

```typescript
return (
  <NavigationContainer>
    {user ? (
      // ログイン後：メイン画面
      <Tab.Navigator>
        <Tab.Screen 
          name="地図" 
          component={MapScreen}
          options={{
            tabBarLabel: '地図',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🗺️</Text>,
          }}
        />
        <Tab.Screen 
          name="発見" 
          component={DiscoveryScreen}
          options={{
            tabBarLabel: '発見',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔍</Text>,
          }}
        />
        <Tab.Screen 
          name="いいね" 
          component={LikesScreen}
          options={{
            tabBarLabel: 'いいね',
            tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>❤️</Text>,
            headerRight: () => (
              <TouchableOpacity
                style={{ marginRight: 16 }}
                onPress={handleLogout}
              >
                <Text style={{ fontSize: 16, color: '#f44336' }}>ログアウト</Text>
              </TouchableOpacity>
            ),
          }}
        />
      </Tab.Navigator>
    ) : (
      // ログイン前：ログイン画面
      <LoginScreen onLogin={handleGoogleSignIn} />
    )}
  </NavigationContainer>
);
```

**Step 4：ログイン画面コンポーネント作成**

**ファイル：** `mobile/screens/LoginScreen.tsx`（新規作成）

```typescript
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';

interface LoginScreenProps {
  onLogin: () => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const { width, height } = Dimensions.get('window');

  return (
    <View style={styles.container}>
      {/* ロゴ */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>🗺️</Text>
        <Text style={styles.appName}>スポット推薦</Text>
        <Text style={styles.subtitle}>Google Maps周辺のスポットを発見</Text>
      </View>

      {/* 説明文 */}
      <View style={styles.descriptionContainer}>
        <Text style={styles.descriptionTitle}>何ができるの？</Text>
        <Text style={styles.descriptionText}>• 💡 AI推薦スポット</Text>
        <Text style={styles.descriptionText}>• 🎭 気分で選べる</Text>
        <Text style={styles.descriptionText}>• ❤️ いいね保存</Text>
      </View>

      {/* ログインボタン */}
      <TouchableOpacity style={styles.googleButton} onPress={onLogin}>
        <Text style={styles.googleIcon}>🔐</Text>
        <Text style={styles.googleButtonText}>Google でログイン</Text>
      </TouchableOpacity>

      {/* 注記 */}
      <Text style={styles.note}>
        GoogleアカウントでGoogle Maps情報にアクセスします
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    justifyContent: 'space-between',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 80,
    marginBottom: 20,
  },
  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  descriptionContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 40,
  },
  descriptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  googleButton: {
    backgroundColor: '#4285F4',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 20,
  },
  googleIcon: {
    fontSize: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
});
```

---

## 修正2：スワイプ機能バグ修正（20分）

### 問題の詳細

左スワイプが機能していない理由は、`Animated.timing()` のコールバック処理にあります。

### 完全修正コード

**ファイル：** `mobile/components/TinderLikeCard.tsx`

**問題部分の完全修正：**

```typescript
// ❌ 現在の問題のある部分
onPanResponderRelease: (_, gesture) => {
  const dx = gesture.dx;
  const vx = gesture.vx;

  const isSwipeRight = dx > SWIPE_THRESHOLD || vx > 0.7;
  const isSwipeLeft = dx < -SWIPE_THRESHOLD || vx < -0.7;

  if (isSwipeRight) {
    // 右スワイプは動作している
    Animated.parallel([...]).start(() => {
      onLike();
      resetCard();
    });
  } else if (isSwipeLeft) {
    // 左スワイプが動作していない
    Animated.parallel([...]).start(() => {
      onDislike(); // ← ここが実行されていない
      resetCard();
    });
  }
}

// ✅ 修正後
onPanResponderRelease: (_, gesture) => {
  const dx = gesture.dx;
  const vx = gesture.vx;

  // スワイプ判定をより寛容に
  const SWIPE_DISTANCE = SCREEN_WIDTH * 0.3;
  const SWIPE_VELOCITY = 0.5;

  const isSwipeRight = dx > SWIPE_DISTANCE || vx > SWIPE_VELOCITY;
  const isSwipeLeft = dx < -SWIPE_DISTANCE || vx < -SWIPE_VELOCITY;

  if (isSwipeRight) {
    setIsAnimating(true);
    Animated.parallel([
      Animated.timing(position.x, {
        toValue: SCREEN_WIDTH * 2,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(rotation, {
        toValue: 30,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start(() => {
      console.log('Right swipe - calling onLike');
      onLike();
      resetCard();
      setIsAnimating(false);
    });
  } 
  else if (isSwipeLeft) {
    setIsAnimating(true);
    Animated.parallel([
      Animated.timing(position.x, {
        toValue: -SCREEN_WIDTH * 2,
        duration: 400,
        useNativeDriver: false,
      }),
      Animated.timing(rotation, {
        toValue: -30,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start(() => {
      console.log('Left swipe - calling onDislike'); // ← デバッグログ
      onDislike(); // ← ここが確実に実行される
      resetCard();
      setIsAnimating(false);
    });
  } 
  else {
    // スワイプ不十分：元に戻す
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start(() => {
      setIsAnimating(false);
    });
    Animated.spring(rotation, {
      toValue: 0,
      tension: 40,
      friction: 8,
      useNativeDriver: false,
    }).start();
  }
};
```

### デバッグ確認

修正後、コンソールで以下を確認：

```
[Expo] Left swipe - calling onDislike
```

このログが出たら左スワイプが正常に動作しています。

---

## 修正3：日本語化（15分）

### 修正内容

Google Places API の言語設定を日本語に変更

### ファイル修正

**ファイル：** `pages/api/search-places.ts`（Web版）

```typescript
// ❌ 現在
const response = await client.placesNearby({
  location: { lat: Number(lat), lng: Number(lng) },
  radius: Number(radius) || 3000,
  type: category,
});

// ✅ 修正後（日本語化）
const response = await client.placesNearby({
  location: { lat: Number(lat), lng: Number(lng) },
  radius: Number(radius) || 3000,
  type: category,
  language: 'ja', // ← 日本語設定を追加
});
```

**ファイル：** `mobile/screens/DiscoveryScreen.tsx`（モバイル版）

推薦スポット取得時に日本語化：

```typescript
// API呼び出し部分を修正
const response = await axios.get('/api/search-places', {
  params: {
    category: targetCategory,
    lat: location.lat,
    lng: location.lng,
    radius: radius,
    language: 'ja', // ← 日本語パラメータを追加
  },
});
```

**ファイル：** `lib/firebase.ts`（Firebase側設定）

```typescript
// Firestore の言語設定も日本語に
import { initializeFirestore } from 'firebase/firestore';

const db = initializeFirestore(firebase, {
  // 言語設定
  localCache: {
    kind: 'persistent',
    // タイムスタンプとテキストは自動的に日本語で保存される
  },
});
```

### 確認方法

修正後、アプリを起動して：

```
❌ Before: "Ramen Restaurant"
✅ After: "ラーメン屋"

❌ Before: "Italian Restaurant"  
✅ After: "イタリアンレストラン"
```

と日本語で表示されることを確認

---

## 実装チェックリスト

### Google ログイン
- [ ] LoginScreen.tsx が作成される
- [ ] GoogleAuthProvider が正しく設定
- [ ] ログイン後、メイン画面が表示
- [ ] ログアウトボタンが機能
- [ ] 起動時に認証状態が保存される

### スワイプ機能
- [ ] 左スワイプでカードが左に飛ぶ
- [ ] 左スワイプで onDislike() が実行される
- [ ] コンソールに「Left swipe - calling onDislike」ログ出現
- [ ] Firebase に badFeedback が保存される
- [ ] スタンプ（👎）が表示される

### 日本語化
- [ ] 店名が日本語で表示
- [ ] カテゴリが日本語で表示
- [ ] 説明文が日本語で表示
- [ ] エラーメッセージが日本語

---

## Claude Code 実装指示

```
以下3つの修正を実装してください。

【修正1】Google ログイン実装（30分）
- mobile/screens/LoginScreen.tsx（新規作成）
- mobile/App.tsx（修正）
  - Google認証関数追加
  - ログイン画面の表示
  - 認証状態の管理

【修正2】スワイプ機能バグ修正（20分）
- mobile/components/TinderLikeCard.tsx（修正）
  - onPanResponderRelease 完全修正
  - isSwipeLeft 判定の強化
  - デバッグログ追加

【修正3】日本語化（15分）
- pages/api/search-places.ts（修正）
  - language: 'ja' を追加
- mobile/screens/DiscoveryScreen.tsx（修正）
  - API呼び出しに language: 'ja' を追加

実装後、以下をテストしてください：

✅ ログイン画面でGoogleログインが表示
✅ Googleでログイン可能
✅ ログイン後、メイン画面表示
✅ 左スワイプで正常に次のカードに移動
✅ 店名が日本語で表示
✅ Firebase に正常にデータ保存

修正後、git push してください。
```

---

## 予想される完成状態

```
ビジュアル：
┌─────────────────┐
│  Google ログイン  │ ← ユーザーが最初に見る
└─────────────────┘
         ↓
┌─────────────────┐
│  [スポット写真]   │
│  ラーメン屋       │ ← 日本語表示
│  ⭐ 4.5          │
│                 │
│ 👎      ❤️      │ ← ボタン
└─────────────────┘

動作：
- 左スワイプ → カード左に飛ぶ → 次のスポット表示 ✅
- 右スワイプ → カード右に飛ぶ → いいね保存 ✅
- 日本語表示 ✅
- Google ログイン ✅

Play Store 対応レベル完成！
```

---

## 完了後

```bash
git add .
git commit -m "Final: Google login, fix swipe bug, add Japanese localization"
git push origin main
```

その後、「✅ 完了！」と報告してください！
