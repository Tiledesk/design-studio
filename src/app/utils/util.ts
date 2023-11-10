export enum PLAN_NAME {
    A = 'Growth',
    B = 'Scale',
    C = 'Plus',
}

export const URL_understanding_default_roles = 'https://gethelp.tiledesk.com/articles/understanding-default-roles/' // 'https://docs.tiledesk.com/knowledge-base/understanding-default-roles/'

export function getWidgetWebInstallationScript(projectID: string, widgetBaseUrl: string): {html, javascript} {
    return {
        html: '<span>&lt;<span class="eKLHPw">script </span><span class="qwEds">type=</span></span><span class="fNZzEh">"text/javascript"</span><span>&gt;</span>\n' +
        '<span class="qwEds">  window.tiledeskSettings = </span><span class="dSxEd">{</span>\n'+
        `<span>       </span><span class="qwEds">projectid: <span class="fNZzEh">"${projectID}"</span> </span>\n`+
        '<span class="dSxEd">  };</span>\n'+
        '<span>   <span class="eKLHPw">(function</span>(<span class="qwEds">d, s, id</span>) {</span>\n'+
        '<span>       </span><span>var w=window; var d=document; var i=function(){i.c(arguments);};</span>\n'+
        '<span>       </span><span>i.q=[]; i.c=function(args){i.q.push(args);}; w.Tiledesk=i;</span>\n'+
        '<span>       </span><span>var js, fjs=d.getElementsByTagName(s)[0];</span>\n'+
        '<span>       </span><span>if (d.getElementById(id)) return;</span>\n'+
        `<span>       </span><span>js.id=id; js.async=true; js.src="${widgetBaseUrl}launch.js";</span>\n`+
        '<span>       </span><span>fjs.parentNode.insertBefore(js, fjs);</span>\n'+
        '<span>  }(document,"script","tiledesk-jssdk"));</span>\n'+
        '&lt;<span class="eKLHPw">/script</span>&gt;',
        javascript:`<script type="text/javascript">
            window.tiledeskSettings = {
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
            }(document,'script','tiledesk-jssdk'));
         </script>`

         //<span class="">d, s, id</span>
    }
}