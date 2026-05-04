import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { place_id } = req.query;

  if (!place_id) {
    return res.status(400).json({ error: 'place_id が必要です' });
  }

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id,
        fields: 'name,rating,user_ratings_total,geometry,types,photos,opening_hours,formatted_address,formatted_phone_number,price_level,business_status,reviews',
        language: 'ja',
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    const result = response.data.result;
    if (!result) {
      return res.status(404).json({ error: 'スポットが見つかりませんでした' });
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('❌ Place Details API Error:', error);
    res.status(500).json({ error: 'APIエラーが発生しました' });
  }
}
