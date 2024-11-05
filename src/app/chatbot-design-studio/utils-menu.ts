import { TYPE_URL } from "./utils"

export var LOGO_MENU_ITEMS: Array<{ key: string, label: string, icon: string, type: TYPE_URL, status:"active" | "inactive", src?: string}> = [
    { key: 'GO_TO_DASHBOARD',   label: 'GoToDashboard', icon: 'arrow_back', type: TYPE_URL.SELF, status: "active" },
    // { key: 'EXPORT', label: 'Export', icon: 'file_download', type: TYPE_URL.SELF},
    { key: 'LOG_OUT',           label: 'LogOut',        icon: 'logout',     type: TYPE_URL.SELF, status: "active" }
]

export var INFO_MENU_ITEMS: Array<{ key: string, label: string, icon: string, type: TYPE_URL, status:"active" | "inactive", src?: string}> = [
    // { key: 'HELP_CENTER', label: 'HelpCenter', icon: 'help', type: TYPE_URL.BLANK , status: "active", src: 'https://gethelp.tiledesk.com/'},
    // { key: 'ROAD_MAP', label: 'RoadMap', icon: 'checklist', type: TYPE_URL.BLANK, status: "active", src: 'https://feedback.tiledesk.com/roadmap'},
    { key: 'SUPPORT',       label: 'Help',      icon: 'help',                   type: TYPE_URL.SELF,        status: "active"                                                },
    { key: 'FEEDBACK',      label: 'Feedback',  icon: 'lightbulb',              type: TYPE_URL.BLANK,       status: "active", src: 'https://feedback.tiledesk.com/feedback' },
    { key: 'CHANGELOG',     label: 'WhatsNew',  icon: 'local_fire_department',  type: TYPE_URL.BLANK,       status: "active", src:'https://feedback.tiledesk.com/changelog' },
    // { key: 'GITHUB', label: 'GitHubRepo', icon: 'assets/images/github-mark.svg', type: TYPE_URL.BLANK, status: "active", src: 'https://github.com/Tiledesk'}
]

export var SHARE_MENU_ITEMS: Array<{ key: string, label: string, icon: string, type: TYPE_URL, src?: string}> = [
    { key: 'COPY_LINK',     label: 'CopyLink',          icon: 'copy',               type: TYPE_URL.SELF},
    { key: 'OPEN_NEW_PAGE', label: 'OpenLinkInNewTab',  icon: 'open_in_browser',    type: TYPE_URL.BLANK},
    { key: 'EXPORT',        label: 'Export',            icon: 'file_download',      type: TYPE_URL.SELF},
]

export var CONTEXT_MENU_ITEMS: Array<{ key: string, label: string, icon: string, type: TYPE_URL, status: "active" | "inactive" , src?: string}> = [
    { key: 'PASTE',         label: 'Paste',             icon: 'content_paste',      type: TYPE_URL.SELF,    status: "active"},
]

export var PLAY_MENU_ITEMS: Array<{ key: string, label: string, icon: string, type: TYPE_URL, status: "active" | "inactive" , src?: string}> = [
    { key: 'WEB',       label: 'WebWidget',     icon: 'assets/images/icons/play.svg',                           type: TYPE_URL.SELF,    status: "active"},
    { key: 'WHATSAPP',  label: 'TryOnWhatsapp', icon: 'assets/images/channel_icons/whatsapp-logo_green.svg',    type: TYPE_URL.BLANK,   status: "inactive"},
]

export var SUPPORT_OPTIONS: { [key: string]: Array<{ key: string, label: string, icon: string, type: TYPE_URL, status: "active" | "inactive", src?: string, description?: string}>} = {
    "SELF_SERVICE":[
        { key: 'DOCS',          label: 'Docs',          icon: 'description',                    type: TYPE_URL.BLANK,   status:"active",    src: 'https://developer.tiledesk.com/'},
        { key: 'HELP_CENTER',   label: 'HelpCenter',    icon: 'help',                           type: TYPE_URL.BLANK ,  status:"active",    src: 'https://gethelp.tiledesk.com/'},
        { key: 'ROAD_MAP',      label: 'RoadMap',       icon: 'checklist',                      type: TYPE_URL.BLANK,   status:"active",    src: 'https://feedback.tiledesk.com/roadmap'},
        { key: 'SYSTEM_STATUS', label: 'SystemStatus',  icon: 'health_and_safety',              type: TYPE_URL.BLANK,   status:"active",    src: 'https://tiledesk.statuspage.io/'},
        { key: 'GITHUB',        label: 'GitHubRepo',    icon: 'assets/images/github-mark.svg',  type: TYPE_URL.BLANK,   status:"active",    src: 'https://github.com/Tiledesk'}
    ],
    "CONTACT_US": [
        { key: 'EMAIL',   label: 'SendUsEmail',         icon: 'mail',                           type: TYPE_URL.BLANK ,  status:"active",    src: 'mailto:support@tiledesk.com', description:"support@tiledesk.com"},
        { key: 'CHAT',      label: 'ChatUs',            icon: 'forum',                          type: TYPE_URL.BLANK ,  status:"active",    description:"StartConversation"},
        { key: 'DISCORD',   label: 'DiscordChannel',    icon: 'assets/images/discord.svg',  type: TYPE_URL.BLANK ,  status:"active",    src: 'https://discord.gg/Wut2FtpP', description:"JoinDiscordChannel"},
    ]
}