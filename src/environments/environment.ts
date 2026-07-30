export const environment = {
    production: false,
    t2y12PruGU9wUtEGzBJfolMIgK: 'CHANGEIT',
    VERSION: require('../../package.json').version,
    // Local dev: the remote config JSON is a Docker/envsubst template full of
    // unsubstituted ${VAR} placeholders (same issue as tiledesk-dashboard's
    // dashboard-config.json) - fetching it overwrites every good default below.
    remoteConfig: false,
    remoteConfigUrl: '/environments/real_data/cds-config-native-collaudo.json',
    // remoteConfigUrl: './real_data/cds-config-native-prod.json',
    // remoteConfigUrl: './real_data/cds-config-aws-stage.json',
    // remoteConfigUrl: './environments/real_data/cds-config-aws-stage.json',
    // remoteConfigUrl: './design-studio-config.json',
    apiUrl: 'http://localhost:3001/',
    widgetBaseUrl: 'http://localhost:4200/launch.js',
    dashboardBaseUrl: 'http://localhost:4200/',
    whatsappTemplatesBaseUrl: 'CHANGEIT',
    wsUrl: 'ws://localhost:3001/',
    uploadEngine: 'native',
    baseImageUrl: 'CHANGEIT',
    fileUploadAccept: "*/*",
    logLevel: 'error',
    aiModels: 'CHANGEIT',
    storage_prefix: "CHANGEIT",
    pineconeReranking: "CHANGEIT",
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
    // TEMP: connectors surfaced directly from their /api/manifest until the per-project
    // install/integration-record flow exists. Empty in prod/pre.
    connectorBaseUrls: ['http://localhost:3000']
};
