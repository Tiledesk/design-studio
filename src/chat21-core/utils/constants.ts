// TIMES

// export const SERVICE_WORKER_DEV = '/chat/';
// export const SERVICE_WORKER_PROD = './chat/';

// CHAT ENGINE
export const CHAT_ENGINE_MQTT = 'mqtt';
export const CHAT_ENGINE_FIREBASE = 'firebase';
export const UPLOAD_ENGINE_NATIVE = 'native';
export const PUSH_ENGINE_MQTT = 'mqtt';
export const PUSH_ENGINE_FIREBASE = 'firebase';


// AUTH
export const AUTH_STATE_OFFLINE = 'offline';
export const AUTH_STATE_ONLINE = 'online'


// MESSAGES STATUS
export const MSG_STATUS_FAILED = -100;
export const MSG_STATUS_SENDING = 0;
export const MSG_STATUS_SENT = 100;
export const MSG_STATUS_SENT_SERVER = 150;
export const MSG_STATUS_RECEIVED = 200;
export const MSG_STATUS_RETURN_RECEIPT = 250;
export const MSG_STATUS_SEEN = 300;

//REQUEST STATUS
export const REQUEST_ARCHIVED = 1000

// constans messages detail
export const MIN_HEIGHT_TEXTAREA = 24;
export const MAX_HEIGHT_TEXTAREA = 180;

// pagine
export const PARENT_PAGE_USERS = 'users ';
export const PARENT_PAGE_DETAIL_CONVERSATION = 'dettaglio-conversazione ';

// css
export const BCK_COLOR_CONVERSATION_SELECTED = '#EEEEEE ';
export const BCK_COLOR_CONVERSATION_UNSELECTED = '#FFFFFF ';

export const TYPE_SUPPORT_GROUP = 'support-group';
export const CHANNEL_TYPE_GROUP = 'group';
export const CHANNEL_TYPE_CHAT21 = 'chat21';
export const CHANNEL_TYPE_EMAIL = 'email';
export const CHANNEL_TYPE_FORM = 'form';
export const CHANNEL_TYPE_MESSANGER = 'messanger';
export const CHANNEL_TYPE_WHATSAPP = 'whatsapp';
export const CHANNEL_TYPE_TELEGRAM = 'telegram';

// TYPES MESSAGES
export const TYPE_MSG_TEXT = 'text';
export const TYPE_MSG_IMAGE = 'image';
export const TYPE_MSG_FILE = 'file';
export const TYPE_MSG_BUTTON = 'button';
export const TYPE_MSG_EMAIL = 'email';
export const TYPE_MSG_FORM = 'form';

export const MAX_WIDTH_IMAGES = 300;
export const MIN_WIDTH_IMAGES = 130;
export const TIME_TYPING_MESSAGE = 2000;
export const TYPE_DIRECT = 'direct';
export const TYPE_GROUP = 'group';
export const SYSTEM = 'system';
export const URL_NO_IMAGE = ''; // assets/img/no_image.png';
export const LABEL_NOICON = 'NOICON';
export const CLIENT_BROWSER = 'browser';
export const TYPE_POPUP_LIST_CONVERSATIONS = 'LIST_CONVERSATIONS';
export const TYPE_POPUP_DETAIL_MESSAGE = 'DETAIL_MESSAGE';
export const MESSAGE_TYPE_INFO = 'INFO';
export const MESSAGE_TYPE_MINE = 'MINE';
export const MESSAGE_TYPE_OTHERS = 'OTHERS';

export const CHAT_REOPENED = 'CHAT_REOPENED';
export const CHAT_CLOSED = 'CHAT_CLOSED';
export const MEMBER_JOINED_GROUP = 'MEMBER_JOINED_GROUP';
export const MEMBER_LEFT_GROUP = "MEMBER_LEFT_GROUP";
export const LEAD_UPDATED = "LEAD_UPDATED";
export const TOUCHING_OPERATOR = "TOUCHING_OPERATOR";
export const LIVE_PAGE = "LIVE_PAGE"


// URLS
// export const URL_SOUND = 'assets/sounds/pling.mp3';
export const URL_SOUND_LIST_CONVERSATION = '/assets/sounds/pling.mp3';
export const URL_SOUND_CONVERSATION_ADDED = '/assets/sounds/wheep-wheep.mp3';
export const URL_SOUND_CONVERSATION_UNASSIGNED = '/assets/sounds/interface-start.mp3'
// export const CHAT_SEND_BY_EMAIL_LINK =
// 'mailto:?subject=Transcript Chat Conversation&body=Salve,%0D%0A%0D%0Adi
// seguito potrà scaricare il transcript della conversazione intercorsa con il nostro servizio di
// Supporto:%0D%0A%0D%0Ahttps://api.tiledesk.com/v1/public/requests/ ';
// export const URL_VIDEO_CHAT = 'https://videochat.tiledesk.com/add-user-group.html';
// export const URL_TICKET_CHAT = 'https://chat21sdk.atlassian.net/secure/CreateIssue!default.jspa';
// export const FIREBASESTORAGE_BASE_URL_IMAGE = 'https://firebasestorage.googleapis.com/v0/b/chat-v2-dev.appspot.com/o/';
// export const BASE_URL_HOSTNAME = 'support.tiledesk.com';
// export const DASHBOARD_URL = 'https://support.tiledesk.com/dashboard/';
// export const URL_PROJECT_ID = 'https://support.tiledesk.com/dashboard/#/project/ ';


// 'https://videochat.tiledesk.com/videochat/videochat.html';
// 'https://www.chat21.org/videochat/';
// 'https://support.chat21.org/videochat/videochat.php';

// PARAMETERS
export const PLATFORM_MOBILE = 'mobile';
export const PLATFORM_DESKTOP = 'desktop';

// STORAGE
export const STORAGE_PREFIX = 'tiledesk_widget_';

// links
export const FIREBASESTORAGE_BASE_URL_IMAGE = 'https://firebasestorage.googleapis.com/v0/b/' //+ 'chat-v2-dev.appspot.com/o/';
export const IMG_PROFILE_BOT = '/assets/images/avatar_bot_tiledesk.svg';
export const IMG_PROFILE_DEFAULT = '/assets/images/avatar_male_tiledesk.svg';

//LOG LEVEL
// export enum LogLevel {
//     Error = 0,
//     Warn = 1,
//     Info = 2,
//     Debug = 3
// }

export const LogLevel = {
    'ERROR': 0,
    'WARN': 1,
    'INFO': 2,
    'DEBUG': 3
}

export enum PLAN_NAME {
    A = 'Growth',
    B = 'Scale',
    C = 'Plus',
    D = 'Basic',
    E = 'Premium',
    F = 'Custom'
}

export enum TYPE_BUTTON {
    TEXT = 'text',
    URL = 'url',
    ACTION = 'action'
}

export const tranlatedLanguage = ['it', 'en', 'de', 'es', 'pt', 'fr', 'ru', 'tr', 'sr', 'ar', 'uk', 'sv', 'az', 'kk', 'uz']



