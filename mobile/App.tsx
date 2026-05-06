import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import {
  onAuthStateChanged,
  signInWithCredential,
  GoogleAuthProvider,
  User,
} from 'firebase/auth';
import { auth } from './lib/firebase';
import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';

WebBrowser.maybeCompleteAuthSession();

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [appLoading, setAppLoading] = useState(true);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '677494767981-qvuvf90jjl17129rq304g3itq6nfoeli.apps.googleusercontent.com',
    webClientId: '677494767981-qvuvf90jjl17129rq304g3itq6nfoeli.apps.googleusercontent.com',
    useProxy: true,
  } as any);

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential)
        .then((userCredential) => {
          setUser(userCredential.user);
          console.log('ログイン成功:', userCredential.user.email);
        })
        .catch((error) => {
          console.error('Firebase ログインエラー:', error);
        });
    }
  }, [response]);

  // Firebase 認証状態の監視
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAppLoading(false);
    });
    return () => unsub();
  }, []);

  const handleGoogleSignIn = async () => {
    await promptAsync();
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
    <>
      <LoginScreen
        onGoogleLogin={handleGoogleSignIn}
        onGuestLogin={() => setUser({ uid: 'guest', email: 'guest@demo.com', displayName: 'ゲスト' } as any)}
      />
      <StatusBar style="dark" />
    </>
  );
}

const s = StyleSheet.create({
  center: {
    flex: 1, backgroundColor: '#eff6ff',
    alignItems: 'center', justifyContent: 'center',
  },
  splashIcon: { fontSize: 64 },
});
