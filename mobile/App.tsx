import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User,
} from 'firebase/auth';
import { auth } from './lib/firebase';
import HomeScreen from './screens/HomeScreen';

export default function App() {
  const [user, setUser]             = useState<User | null>(null);
  const [appLoading, setAppLoading] = useState(true);
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [isSignUp, setIsSignUp]     = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAppLoading(false);
    });
    return () => unsub();
  }, []);

  const handleAuth = async () => {
    if (!email.trim() || !password) {
      Alert.alert('入力エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }
    setAuthLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found':        'ユーザーが見つかりません',
        'auth/wrong-password':        'パスワードが間違っています',
        'auth/invalid-credential':    'メールまたはパスワードが正しくありません',
        'auth/email-already-in-use':  'このメールは既に使用されています',
        'auth/weak-password':         'パスワードは6文字以上にしてください',
        'auth/invalid-email':         'メールアドレスの形式が正しくありません',
      };
      Alert.alert('エラー', msg[e.code] ?? 'ログインに失敗しました');
    } finally {
      setAuthLoading(false);
    }
  };

  // ── スプラッシュ ───────────────────────
  if (appLoading) {
    return (
      <View style={s.center}>
        <Text style={s.splashIcon}>🗺️</Text>
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 16 }} />
        <StatusBar style="dark" />
      </View>
    );
  }

  // ── ログイン済み ──────────────────────
  if (user) {
    return (
      <>
        <HomeScreen />
        <StatusBar style="dark" />
      </>
    );
  }

  // ── ログイン画面 ──────────────────────
  return (
    <KeyboardAvoidingView
      style={s.authRoot}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.authScroll} keyboardShouldPersistTaps="handled">
        <Text style={s.appIcon}>🗺️</Text>
        <Text style={s.appName}>スポット推薦</Text>
        <Text style={s.appDesc}>あなたの好みを学習して{'\n'}新しいスポットを発見しよう</Text>

        {/* メール/パスワード入力 */}
        <View style={s.form}>
          <Text style={s.formLabel}>メールアドレス</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />

          <Text style={s.formLabel}>パスワード</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="6文字以上"
            secureTextEntry
          />

          <TouchableOpacity
            style={[s.authBtn, authLoading && s.authBtnDisabled]}
            onPress={handleAuth}
            disabled={authLoading}
          >
            {authLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.authBtnTxt}>{isSignUp ? '🔐 新規登録' : '🔐 ログイン'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={s.switchBtn}>
            <Text style={s.switchTxt}>
              {isSignUp ? '→ すでにアカウントをお持ちの方' : '→ 新規登録はこちら'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={s.note}>
          ※ Firebase Console の Authentication で{'\n'}Email/Password を有効にしてください
        </Text>
      </ScrollView>
      <StatusBar style="dark" />
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  center: { flex: 1, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  splashIcon: { fontSize: 64 },

  authRoot: { flex: 1, backgroundColor: '#eff6ff' },
  authScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  appIcon: { fontSize: 64, marginBottom: 8 },
  appName: { fontSize: 28, fontWeight: '800', marginBottom: 8, color: '#1e3a5f' },
  appDesc: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22, marginBottom: 32 },

  form: { width: '100%', maxWidth: 360 },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, marginBottom: 14,
  },
  authBtn: {
    backgroundColor: '#3b82f6', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginTop: 4,
  },
  authBtnDisabled: { opacity: 0.6 },
  authBtnTxt: { fontSize: 15, fontWeight: '700', color: '#fff' },
  switchBtn: { alignItems: 'center', marginTop: 14 },
  switchTxt: { fontSize: 13, color: '#3b82f6' },

  note: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 32, lineHeight: 18 },
});
