const API_KEY = 'AIzaSyASJWQSUIeElWC7XKFpwoQCxNxEDugEnPA';
const BASE = 'https://maps.googleapis.com/maps/api/place';

export interface PlaceResult {
  place_id: string;
  name: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  opening_hours?: { open_now?: boolean };
  photos?: Array<{ photo_reference: string }>;
  geometry: { location: { lat: number; lng: number } };
  vicinity?: string;
  distanceM?: number;
}

export interface PlaceDetails extends PlaceResult {
  formatted_address?: string;
  formatted_phone_number?: string;
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  reviews?: Array<{
    author_name: string;
    rating: number;
    text: string;
    relative_time_description: string;
  }>;
}

export async function searchNearby(lat: number, lng: number, type: string, radius = 3000): Promise<PlaceResult[]> {
  const url = `${BASE}/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&language=ja&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.results as PlaceResult[]) ?? [];
}

export async function fetchDetails(placeId: string): Promise<PlaceDetails | null> {
  const fields = 'name,rating,user_ratings_total,geometry,photos,opening_hours,formatted_address,formatted_phone_number,price_level,reviews';
  const url = `${BASE}/details/json?place_id=${placeId}&fields=${fields}&language=ja&key=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return (data.result as PlaceDetails) ?? null;
}

export function photoUrl(ref: string, maxWidth = 400): string {
  return `${BASE}/photo?maxwidth=${maxWidth}&photo_reference=${ref}&key=${API_KEY}`;
}
