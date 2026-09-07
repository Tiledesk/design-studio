export const environment = {
    production: true,
    t2y12PruGU9wUtEGzBJfolMIgK: 'CHANGEIT',
    VERSION: require('../../package.json').version,
    remoteConfig: true, 
    remoteConfigUrl: './design-studio-config.json',
    //remoteConfigUrl: './environments/real_data/cds-config-aws-stage.json',
    apiUrl: 'CHANGEIT',
    widgetBaseUrl: 'CHANGEIT',
    dashboardBaseUrl: 'CHANGEIT',
    whatsappTemplatesBaseUrl: 'CHANGEIT',
    // The agent chat's mount point. It reverse proxies to the agent runtime,
    // so this is the only address design-studio needs. Unset or CHANGEIT
    // hides the feature entirely.
    agentChatUrl: 'http://localhost:5173',
    wsUrl: 'ws://localhost:3000/',
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
    }
};
