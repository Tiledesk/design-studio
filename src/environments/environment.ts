
export const environment = {
    "production": false,
    "VERSION": "require('../../package.json').version",
    "remoteConfig": false, 
    "storage_prefix": "cds_sv6",
    "t2y12PruGU9wUtEGzBJfolMIgK": "PAY:T-ANA:T-ACT:T-TRI:T-GRO:T-DEP:T-OPH:T-MTL:T-CAR:T-V1L:T-PSA:T-MTT:T-SUP:T-LBS:T-APP:T-DEV:T-NOT:T-IPS:T-ETK:T-RAS:T-PPB:T-PET:T-MTS:T-TIL:T-DGF:T-NAT:F-HPB:T-TOW:T-KNB:T-GPT:T",
    "globalRemoteJSSrc": "https://panel.tiledesk.com/v3/scripts/segment_script.js", 
    "apiUrl": "https://stage.eks.tiledesk.com/api/",
    "widgetBaseUrl": "https://stage.eks.tiledesk.com/widget/",
    "dashboardBaseUrl": "https://stage.eks.tiledesk.com/dashboard/",
    "whatsappTemplatesBaseUrl": "https://stage.eks.tiledesk.com/api/modules/whatsapp",
    "wsUrl": "ws://localhost:3000/",
    "uploadEngine": "native",
    "baseImageUrl": "https://stage.eks.tiledesk.com/api/",
    "logLevel": "DEBUG",
    "fileUploadAccept":"*/*",
    "aiModels": "gpt-4.1:3;gpt-4.1-mini:0.6;gpt-4.1-nano:0.16;gpt-4o:6;gpt-4o-mini:0.3;gpt-4:25;gpt-4-turbo-preview:12;gpt-3.5-turbo:0.6",
    "firebaseConfig": {
        "apiKey": "AIzaSyBv6ILBL_U6VfUs_y8kqPYn-b2mYRauq1k",
        "authDomain": "tiledesk-v3-prod-cf4ff.firebaseapp.com",
        "databaseURL": "https://tiledesk-v3-prod-cf4ff-default-rtdb.europe-west1.firebasedatabase.app",
        "projectId": "tiledesk-v3-prod-cf4ff",
        "storageBucket": "tiledesk-v3-prod-cf4ff.appspot.com",
        "messagingSenderId": "522823349790",
        "appId": "1:522823349790:web:0d4ba710f38b586e1fa00f",
        "vapidKey":"BH7R85jN8ovJ36J8BKYmfVZsIRWbUj_WXQMs8U3bDN02upqyqy2TpElVQIGMTUyOE2V7UwE11T_sy5yQHg02bjs"
    },
    "chat21Config": {
        "appId": "tilechat",
        "MQTTendpoint": "ws://stage.eks.tiledesk.com/mqtt/ws"
    }
}