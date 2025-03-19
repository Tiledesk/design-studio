/************       MODELS JSON BUTTONS      ************************/

export const JSON_MODEL_PLACEHOLDER = `[
    {
      "type": "action",
      "value": "operator",
      "action": "hand off",
      "alias": "handoff, human"
    },
    {
      "type": "url",
      "value": "My link",
      "link": "https://www.mylink.com",
      "target": "blank"
    },
    {
      "type": "text",
      "value": "Hello"
    }
]`;

export const JSON_MODEL_ACTION_BUTTONS = `[
  {
    "type":"action",
    "value":"Support",
    "action":"support"
  },
  {
    "type":"action",
    "value":"Sales",
    "action":"sales"
  }
]`;

export const JSON_MODEL_URL_BUTTONS = `[
  {
      "type": "url",
      "value": "Ferrari",
      "link": "https://www.ferrari.com/",
      "target": "blank"
  },
  {
      "type": "url",
      "value": "Dante",
      "link": "https://en.m.wikipedia.org/wiki/Dante_Alighieri",
      "target": "self"
  },
  {
      "type": "url",
      "value": "SITE 2",
      "link": "http://www.ietf.org",
      "target": "parent"
  }
]`;

export const JSON_MODEL_TEXT_BUTTONS = `[
    {
        "type": "text",
        "value": "Support"
    },
    {
        "type": "text",
        "value": "Sales"
    }
]`;

export const JSON_MODEL_ACTION_ALIAS_BUTTONS = `[
    {
      "type":"action",
      "value":"Accept",
      "action":"accept",
      "alias": "accept, yes, I accept"
    },
    {
      "type":"action",
      "value":"No accept",
      "action":"no accept",
      "alias": "no,refuse"
    }
]`;


export const LIST_JSON_MODEL_REPLY_V1 = [
    {name: 'Action buttons', value: JSON_MODEL_ACTION_BUTTONS},
    {name: 'URL buttons', value: JSON_MODEL_URL_BUTTONS},
    {name: 'Text buttons', value: JSON_MODEL_TEXT_BUTTONS},
]

export const LIST_JSON_MODEL_REPLY_V2 = [
    {name: 'Action buttons', value: JSON_MODEL_ACTION_BUTTONS},
    {name: 'URL buttons', value: JSON_MODEL_URL_BUTTONS},
    {name: 'Text buttons', value: JSON_MODEL_TEXT_BUTTONS},
    {name: 'Action alias buttons', value: JSON_MODEL_ACTION_ALIAS_BUTTONS}
]