export const BRAND_BASE_INFO: { [key: string] : string | boolean } ={
    COMPANY_NAME: "Tiledesk",
    BRAND_NAME: "Tiledesk",
    COMPANY_SITE_NAME:"tiledesk.com",
    COMPANY_SITE_URL:"https://www.tiledesk.com",
    CONTACT_US_EMAIL: "support@tiledesk.com",
    FAVICON: "https://tiledesk.com/wp-content/uploads/2022/07/tiledesk_v13-300x300.png",
    META_TITLE:"Design Studio",
    DOCS: true,
    COMMUNITY_SECTION: true,
    LOGOUT_ENABLED: false
}

export const LOGOS_ITEMS: { [key: string] : { label: string | boolean, icon: string }} ={
    COMPANY_LOGO: {label: BRAND_BASE_INFO.COMPANY_NAME,  icon: 'assets/logos/tiledesk_logo.svg'},
    COMPANY_LOGO_NO_TEXT: {label: BRAND_BASE_INFO.COMPANY_NAME, icon: 'assets/logos/tiledesk_logo_no_text.svg'},
    BASE_LOGO: {label: BRAND_BASE_INFO.BRAND_NAME,  icon: 'assets/logos/tiledesk_logo.svg'},
    BASE_LOGO_NO_TEXT: {label: BRAND_BASE_INFO.BRAND_NAME, icon: 'assets/logos/tiledesk_logo_no_text.svg'},
    BASE_LOGO_WHITE: { label: BRAND_BASE_INFO.BRAND_NAME, icon: '"assets/logos/tiledesk-logo_new_white.svg'},
    BASE_LOGO_WHITE_NO_TEXT: { label: BRAND_BASE_INFO.BRAND_NAME, icon: '"assets/logos/tiledesk-logo_new_white.svg'},
    BASE_LOGO_GRAY: { label: BRAND_BASE_INFO.BRAND_NAME, icon: 'https://support-pre.tiledesk.com/dashboard/assets/img/logos/tiledesk-logo_new_gray.svg'}
}

export const MEDIA: { [key: string]: { src: string, text: string, description: string}}= {
    RULES: { src: "https://www.youtube.com/embed/p0ux-86Y4_I", text: "CDSSplashScreen.YouHaveNoRules", description: "CDSSplashScreen.LearnAboutAI"},
    GLOBALS: { src: "", text: "CDSGlobals.NoGlobalVariables", description: ""},
}