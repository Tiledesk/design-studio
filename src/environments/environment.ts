export const environment = {
    production: false,
    t2y12PruGU9wUtEGzBJfolMIgK: 'CHANGEIT',
    VERSION: require('../../package.json').version,
    remoteConfig: true, 
    // remoteConfigUrl: './design-studio-config.json',
    remoteConfigUrl: './environments/real_data/cds-config-aws-stage.json',
    apiUrl: 'CHANGEIT',
    widgetBaseUrl: 'CHANGEIT',
    dashboardBaseUrl: 'CHANGEIT',
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
      MQTTendpoint: 'ws://localhost:15675/ws', // MQTT endpoint (mqtt.js in a browser needs ws://, not mqtt://)
      APIendpoint: 'http://localhost:8004/api'
    },
    // TEMP: connectors surfaced directly from their /api/manifest until the per-project
    // install/integration-record flow exists. Empty in prod/pre.
    connectorBaseUrls: ['http://localhost:3000']
};
