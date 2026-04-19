import type { NextApiRequest, NextApiResponse } from 'next';
import axios from 'axios';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { category, lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: '位置情報が必要です' });
  }

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: {
        location: `${lat},${lng}`,
        radius: 3000,
        type: category || 'restaurant',
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
    });

    res.status(200).json(response.data.results || []);
  } catch (error) {
    console.error('Maps API Error:', error);
    res.status(500).json({ error: 'APIエラーが発生しました' });
  }
}