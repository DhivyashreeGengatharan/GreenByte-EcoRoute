import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'io.greenbyte.ecoroute',
  appName: 'GreenByte EcoRoute',
  webDir: 'dist',
  server: {
    url: 'https://greenbyte-ecoroute.vercel.app',
    cleartext: true,
    androidScheme: 'https'
  }
};

export default config;
