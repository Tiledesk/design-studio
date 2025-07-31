export const environment = {
  production: true,
  t2y12PruGU9wUtEGzBJfolMIgK: 'PAY:T-ANA:T-ACT:T-TRI:T-GRO:T-DEP:T-OPH:T-MTL:T-CAR:T-V1L:T-PSA:T-MTT:T-SUP:T-LBS:T-APP:T-DEV:T-NOT:T-IPS:T-ETK:T-RAS:T-PPB:T-PET:T-MTS:T-TIL:T-DGF:T-NAT:T-HPB:F-TOW:T-KNB:T-GPT:T',
  VERSION: require('../../package.json').version,
  remoteConfig: false, 
  remoteConfigUrl: './design-studio-config.json',
  globalRemoteJSSrc: 'https://panel.tiledesk.com/v3/scripts/segment_script.js, https://panel.tiledesk.com/v3/scripts/custom_script.js',
  apiUrl: 'https://api.tiledesk.com/v3/',
  widgetBaseUrl: 'https://widget.tiledesk.com/v6/',
  dashboardBaseUrl: '/v3/dashboard/',
  whatsappTemplatesBaseUrl: 'https://api.tiledesk.com/v3/modules/whatsapp',
  phoneNumber: "390836308794",
  wsUrl: 'ws://localhost:3000/',
  uploadEngine: 'native',
  baseImageUrl: 'https://eu.rtmv3.tiledesk.com/api/',
  fileUploadAccept: "image/*,.pdf,.txt,.wav",
  logLevel: 'error',
  aiModels: 'gpt-4.1:3;gpt-4.1-mini:0.6;gpt-4.1-nano:0.16;gpt-4o:6;gpt-4o-mini:0.3;gpt-4:25;gpt-4-turbo-preview:12;gpt-3.5-turbo:0.6',
  storage_prefix: "cds_sv6",
  firebaseConfig: {
      apiKey: "AIzaSyBv6ILBL_U6VfUs_y8kqPYn-b2mYRauq1k",
      authDomain: "tiledesk-v3-prod-cf4ff.firebaseapp.com",
      databaseURL: "https://tiledesk-v3-prod-cf4ff-default-rtdb.europe-west1.firebasedatabase.app",
      projectId: "tiledesk-v3-prod-cf4ff",
      storageBucket: "tiledesk-v3-prod-cf4ff.appspot.com",
      messagingSenderId: "522823349790",
      appId: "1:522823349790:web:0d4ba710f38b586e1fa00f",
      vapidKey:"BH7R85jN8ovJ36J8BKYmfVZsIRWbUj_WXQMs8U3bDN02upqyqy2TpElVQIGMTUyOE2V7UwE11T_sy5yQHg02bjs"
  },
  chat21Config: {
      appId: 'tilechat',
      MQTTendpoint: 'wss://eu.rtmv3.tiledesk.com/mqtt/ws', // MQTT endpoint
      APIendpoint: 'https://eu.rtmv3.tiledesk.com/chatapi/api',
      log: false
  },
};
