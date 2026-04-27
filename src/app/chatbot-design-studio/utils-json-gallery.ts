// ************       MODELS JSON GALLERY      ************************

export const JSON_MODEL_GALLERY_ITERATE_RESULTS = `[
    {% for item in results limit:10 %}
    {
        "preview": {
            "src": {{item.document.image | json}}
        },
        "title": {{item.document.name | json | truncate: 20}},
        "description": {{item.document.description | json | truncate: 20}},
        "buttons": [{"type": "url","value": "Guardami","link": {{item.document.url | json}}}]
    }{% unless forloop.last %},{% endunless %}
    {% endfor %}
]`;

export const JSON_MODEL_GALLERY_BASIC_LINK = `[
    {
        "preview": {
            "src": {{item[0].imageURL | json}}
        },
        "title": {{item[0].name | json | truncate: 20}},
        "description": {{item[0].document.description | json | truncate: 20}},
        "buttons": [{"type": "url","value": "Guardami","link": {{item[0].document.url | json}}}]
    },
    {
        "preview": {
            "src": {{item[1].imageURL | json}}
        },
        "title": {{item[1].name | json | truncate: 20}},
        "description": {{item[1].document.description | json | truncate: 20}},
        "buttons": [{"type": "url","value": "Guardami","link": {{item[1].document.url | json}}}]
    }
]`;

export const LIST_JSON_MODEL_GALLERY = [
    {name: 'Iterate over results', value: JSON_MODEL_GALLERY_ITERATE_RESULTS},
    {name: 'Basic gallery element with link buttons', value: JSON_MODEL_GALLERY_BASIC_LINK}
]; 