import { TYPE_URL } from "./utils"

export const LOGO_MENU_ITEMS: Array<{ key: string, label: string, icon: string, type: TYPE_URL, src?: string}> = [
    { key: 'GO_TO_DASHBOARD', label: 'GoToDashboard',  icon: 'arrow_back', type: TYPE_URL.SELF},
    { key: 'EXPORT', label: 'Export', icon: 'file_download', type: TYPE_URL.SELF},
    { key: 'LOG_OUT', label: 'LogOut', icon: 'logout', type: TYPE_URL.SELF}
]

export const INFO_MENU_ITEMS: Array<{ key: string, label: string, icon: string, type: TYPE_URL, src?: string}> = [
    { key: 'HELP_CENTER', label: 'HelpCenter', icon: 'help', type: TYPE_URL.BLANK , src: 'https://gethelp.tiledesk.com/'},
    { key: 'ROAD_MAP', label: 'RoadMap', icon: 'checklist', type: TYPE_URL.BLANK, src: 'https://feedback.tiledesk.com/roadmap'},
    { key: 'FEEDBACK', label: 'Feedback', icon: 'lightbulb', type: TYPE_URL.BLANK, src: 'https://feedback.tiledesk.com/feedback'},
    { key: 'SUPPORT', label: 'support@tiledesk.com', icon: 'email', type: TYPE_URL.SELF, src: 'mailto:support@tiledesk.com'},
    { key: 'CHANGELOG',  label: 'Changelog', icon: 'local_fire_department', type: TYPE_URL.BLANK, src:'https://feedback.tiledesk.com/changelog'},
    { key: 'GITHUB', label: 'GitHubRepo', icon: 'assets/images/github-mark.svg', type: TYPE_URL.BLANK, src: 'https://github.com/Tiledesk'}
]

export const SHARE_MENU_ITEMS: Array<{ key: string, label: string, icon: string, type: TYPE_URL, src?: string}> = [
    { key: 'COPY_LINK', label: 'CopyLink', icon: 'copy', type: TYPE_URL.SELF},
    { key: 'OPEN_NEW_PAGE', label: 'OpenLinkInNewTab', icon: 'open_in_browser', type: TYPE_URL.BLANK},
]