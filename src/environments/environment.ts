export const environment = {
    production: false,
    t2y12PruGU9wUtEGzBJfolMIgK: 'tokenKey',
    VERSION: require('../../package.json').version,
    DS_VERSION: '3',
    remoteConfig: true,
    remoteConfigUrl: './real_data/cds-config-local.json',
    apiUrl: 'http://localhost:3000/',
    widgetBaseUrl: 'http://localhost:4200/',
    dashboardBaseUrl: 'http://localhost:4200/',
    wsUrl: 'ws://localhost:3000/',
    uploadEngine: 'native',
    baseImageUrl: 'http://localhost:3000/',
    logLevel: 'debug',
    storage_prefix: 'tiledesk_',
    firebaseConfig: {
      apiKey: '',
      authDomain: '',
      databaseURL: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: '',
      vapidKey: ''
    }
};

