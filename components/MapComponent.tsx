'use client';

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';
import { haversineMeters, formatDistance } from '@/lib/distance';

interface PlaceReview {
  author_name: string;
  rating: number;
  text: string;
  relative_time_description: string;
}

interface Place {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  geometry: {
    location: {
      lat: (() => number) | number;
      lng: (() => number) | number;
    };
  };
  types?: string[];
  photos?: any[];
  opening_hours?: any;
  formatted_address?: string;
  formatted_phone_number?: string;
  price_level?: number;
  business_status?: string;
  reviews?: PlaceReview[];
}

interface MapComponentProps {
  userLocation: { lat: number; lng: number };
  userLikes: any[];
  recommendations: Place[];
  onLikePlace: (place: Place) => void;
  selectPlaceCallbackRef?: React.MutableRefObject<((place: Place) => void) | null>;
  closeInfoWindowRef?: React.MutableRefObject<(() => void) | null>;
}

const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "AIzaSyDrktr_jQnSRjEwI0gVNXJ9VHRdGWFgJXY";

const mapContainerStyle = { width: '100%', height: '600px', minHeight: '400px' };

const PRICE_DISPLAY: Record<number, string> = {
  1: '💰 安い',
  2: '💰💰 中程度',
  3: '💰💰💰 高め',
  4: '💰💰💰💰 非常に高い',
};

function getLatLng(val: (() => number) | number): number {
  return typeof val === 'function' ? val() : val;
}

