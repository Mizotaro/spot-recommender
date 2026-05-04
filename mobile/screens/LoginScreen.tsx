import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import { auth } from '../lib/firebase';

interface LoginScreenProps {
  onGoogleLogin: () => void;
  googleDisabled?: boolean;
}

export default function LoginScreen({ onGoogleLogin, googleDisabled }: LoginScreenProps) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleEmailAuth = async () => {
    if (!email.trim() || !password) {
      Alert.alert('入力エラー', 'メールアドレスとパスワードを入力してください');
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e: any) {
      const msg: Record<string, string> = {
        'auth/user-not-found':       'ユーザーが見つかりません',
        'auth/wrong-password':       'パスワードが間違っています',
        'auth/invalid-credential':   'メールまたはパスワードが正しくありません',
        'auth/email-already-in-use': 'このメールは既に使用されています',
        'auth/weak-password':        'パスワードは6文字以上にしてください',
        'auth/invalid-email':        'メールアドレスの形式が正しくありません',
      };
      Alert.alert('エラー', msg[e.code] ?? 'ログインに失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ロゴ */}
        <View style={s.logoArea}>
          <Text style={s.logo}>🗺️</Text>
          <Text style={s.appName}>スポット推薦</Text>
          <Text style={s.subtitle}>あなたの好みを学習して{'\n'}新しいスポットを発見しよう</Text>
        </View>

        {/* 機能説明 */}
        <View style={s.desc}>
          <Text style={s.descTitle}>できること</Text>
          <Text style={s.descItem}>💡 AI推薦スポット</Text>
          <Text style={s.descItem}>🎭 気分で選べる</Text>
          <Text style={s.descItem}>❤️ いいね保存</Text>
        </View>

        {/* Google ログイン */}
        <TouchableOpacity
          style={[s.googleBtn, googleDisabled && s.googleBtnDisabled]}
          onPress={onGoogleLogin}
          disabled={googleDisabled}
        >
          <Text style={s.googleIcon}>🔐</Text>
          <Text style={s.googleBtnText}>Google でログイン</Text>
        </TouchableOpacity>

        {/* 区切り */}
        <View style={s.divider}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>または</Text>
          <View style={s.dividerLine} />
        </View>

        {/* メール/パスワード */}
        <View style={s.form}>
          <Text style={s.label}>メールアドレス</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoCorrect={false}
          />
          <Text style={s.label}>パスワード</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="6文字以上"
            secureTextEntry
          />
          <TouchableOpacity
            style={[s.emailBtn, loading && s.emailBtnDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={s.emailBtnText}>{isSignUp ? '新規登録' : 'ログイン'}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={s.switchBtn}>
            <Text style={s.switchText}>
              {isSignUp ? '→ すでにアカウントをお持ちの方' : '→ 新規登録はこちら'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={s.note}>
          ※ Firebase Console の Authentication で{'\n'}Email/Password と Google を有効にしてください
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: '#eff6ff' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },

  logoArea: { alignItems: 'center', marginBottom: 24 },
  logo:     { fontSize: 72, marginBottom: 8 },
  appName:  { fontSize: 28, fontWeight: '800', color: '#1e3a5f', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#6b7280', textAlign: 'center', lineHeight: 22 },

  desc: {
    width: '100%', maxWidth: 360,
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 20,
  },
  descTitle: { fontSize: 15, fontWeight: '600', color: '#374151', marginBottom: 10 },
  descItem:  { fontSize: 14, color: '#4b5563', marginBottom: 6, lineHeight: 20 },

  googleBtn: {
    width: '100%', maxWidth: 360,
    backgroundColor: '#4285F4', borderRadius: 12,
    paddingVertical: 15, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 4,
    marginBottom: 20,
  },
  googleBtnDisabled: { opacity: 0.5 },
  googleIcon:    { fontSize: 20 },
  googleBtnText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  divider: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', maxWidth: 360, marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#d1d5db' },
  dividerText: { marginHorizontal: 12, fontSize: 13, color: '#9ca3af' },

  form:  { width: '100%', maxWidth: 360 },
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 4 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11,
    fontSize: 14, marginBottom: 14,
  },
  emailBtn: {
    backgroundColor: '#3b82f6', borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginTop: 4,
  },
  emailBtnDisabled: { opacity: 0.6 },
  emailBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  switchBtn:    { alignItems: 'center', marginTop: 14 },
  switchText:   { fontSize: 13, color: '#3b82f6' },

  note: { fontSize: 11, color: '#9ca3af', textAlign: 'center', marginTop: 24, lineHeight: 18 },
});
