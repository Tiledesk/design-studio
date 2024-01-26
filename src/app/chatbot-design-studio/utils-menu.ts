import { TYPE_URL } from "./utils"

export const LOGO_MENU_ITEMS: Array<{ key: string, label: string, icon: string, type: TYPE_URL, src?: string}> = [
    { key: 'GO_TO_DASHBOARD', label: 'GoToDashboard',  icon: 'arrow_back', type: TYPE_URL.SELF},
    { key: 'EXPORT', label: 'Export', icon: 'file_download', type: TYPE_URL.SELF},
    { key: 'LOG_OUT', label: 'LogOut', icon: 'logout', type: TYPE_URL.SELF}
]

export const INFO_MENU_ITEMS: Array<{ key: string, label: string, icon: string, type: TYPE_URL, src?: string}> = [
    // { key: 'HELP_CENTER', label: 'HelpCenter', icon: 'help', type: TYPE_URL.BLANK , src: 'https://gethelp.tiledesk.com/'},
    // { key: 'ROAD_MAP', label: 'RoadMap', icon: 'checklist', type: TYPE_URL.BLANK, src: 'https://feedback.tiledesk.com/roadmap'},
    { key: 'SUPPORT', label: 'Help', icon: 'help', type: TYPE_URL.SELF },
    { key: 'FEEDBACK', label: 'Feedback', icon: 'lightbulb', type: TYPE_URL.BLANK, src: 'https://feedback.tiledesk.com/feedback'},
    { key: 'CHANGELOG',  label: 'WhatsNew', icon: 'local_fire_department', type: TYPE_URL.BLANK, src:'https://feedback.tiledesk.com/changelog'},
    // { key: 'GITHUB', label: 'GitHubRepo', icon: 'assets/images/github-mark.svg', type: TYPE_URL.BLANK, src: 'https://github.com/Tiledesk'}
]

export const SHARE_MENU_ITEMS: Array<{ key: string, label: string, icon: string, type: TYPE_URL, src?: string}> = [
    { key: 'COPY_LINK', label: 'CopyLink', icon: 'copy', type: TYPE_URL.SELF},
    { key: 'OPEN_NEW_PAGE', label: 'OpenLinkInNewTab', icon: 'open_in_browser', type: TYPE_URL.BLANK},
]

export const SUPPORT_OPTIONS: { [key: string]: Array<{ key: string, label: string, icon: string, type: TYPE_URL, src?: string, description?: string}>} = {
    "SELF_SERVICE":[
        { key: 'DOCS',          label: 'Docs',          icon: 'description',                    type: TYPE_URL.BLANK,   src: 'https://developer.tiledesk.com/'},
        { key: 'HELP_CENTER',   label: 'HelpCenter',    icon: 'help',                           type: TYPE_URL.BLANK ,  src: 'https://gethelp.tiledesk.com/'},
        { key: 'ROAD_MAP',      label: 'RoadMap',       icon: 'checklist',                      type: TYPE_URL.BLANK,   src: 'https://feedback.tiledesk.com/roadmap'},
        { key: 'SYSTEM_STATUS', label: 'SystemStatus',  icon: 'health_and_safety',              type: TYPE_URL.BLANK,   src: 'https://feedback.tiledesk.com/roadmap'},
        { key: 'GITHUB',        label: 'GitHubRepo',    icon: 'assets/images/github-mark.svg',  type: TYPE_URL.BLANK,   src: 'https://github.com/Tiledesk'}
    ],
    "CONTACT_US": [
        { key: 'EMAIL',   label: 'SendUsEmail',    icon: 'mail',   type: TYPE_URL.BLANK ,  src: 'mailto:support@tiledesk.com', description:"support@tiledesk.com"},
        { key: 'CHAT',   label: 'ChatUs',    icon: 'forum',   type: TYPE_URL.BLANK ,  src: 'mailto:support@tiledesk.com', description:"support@tiledesk.com"},
        { key: 'DISCORD',   label: 'DiscordChannel',    icon: 'assets/images/github-mark.svg',   type: TYPE_URL.BLANK ,  src: 'https://discord.gg/Wut2FtpP', description:"JoinDiscordChannel"},
    ]
}