export const environment = {
    production: true,
    t2y12PruGU9wUtEGzBJfolMIgK: 'CHANGEIT',
    VERSION: require('../../package.json').version,
    /** Versione dell'editor con cui nasce un chatbot creato da qui: finisce sull'agente
     *  come `attributes.dsVersion` e all'apertura decide quale Design Studio si apre.
     *  Nessun rapporto con VERSION, che e' la versione del pacchetto. */
    CHATBOT_VERSION: 'v3',
    remoteConfig: true, 
    remoteConfigUrl: './design-studio-config.json',
    //remoteConfigUrl: './environments/real_data/cds-config-aws-stage.json',
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
