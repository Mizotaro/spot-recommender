import React, { useRef } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  Animated,
  PanResponder,
  TouchableOpacity,
} from 'react-native';
import { photoUrl } from '../lib/places';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;

interface SwipeCardProps {
  place: any;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

export default function SwipeCard({ place, onSwipeLeft, onSwipeRight }: SwipeCardProps) {
  const position = useRef(new Animated.ValueXY()).current;
  const likeOpacity = useRef(new Animated.Value(0)).current;
  const nopeOpacity = useRef(new Animated.Value(0)).current;

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gesture) => {
      position.setValue({ x: gesture.dx, y: gesture.dy });
      if (gesture.dx > 0) {
        likeOpacity.setValue(gesture.dx / SWIPE_THRESHOLD);
        nopeOpacity.setValue(0);
      } else {
        nopeOpacity.setValue(-gesture.dx / SWIPE_THRESHOLD);
        likeOpacity.setValue(0);
      }
    },
    onPanResponderRelease: (_, gesture) => {
      const threshold = SWIPE_THRESHOLD;

      if (gesture.dx > threshold) {
        Animated.timing(position.x, {
          toValue: SCREEN_WIDTH + 100,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          onSwipeRight();
          position.setValue({ x: 0, y: 0 });
          likeOpacity.setValue(0);
          nopeOpacity.setValue(0);
        });
      } else if (gesture.dx < -threshold) {
        Animated.timing(position.x, {
          toValue: -SCREEN_WIDTH - 100,
          duration: 300,
          useNativeDriver: false,
        }).start(() => {
          onSwipeLeft();
          position.setValue({ x: 0, y: 0 });
          likeOpacity.setValue(0);
          nopeOpacity.setValue(0);
        });
      } else {
        Animated.spring(position, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
        }).start();
        likeOpacity.setValue(0);
        nopeOpacity.setValue(0);
      }
    },
  });

  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
  });

  const cardStyle = {
    ...position.getLayout(),
    transform: [{ rotate }],
  };

  return (
    <Animated.View style={[styles.card, cardStyle]} {...panResponder.panHandlers}>
      {/* LIKE スタンプ */}
      <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}>
        <Text style={styles.likeText}>❤️ LIKE</Text>
      </Animated.View>

      {/* NOPE スタンプ */}
      <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}>
        <Text style={styles.nopeText}>👎 NOPE</Text>
      </Animated.View>

      {/* 写真 */}
      {place.photos?.[0]?.photo_reference ? (
        <Image
          source={{ uri: photoUrl(place.photos[0].photo_reference, 400) }}
          style={styles.image}
        />
      ) : (
        <View style={[styles.image, styles.noImage]}>
          <Text style={styles.noImageText}>📍</Text>
        </View>
      )}

      {/* 情報 */}
      <View style={styles.info}>
        <Text style={styles.name}>{place.name}</Text>
        <Text style={styles.rating}>⭐ {place.rating?.toFixed(1) || 'N/A'}</Text>
        {place.vicinity && (
          <Text style={styles.address} numberOfLines={1}>📍 {place.vicinity}</Text>
        )}
      </View>

      {/* ボタン */}
      <View style={styles.buttons}>
        <TouchableOpacity style={styles.nopeButton} onPress={onSwipeLeft}>
          <Text style={styles.nopeButtonText}>👎</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.likeButton} onPress={onSwipeRight}>
          <Text style={styles.likeButtonText}>❤️</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH - 32,
    backgroundColor: 'white',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    position: 'absolute',
    left: 16,
  },
  stamp: {
    position: 'absolute',
    top: 40,
    zIndex: 10,
    padding: 10,
    borderWidth: 4,
    borderRadius: 8,
  },
  likeStamp: {
    left: 20,
    borderColor: '#4CAF50',
    transform: [{ rotate: '-15deg' }],
  },
  nopeStamp: {
    right: 20,
    borderColor: '#f44336',
    transform: [{ rotate: '15deg' }],
  },
  likeText: { fontSize: 20, fontWeight: 'bold', color: '#4CAF50' },
  nopeText: { fontSize: 20, fontWeight: 'bold', color: '#f44336' },
  image: { width: '100%', height: 300, resizeMode: 'cover' },
  noImage: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageText: { fontSize: 60 },
  info: { padding: 16 },
  name: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  rating: { fontSize: 16, marginBottom: 4 },
  address: { fontSize: 13, color: '#888' },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    paddingTop: 8,
  },
  nopeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#f44336',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nopeButtonText: { fontSize: 28 },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  likeButtonText: { fontSize: 28 },
});
