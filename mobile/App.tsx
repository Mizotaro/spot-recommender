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

// Firebase Console → Authentication → Google → Web SDK configuration → Web client ID
// https://console.firebase.google.com/project/spot-recommender-50536/authentication/providers
const GOOGLE_WEB_CLIENT_ID = 'YOUR_WEB_CLIENT_ID.apps.googleusercontent.com';

export default function App() {
  const [user, setUser]           = useState<User | null>(null);
  const [appLoading, setAppLoading] = useState(true);

  // Google Sign-In hook（expo-auth-session v7）
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

  // Google 認証レスポンスを Firebase に渡す
  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      signInWithCredential(auth, credential).catch(() => {
        // Alert は LoginScreen 側で処理済みのため不要
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
        onGoogleLogin={() => promptAsync()}
        googleDisabled={!request}
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