function getPhotoUrl(place: Place): string | null {
  const photo = place.photos?.[0];
  if (!photo) return null;
  if (typeof photo.getUrl === 'function') return photo.getUrl({ maxWidth: 400 });
  if (photo.photo_reference) {
    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photo.photo_reference}&key=${MAPS_API_KEY}`;
  }
  return null;
}

function getOpeningStatus(place: Place) {
  try {
    const hours = place.opening_hours;
    if (!hours) return null;
    const isOpen = typeof hours.isOpen === 'function' ? hours.isOpen() : hours.open_now;
    if (isOpen === undefined || isOpen === null) return null;
    return isOpen
      ? { status: '🟢 現在営業中', color: 'text-green-600' }
      : { status: '🔴 現在閉業中', color: 'text-red-600' };
  } catch {
    return null;
  }
}

function getTodayOpeningHours(place: Place): string | null {
  try {
    const weekdayText = place.opening_hours?.weekday_text;
    if (!weekdayText?.length) return null;
    const idx = (new Date().getDay() + 6) % 7; // 0=Mon..6=Sun
    return weekdayText[idx] ?? null;
  } catch {
    return null;
  }
}

export default function MapComponent({
  userLocation,
  userLikes,
  recommendations,
  onLikePlace,
  selectPlaceCallbackRef,
  closeInfoWindowRef,
}: MapComponentProps) {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const handleMarkerClick = async (place: Place) => {
    setDetailsLoading(true);
    setSelectedPlace(place);
    try {
      const res = await axios.get('/api/place-details', {
        params: { place_id: place.place_id },
      });
      setSelectedPlace({ ...place, ...res.data, geometry: place.geometry });
    } catch (err) {
      console.error('Place Details 取得エラー:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (selectPlaceCallbackRef) selectPlaceCallbackRef.current = handleMarkerClick;
    if (closeInfoWindowRef) closeInfoWindowRef.current = () => setSelectedPlace(null);
  });

  const selectedLat = selectedPlace ? getLatLng(selectedPlace.geometry.location.lat) : 0;
  const selectedLng = selectedPlace ? getLatLng(selectedPlace.geometry.location.lng) : 0;
  const distanceToSelected = selectedPlace
    ? haversineMeters(userLocation.lat, userLocation.lng, selectedLat, selectedLng)
    : null;

  return (
    <LoadScript
      googleMapsApiKey={MAPS_API_KEY}
      onError={() => alert('Google Maps APIの読み込みに失敗しました')}
    >
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={userLocation}
        zoom={14}
        options={{ styles: [{ featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] }] }}
      >
        {/* 現在地 */}
        <Marker
          position={userLocation}
          title="あなたの現在地"
          icon={{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="12" fill="%234285F4"/%3E%3C/svg%3E' }}
        />

        {/* いいね済み（青） */}
        {userLikes.map((like) => (
          <Marker
            key={like.placeId}
            position={{ lat: like.location.latitude ?? like.location.lat, lng: like.location.longitude ?? like.location.lng }}
            title={like.placeName}
            icon={{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"%3E%3Cpath d="M16 0C9.4 0 4 5.4 4 12c0 8 12 28 12 28s12-20 12-28c0-6.6-5.4-12-12-12z" fill="%234285F4"/%3E%3C/svg%3E' }}
          />
        ))}

        {/* 推薦（赤） */}
        {recommendations.map((rec) => (
          <Marker
            key={rec.place_id}
            position={{ lat: getLatLng(rec.geometry.location.lat), lng: getLatLng(rec.geometry.location.lng) }}
            title={rec.name}
            onClick={() => handleMarkerClick(rec)}
            icon={{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"%3E%3Cpath d="M16 0C9.4 0 4 5.4 4 12c0 8 12 28 12 28s12-20 12-28c0-6.6-5.4-12-12-12z" fill="%23EA4335"/%3E%3C/svg%3E' }}
          />
        ))}

        {/* InfoWindow */}
        {selectedPlace && (
          <InfoWindow
            position={{ lat: selectedLat, lng: selectedLng }}
            onCloseClick={() => setSelectedPlace(null)}
          >
            <div className="w-80 bg-white rounded-lg shadow-lg overflow-hidden">
              {/* 写真 */}
              {getPhotoUrl(selectedPlace) ? (
                <img src={getPhotoUrl(selectedPlace)!} alt={selectedPlace.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gray-100 flex flex-col items-center justify-center text-gray-400">
                  <span className="text-4xl mb-1">🏪</span>
                  <span className="text-xs">写真なし</span>
                </div>
              )}

              <div className="p-3">
                <h3 className="font-bold text-base mb-2">{selectedPlace.name}</h3>

                {detailsLoading && (
                  <p className="text-xs text-gray-400 mb-2 animate-pulse">詳細情報を読み込み中...</p>
                )}

                {/* 距離 */}
                {distanceToSelected !== null && (
                  <p className="text-xs text-blue-600 font-semibold mb-1">
                    📍 {formatDistance(distanceToSelected)}
                  </p>
                )}

                {/* 営業状況 */}
                {getOpeningStatus(selectedPlace) && (
                  <p className={`text-sm font-semibold mb-1 ${getOpeningStatus(selectedPlace)!.color}`}>
                    {getOpeningStatus(selectedPlace)!.status}
                  </p>
                )}

                {/* 今日の営業時間 */}
                {getTodayOpeningHours(selectedPlace) && (
                  <p className="text-xs text-gray-700 mb-2">🕐 {getTodayOpeningHours(selectedPlace)}</p>
                )}

                {/* 評価 */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-bold">
                    ⭐ {selectedPlace.rating ? selectedPlace.rating.toFixed(1) : 'N/A'}
                  </span>
                  {selectedPlace.user_ratings_total && (
                    <span className="text-xs text-gray-600">({selectedPlace.user_ratings_total} 件)</span>
                  )}
                </div>

                {/* 価格帯 */}
                {selectedPlace.price_level && (
                  <p className="text-sm mb-2">{PRICE_DISPLAY[selectedPlace.price_level] ?? '価格情報なし'}</p>
                )}

                {/* 住所 */}
                {selectedPlace.formatted_address && (
                  <p className="text-xs text-gray-600 mb-1 truncate">📍 {selectedPlace.formatted_address}</p>
                )}

                {/* 電話番号 */}
                {selectedPlace.formatted_phone_number && (
                  <p className="text-xs text-gray-600 mb-2">📞 {selectedPlace.formatted_phone_number}</p>
                )}

                {/* Google Maps リンク */}
                <a
                  href={`https://www.google.com/maps/search/${encodeURIComponent(selectedPlace.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline mb-3 block"
                >
                  🗺️ Google Maps で見る
                </a>

                {/* レビュー */}
                {selectedPlace.reviews && selectedPlace.reviews.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-500 mb-1">💬 クチコミ</p>
                    <div className="space-y-2">
                      {selectedPlace.reviews.slice(0, 3).map((review, i) => (
                        <div key={i} className="bg-gray-50 rounded p-2 text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold truncate max-w-[120px]">{review.author_name}</span>
                            <span className="text-yellow-500 shrink-0">
                              {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                            </span>
                          </div>
                          <p className="text-gray-600 line-clamp-2">{review.text}</p>
                          <p className="text-gray-400 mt-1">{review.relative_time_description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* いいねボタン */}
                <button
                  onClick={() => onLikePlace(selectedPlace)}
                  className="w-full px-3 py-2 bg-green-500 text-white rounded text-sm font-semibold hover:bg-green-600 transition"
                >
                  ❤️ いいねする
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
}
