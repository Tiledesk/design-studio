export enum PLAN_NAME {
    A = 'Growth',
    B = 'Scale',
    C = 'Plus',
}

export const URL_understanding_default_roles = 'https://gethelp.tiledesk.com/articles/understanding-default-roles/' // 'https://docs.tiledesk.com/knowledge-base/understanding-default-roles/'

export function getWidgetWebInstallationScript(projectID: string, widgetBaseUrl: string): {html, javascript} {
    return {
        html: `&lt;script type="text/javascript"&gt;\n`+
        "  window.tiledeskSettings = {\n" +
        `        projecid:: ${projectID}\n`+
        "  };\n"+
        "  (function(d, s, id) {\n"+
        "       var w=window; var d=document; var i=function(){i.c(arguments);};\n"+
        "       i.q=[]; i.c=function(args){i.q.push(args);}; w.Tiledesk=i;\n"+     
        "       var js, fjs=d.getElementsByTagName(s)[0];\n"+
        "       if (d.getElementById(id)) return;\n"+
        "       js=d.createElement(s);\n"+
        `       js.id=id; js.async=true; js.src="${widgetBaseUrl}launch.js";\n`+
        "       fjs.parentNode.insertBefore(js, fjs);\n"+
        "  }(document,'script','tiledesk-jssdk'));\n"+
        "&lt;/script&gt;",
        javascript:`<script type="text/javascript">`+
        "  window.tiledeskSettings = {" +
        "        projecid:: ${projectID}"+
        "  };"+
        "  (function(d, s, id) {"+
        "       var w=window; var d=document; var i=function(){i.c(arguments);};"+
        "       i.q=[]; i.c=function(args){i.q.push(args);}; w.Tiledesk=i;"+     
        "       var js, fjs=d.getElementsByTagName(s)[0];"+
        "       if (d.getElementById(id)) return;"+
        "       js=d.createElement(s);"+
        `       js.id=id; js.async=true; js.src="${widgetBaseUrl}launch.js";`+
        "       fjs.parentNode.insertBefore(js, fjs);"+
        "  }(document,'script','tiledesk-jssdk'));"+
        "</script>"

         //<span class="">d, s, id</span>
    }
}

export function downloadObjectAsJson(exportObj, exportName) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}