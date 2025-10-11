export const Config = {
  // Application Settings
  APP_TITLE: 'CLM Self-Assessment',
  APP_SUBTITLE: 'Enterprise Contract Lifecycle Management Maturity Assessment',
  LOGO_URL: 'https://www.agiloft.com/wp-content/themes/agiloft/assets/build/images/site-logo.svg',
  LOGO_URL_LIGHT: '/images/agiloft-logo-light.svg',
  LOGO_URL_DARK: '/images/agiloft-logo-dark.png',
  LOGO_URL_LARGE: 'https://higherlogicdownload.s3.amazonaws.com/AGILOFT/46412d73-e4f2-4abc-83be-9887a0cf006a/UploadedImages/Agiloft_Signature_Rev_Color_RGB.png',

  // Survey Configuration
  AUTO_SAVE_DEFAULT: true,
  SESSION_TIMEOUT_HOURS: 24,
  MAX_SESSIONS_PER_USER: 10,

  // Progress Settings
  MIN_COMPLETION_FOR_RESULTS: 50.0,
  MIN_COMPLETION_FOR_MEANINGFUL: 80.0,

  // Benchmark Data
  BENCHMARK_DATA: {
    stages: [
      'CLM Stage 1: e-Document',
      'CLM Stage 2: e-Signature',
      'CLM Stage 3: Contract Workflow Automation',
      'CLM Stage 4: Contract Authoring Automation',
      'CLM Stage 5: Contract Intelligence',
      'CLM Stage 6: Contract Execution'
    ],
    peerAverage: [6.96, 5.05, 4.9, 5.0, 4.89, 1.1],
    bestInClass: [8.79, 8.3, 7.78, 7.5, 7.42, 5.0]
  },

  // Stage Mappings
  STAGE_RADAR_NAMES: {
    '1: e-Document': 'CLM Stage 1: e-Document',
    '2: e-Signature': 'CLM Stage 2: e-Signature',
    '3: Contract Workflow Automation': 'CLM Stage 3: Contract Workflow Automation',
    '4: Contract Authoring Automation': 'CLM Stage 4: Contract Authoring Automation',
    '5: Contract Intelligence': 'CLM Stage 5: Contract Intelligence',
    '6: Contract Execution': 'CLM Stage 6: Contract Execution'
  } as Record<string, string>,

  // Colors for Agiloft branding
  COLORS: {
    primary: '#263A5C', // Agiloft Blue
    secondary: '#4A6587',
    accent: '#FF522B',
    success: '#48BB78',
    warning: '#ED8936',
    danger: '#F56565',
    gray: {
      50: '#F7FAFC',
      100: '#EDF2F7',
      200: '#E2E8F0',
      300: '#CBD5E0',
      400: '#A0AEC0',
      500: '#718096',
      600: '#4A5568',
      700: '#2D3748',
      800: '#1A202C',
      900: '#171923'
    }
  }
};