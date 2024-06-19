export const URL_understanding_default_roles = 'https://gethelp.tiledesk.com/articles/understanding-default-roles/' // 'https://docs.tiledesk.com/knowledge-base/understanding-default-roles/'

export function getWidgetWebInstallationScript(projectID: string, widgetBaseUrl: string): {html, javascript} {
    return {
        html: `&lt;script type="text/javascript"&gt;\n`+
        "  window.tiledeskSettings = {\n" +
        `        projectid: "${projectID}"\n`+
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
        javascript:`<script type="text/javascript">`+ '\n' +
        "  window.tiledeskSettings = {" + '\n' +
        `        projectid: "${projectID}"`+ '\n' +
        "  };"+ '\n' +
        "  (function(d, s, id) {"+ '\n' +
        "       var w=window; var d=document; var i=function(){i.c(arguments);};"+ '\n' +
        "       i.q=[]; i.c=function(args){i.q.push(args);}; w.Tiledesk=i;"+ '\n' +    
        "       var js, fjs=d.getElementsByTagName(s)[0];"+ '\n' +
        "       if (d.getElementById(id)) return;"+ '\n' +
        "       js=d.createElement(s);"+ '\n' +
        `       js.id=id; js.async=true; js.src="${widgetBaseUrl}launch.js";`+ '\n' +
        "       fjs.parentNode.insertBefore(js, fjs);"+ '\n' +
        "  }(document,'script','tiledesk-jssdk'));"+ '\n' +
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

export function secondsToDhms(seconds) {
    seconds = Number(seconds);

    var d = Math.floor(seconds / (3600*24));
    var h = Math.floor(seconds / 3600);
    var m = Math.floor(seconds % 3600 / 60);
    var s = Math.floor(seconds % 3600 % 60);

    var dDisplay = d > 0 ? d + (d == 1 ? " day, " : " days, ") : "";
    var hDisplay = h > 0 ? h + (h == 1 ? " hour, " : " hours, ") : "";
    var mDisplay = m > 0 ? m + (m == 1 ? " minute, " : " minutes, ") : "";
    var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
    let label = dDisplay + hDisplay + mDisplay + sDisplay;

    const getDays= function(): number{
        return d;
    }
    const getHours= function(): number{
        return h;
    }
    const getMinutes= function(): number{
        return m;
    }
    const getSeconds= function(): number{
        return s;
    }

    return { getDays: getDays, getHours: getHours,  getMinutes: getMinutes, getSeconds: getSeconds}
}

export function loadTokenMultiplier(ai_models) { 
    let models_string = ai_models.replace(/ /g,'');

    let models = {};
    if (!models_string) {
        return models;
    }

    let models_string_trimmed = models_string.replace(/ /g,'');
    let splitted_string = models_string_trimmed.split(";");

    splitted_string.forEach(m => {
        let m_split = m.split(":");
        let multiplier = null;
        if (!m_split[1]) {
            multiplier = null;
        } else {
            multiplier = Number(m_split[1]);;
        }
        models[m_split[0]] = multiplier;
    })

    return models
}