import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.e323933ae7344d0c834c75abc766f4c6',
  appName: 'yawatug',
  webDir: 'dist',
  server: {
    url: 'https://e323933a-e734-4d0c-834c-75abc766f4c6.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#0E4D92',
      showSpinner: true,
      spinnerColor: '#F9B233'
    },
    StatusBar: {
      style: 'dark',
      backgroundColor: '#0E4D92'
    }
  }
};

export default config;