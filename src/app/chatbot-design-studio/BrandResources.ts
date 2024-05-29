import { Injectable } from "@angular/core";
import { BrandService } from "../services/brand.service";
import { INFO_MENU_ITEMS, LOGO_MENU_ITEMS, SHARE_MENU_ITEMS, SUPPORT_OPTIONS } from "./utils-menu";
import { BRAND_BASE_INFO, LOGOS_ITEMS, MEDIA } from "./utils-resources";
import { TYPE_URL } from "./utils";

@Injectable({
    providedIn: 'root'
})
export class BrandResources {
    
    brand: {}
    
    constructor(
        brandService: BrandService
    ) {
        this.brand = brandService.getBrand()
    }

    loadResources(){
        if(!this.brand){
            return;
        }

        /** META TITLE and FAVICON */
        document.title = this.brand['BRAND_NAME'] + ' ' + this.brand['META_TITLE']
        var icon = document.querySelector("link[rel~='icon']") as HTMLElement;
        icon.setAttribute('href', this.brand['FAVICON_URL'])

        /** CSS */
        document.documentElement.style.setProperty('--base-brand-color', this.brand['BRAND_PRIMARY_COLOR']);

        /** BRAND_BASE_INFO */
        Object.keys(BRAND_BASE_INFO).forEach(key => BRAND_BASE_INFO[key] = this.brand[key])

        /** LOGOS_ITEMS */
        Object.keys(LOGOS_ITEMS).forEach(key => { LOGOS_ITEMS[key].icon = this.brand[key] })
        
        /** LOGO_MENU_ITEMS */
        let logo_menu: Array<{ key: string, label: string, icon: string, type: TYPE_URL, status: "active" | "inactive", src?: string}> = Array.from([...LOGO_MENU_ITEMS, ...this.brand['LOGO_MENU_ITEMS']].reduce((m, o) => m.set(o.key, o), new Map).values());
        logo_menu.forEach(el => {
            if(!LOGO_MENU_ITEMS.find(a => a.key === el.key)) return;
            LOGO_MENU_ITEMS.find(a => a.key === el.key).icon = el.icon
            LOGO_MENU_ITEMS.find(a => a.key === el.key).src = el.src
            LOGO_MENU_ITEMS.find(a => a.key === el.key).status = el.status
            LOGO_MENU_ITEMS.find(a => a.key === el.key).icon = el.icon
        })

        /** INFO_MENU_ITEMS */
        let result: Array<{ key: string, label: string, icon: string, type: TYPE_URL, status: "active" | "inactive", src?: string}> = Array.from([...INFO_MENU_ITEMS, ...this.brand['INFO_MENU_ITEMS']].reduce((m, o) => m.set(o.key, o), new Map).values());
        result.forEach(el => {
            if(!INFO_MENU_ITEMS.find(a => a.key === el.key)) return;
            INFO_MENU_ITEMS.find(a => a.key === el.key).icon = el.icon
            INFO_MENU_ITEMS.find(a => a.key === el.key).src = el.src
            INFO_MENU_ITEMS.find(a => a.key === el.key).status = el.status
            INFO_MENU_ITEMS.find(a => a.key === el.key).icon = el.icon
        })

        /** SUPPORT-COMP OPTIONS */
        let options_SELF: Array<{ key: string, label: string, icon: string, type: TYPE_URL, status: "active" | "inactive", src?: string}> = Array.from([...SUPPORT_OPTIONS['SELF_SERVICE'], ...this.brand['SUPPORT_OPTIONS']['SELF_SERVICE']].reduce((m, o) => m.set(o.key, o), new Map).values());
        options_SELF.forEach(el => {
            if(!SUPPORT_OPTIONS['SELF_SERVICE'].find(a => a.key === el.key)) return;
            SUPPORT_OPTIONS['SELF_SERVICE'].find(a => a.key === el.key).icon = el.icon
            SUPPORT_OPTIONS['SELF_SERVICE'].find(a => a.key === el.key).src = el.src
            SUPPORT_OPTIONS['SELF_SERVICE'].find(a => a.key === el.key).status = el.status
            SUPPORT_OPTIONS['SELF_SERVICE'].find(a => a.key === el.key).icon = el.icon
        })
        let options_CONTACTS: Array<{ key: string, label: string, icon: string, type: TYPE_URL, status: "active" | "inactive", src?: string}> = Array.from([...SUPPORT_OPTIONS['CONTACT_US'], ...this.brand['SUPPORT_OPTIONS']['CONTACT_US']].reduce((m, o) => m.set(o.key, o), new Map).values());
        options_CONTACTS.forEach(el => {
            if(!SUPPORT_OPTIONS['CONTACT_US'].find(a => a.key === el.key)) return;
            SUPPORT_OPTIONS['CONTACT_US'].find(a => a.key === el.key).icon = el.icon
            SUPPORT_OPTIONS['CONTACT_US'].find(a => a.key === el.key).src = el.src
            SUPPORT_OPTIONS['CONTACT_US'].find(a => a.key === el.key).status = el.status
            SUPPORT_OPTIONS['CONTACT_US'].find(a => a.key === el.key).icon = el.icon
        })

        /** MEDIA */
        Object.keys(MEDIA).forEach(key => { 
            if(this.brand['MEDIA'][key].src) MEDIA[key].src = this.brand['MEDIA'][key].src
            if(this.brand['MEDIA'][key].text) MEDIA[key].text = this.brand['MEDIA'][key].text
            if(this.brand['MEDIA'][key].description) MEDIA[key].description = this.brand['MEDIA'][key].description
        })

        
    }
}