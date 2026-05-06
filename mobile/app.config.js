const mapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';

module.exports = {
  expo: {
    name: 'PickSpot',
    slug: 'spot-recommender',
    scheme: 'spotrecommender',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'light',
    newArchEnabled: false,
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.spotrecommender.app',
      config: {
        googleMapsApiKey: mapsApiKey,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      package: 'com.spotrecommender.app',
      versionCode: 1,
      config: {
        googleMaps: {
          apiKey: mapsApiKey,
        },
      },
      intentFilters: [
        {
          action: 'VIEW',
          data: { scheme: 'exp' },
          category: ['BROWSABLE', 'DEFAULT'],
        },
        {
          action: 'VIEW',
          data: { scheme: 'spotrecommender' },
          category: ['BROWSABLE', 'DEFAULT'],
        },
      ],
      permissions: [
        'android.permission.ACCESS_COARSE_LOCATION',
        'android.permission.ACCESS_FINE_LOCATION',
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-web-browser',
      [
        'expo-location',
        {
          locationWhenInUsePermission: '現在地を使ってスポットを探します。',
        },
      ],
    ],
    extra: {
      googleMapsApiKey: mapsApiKey,
      eas: {
        projectId: '7b62bce2-d1af-4c6d-8a13-7e3928c1b752',
      },
    },
  },
};
