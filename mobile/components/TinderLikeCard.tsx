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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { photoUrl } from '../lib/places';

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
  const position   = useRef(new Animated.ValueXY()).current;
  const rotation   = useRef(new Animated.Value(0)).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;
  const [isAnimating, setIsAnimating] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => !isAnimating,
    onMoveShouldSetPanResponder:  () => !isAnimating,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });

      const angle = (gesture.dx / SCREEN_WIDTH) * 15;
      rotation.setValue(angle);

      if (gesture.dx > 0) {
        likeOpacity.setValue(Math.min(gesture.dx / SWIPE_THRESHOLD, 1));
        nopeOpacity.setValue(0);
      } else {
        nopeOpacity.setValue(Math.min(-gesture.dx / SWIPE_THRESHOLD, 1));
        likeOpacity.setValue(0);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      const isSwipeRight = gesture.dx >  SWIPE_THRESHOLD || gesture.vx >  0.7;
      const isSwipeLeft  = gesture.dx < -SWIPE_THRESHOLD || gesture.vx < -0.7;

      if (isSwipeRight) {
        setIsAnimating(true);
        Animated.parallel([
          Animated.timing(position.x, { toValue: SCREEN_WIDTH * 1.5, duration: 400, useNativeDriver: false }),
          Animated.timing(rotation,   { toValue: 30, duration: 400, useNativeDriver: false }),
          Animated.timing(likeOpacity,{ toValue: 1,  duration: 200, useNativeDriver: false }),
        ]).start(() => { onLike(); resetCard(); });

      } else if (isSwipeLeft) {
        setIsAnimating(true);
        Animated.parallel([
          Animated.timing(position.x, { toValue: -SCREEN_WIDTH * 1.5, duration: 400, useNativeDriver: false }),
          Animated.timing(rotation,   { toValue: -30, duration: 400, useNativeDriver: false }),
          Animated.timing(nopeOpacity,{ toValue: 1,   duration: 200, useNativeDriver: false }),
        ]).start(() => { onDislike(); resetCard(); });

      } else {
        Animated.spring(position, { toValue: { x: 0, y: 0 }, tension: 40, friction: 8, useNativeDriver: false }).start();
        Animated.spring(rotation, { toValue: 0, tension: 40, friction: 8, useNativeDriver: false }).start();
        likeOpacity.setValue(0);
        nopeOpacity.setValue(0);
      }
    },
  });

  const resetCard = () => {
    position.setValue({ x: 0, y: 0 });
    rotation.setValue(0);
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
    transform: [{ rotate: rotateInterpolate }],
  };

  const ref = place.photos?.[0]?.photo_reference ?? null;
  const imageUrl = ref ? photoUrl(ref, 400) : null;

  return (
    <View style={styles.container}>
      {/* カウンター */}
      <View style={styles.counter}>
        <Text style={styles.counterText}>{cardIndex + 1} / {totalCards}</Text>
      </View>

      {/* カード */}
      <Animated.View style={[styles.card, cardStyle]} {...panResponder.panHandlers}>

        {/* LIKE スタンプ */}
        <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}>
          <Text style={styles.stampIcon}>❤️</Text>
          <Text style={[styles.stampLabel, { color: '#FF6B6B' }]}>LIKE</Text>
        </Animated.View>

        {/* NOPE スタンプ */}
        <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}>
          <Text style={styles.stampIcon}>👎</Text>
          <Text style={[styles.stampLabel, { color: '#999' }]}>NOPE</Text>
        </Animated.View>

        {/* 写真 */}
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={[styles.image, styles.noImage]}>
            <Text style={styles.noImageText}>📍</Text>
          </View>
        )}

        {/* Spotify 風グラデーション */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.85)']}
          style={styles.gradient}
        />

        {/* 情報（グラデーション上） */}
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{place.name}</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.rating}>⭐ {place.rating?.toFixed(1) ?? 'N/A'}</Text>
            {!!place.user_ratings_total && (
              <Text style={styles.reviewCount}>({place.user_ratings_total})</Text>
            )}
          </View>
          {place.types?.[0] && (
            <Text style={styles.category}>{place.types[0]}</Text>
          )}
          {/* 推薦理由 */}
          {reason && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonText}>💡 {reason.userPreference}</Text>
              <Text style={styles.reasonText}>⭐ {reason.spotQuality}</Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* ボタン */}
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.nope} onPress={onDislike} disabled={isAnimating}>
          <Text style={styles.btnIcon}>👎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.like} onPress={onLike} disabled={isAnimating}>
          <Text style={styles.btnIcon}>❤️</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>← スワイプで選択 →</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: '#f8f8f8',
    justifyContent: 'flex-start', alignItems: 'center', paddingTop: 12,
  },
  counter: { marginBottom: 12 },
  counterText: { fontSize: 14, color: '#999', fontWeight: '600' },
  card: {
    width: SCREEN_WIDTH - 32,
    height: SCREEN_HEIGHT * 0.62,
    borderRadius: 20, overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15, shadowRadius: 12, elevation: 8,
  },
  image: { width: '100%', height: '100%', resizeMode: 'cover' },
  noImage: { backgroundColor: '#f5f5f5', justifyContent: 'center', alignItems: 'center' },
  noImageText: { fontSize: 60 },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 200,
  },
  stamp: {
    position: 'absolute', top: '22%',
    width: 100, height: 100,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 4, borderRadius: 12, zIndex: 10,
  },
  likeStamp: { left: 20, borderColor: '#FF6B6B', transform: [{ rotate: '-15deg' }] },
  nopeStamp: { right: 20, borderColor: '#999',  transform: [{ rotate: '15deg'  }] },
  stampIcon:  { fontSize: 40, marginBottom: 4 },
  stampLabel: { fontSize: 16, fontWeight: '700' },
  info: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 20, paddingVertical: 16,
  },
  name: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  rating:      { fontSize: 15, color: '#FFD700', fontWeight: '600' },
  reviewCount: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  category:    { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 6 },
  reasonBox:   { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 8, padding: 8, marginTop: 4 },
  reasonText:  { fontSize: 11, color: 'rgba(255,255,255,0.9)', lineHeight: 16 },
  buttons: {
    flexDirection: 'row', gap: 40,
    marginTop: 20, marginBottom: 12, paddingHorizontal: 60,
  },
  nope: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: '#999',
    justifyContent: 'center', alignItems: 'center',
  },
  like: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255,107,107,0.1)',
    justifyContent: 'center', alignItems: 'center',
  },
  btnIcon: { fontSize: 28 },
  hint: { fontSize: 12, color: '#BBB' },
});
