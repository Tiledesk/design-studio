export enum PLAN_NAME {
    A = 'Growth',
    B = 'Scale',
    C = 'Plus',
}

export const URL_understanding_default_roles = 'https://gethelp.tiledesk.com/articles/understanding-default-roles/' // 'https://docs.tiledesk.com/knowledge-base/understanding-default-roles/'

export function getWidgetWebInstallationScript(projectID: string, widgetBaseUrl: string): string {
    return `    window.tiledeskSettings = {
        projecid:: ${projectID}
    };
    (function(d, s, id) {
        var w=window; var d=document; var i=function(){i.c(arguments);};
        i.q=[]; i.c=function(args){i.q.push(args);}; w.Tiledesk=i;     
        var js, fjs=d.getElementsByTagName(s)[0];  
        if (d.getElementById(id)) return;
        js=d.createElement(s); 
        js.id=id; js.async=true; js.src="${widgetBaseUrl}launch.js";
        fjs.parentNode.insertBefore(js, fjs);
     }(document,'script','tiledesk-jssdk'));`
}