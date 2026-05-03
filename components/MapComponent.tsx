'use client';

import React, { useState } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from '@react-google-maps/api';

interface Place {
  place_id: string;
  name: string;
  rating?: number;
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  types?: string[];
}

interface MapComponentProps {
  userLocation: { lat: number; lng: number };
  userLikes: any[];
  recommendations: Place[];
  onLikePlace: (place: Place) => void;
}

export default function MapComponent({
  userLocation,
  userLikes,
  recommendations,
  onLikePlace,
}: MapComponentProps) {
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

 const mapContainerStyle = {
  width: '100%',
  height: '600px',
  minHeight: '400px',
};

  return (
   <LoadScript 
  googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!}
  onError={(error) => {
    console.error('Google Maps API Error:', error);
    alert('Google Maps APIの読み込みに失敗しました');
  }}
>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={userLocation}
        zoom={14}
        options={{
          styles: [
            {
              featureType: 'all',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#616161' }],
            },
          ],
        }}
      >
        {/* ユーザーの現在地 */}
        <Marker
          position={userLocation}
          title="あなたの現在地"
          icon={{
            url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"%3E%3Ccircle cx="16" cy="16" r="12" fill="%234285F4"/%3E%3C/svg%3E',
          }}
        />

        {/* いいね済みのお店（青） */}
        {userLikes.map((like) => (
          <Marker
            key={like.placeId}
            position={{
              lat: like.location.latitude || like.location.lat,
              lng: like.location.longitude || like.location.lng,
            }}
            title={like.placeName}
            icon={{
              url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"%3E%3Cpath d="M16 0C9.4 0 4 5.4 4 12c0 8 12 28 12 28s12-20 12-28c0-6.6-5.4-12-12-12z" fill="%234285F4"/%3E%3C/svg%3E',
            }}
          />
        ))}

        {/* 推薦されたお店（赤） */}
       {recommendations.map((rec) => (
  <Marker
    key={rec.place_id}
    position={{
      lat: typeof rec.geometry.location.lat === 'function' 
        ? rec.geometry.location.lat() 
        : rec.geometry.location.lat,
      lng: typeof rec.geometry.location.lng === 'function'
        ? rec.geometry.location.lng()
        : rec.geometry.location.lng,
    }}
            title={rec.name}
            onClick={() => setSelectedPlace(rec)}
            icon={{
              url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"%3E%3Cpath d="M16 0C9.4 0 4 5.4 4 12c0 8 12 28 12 28s12-20 12-28c0-6.6-5.4-12-12-12z" fill="%23EA4335"/%3E%3C/svg%3E',
            }}
          />
        ))}

        {/* 選択されたお店の詳細 */}
        {selectedPlace && (
  <InfoWindow
    position={{
      lat: typeof selectedPlace.geometry.location.lat === 'function'
        ? selectedPlace.geometry.location.lat()
        : selectedPlace.geometry.location.lat,
      lng: typeof selectedPlace.geometry.location.lng === 'function'
        ? selectedPlace.geometry.location.lng()
        : selectedPlace.geometry.location.lng,
    }}
            onCloseClick={() => setSelectedPlace(null)}
          >
            <div className="p-3 bg-white rounded-lg shadow-lg">
              <h3 className="font-bold text-base mb-2">{selectedPlace.name}</h3>
              <p className="text-sm mb-3">
                ⭐ {selectedPlace.rating ? selectedPlace.rating.toFixed(1) : 'N/A'}
              </p>
              <button
                onClick={() => {
                  onLikePlace(selectedPlace);
                  setSelectedPlace(null);
                }}
                className="w-full px-3 py-2 bg-green-500 text-white rounded text-sm font-semibold hover:bg-green-600"
              >
                いいねする
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </LoadScript>
  );
}