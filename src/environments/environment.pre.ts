export const environment = {
  production: false,
  t2y12PruGU9wUtEGzBJfolMIgK: 'CHANGEIT',
  VERSION: require('../../package.json').version,
  remoteConfig: false, 
  remoteConfigUrl: './design-studio-config.json',
  apiUrl: 'CHANGEIT',
  widgetBaseUrl: 'CHANGEIT',
  dashboardBaseUrl: 'CHANGEIT',
  // The agent chat's mount point. It reverse proxies to the agent runtime,
  // so this is the only address design-studio needs. Unset or CHANGEIT
  // hides the feature entirely.
  agentChatUrl: 'CHANGEIT',
  wsUrl: 'ws://localhost:3000/',
  uploadEngine: 'native',
  baseImageUrl: 'CHANGEIT',
  logLevel: 'error',
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
  }
};
