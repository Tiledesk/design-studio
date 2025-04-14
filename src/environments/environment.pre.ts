export const environment = {
  production: false,
  t2y12PruGU9wUtEGzBJfolMIgK: 'CHANGEIT',
  VERSION: require('../../package.json').version,
  remoteConfig: false, 
  remoteConfigUrl: './design-studio-config.json',
  apiUrl: 'CHANGEIT',
  widgetBaseUrl: 'CHANGEIT',
  dashboardBaseUrl: 'CHANGEIT',
  whatsappTemplatesBaseUrl: 'CHANGEIT',
  wsUrl: 'ws://localhost:3000/',
  uploadEngine: 'native',
  baseImageUrl: 'CHANGEIT',
  fileUploadAccept: "*/*",
  logLevel: 'error',
  aiModels: 'CHANGEIT',
  storage_prefix: "CHANGEIT",
  firebaseConfig: {
    apiKey: 'CHANGEIT',
    authDomain: 'CHANGEIT',
    databaseURL: 'CHANGEIT',
    projectId: 'CHANGEIT',
    storageBucket: 'CHANGEIT',
    messagingSenderId: 'CHANGEIT',
    appId: 'CHANGEIT',
    vapidKey: 'CHANGEIT'
  },
  chat21Config: {
    appId: 'tilechat',
    MQTTendpoint: 'mqtt://localhost:15675/ws', // MQTT endpoint
    APIendpoint: 'http://localhost:8004/api'
  },
};