
export function checkGenericConnectionStatusOfAction(connectedTo:string, idConnector: string): any {
    const result = {
        isConnected: false,
        idConnection: null
    };
    if(connectedTo){
        result.isConnected = true;
        const posId = connectedTo.indexOf("#");
        if (posId !== -1) {
            const toId = connectedTo.slice(posId+1);
            result.idConnection = idConnector+"/"+toId;
        }
    } else {
        result.isConnected = false;
        result.idConnection = null;
    }
    return result;
}

export function checkConnectionStatusOfAction(action: any, idConnectorTrue: string, idConnectorFalse: string): any {
    const result = {
        isConnectedTrue: false,
        isConnectedFalse: false,
        idConnectionTrue: null,
        idConnectionFalse: null
    };
    if(action.trueIntent){
        result.isConnectedTrue = true;
        const posId = action.trueIntent.indexOf("#");
        if (posId !== -1) {
            const toId = action.trueIntent.slice(posId+1);
            result.idConnectionTrue = idConnectorTrue+"/"+toId;
        }
    } else {
        result.isConnectedTrue = false;
        result.idConnectionTrue = null;
    }
    if(action.falseIntent){
      result.isConnectedFalse = true;
      const posId = action.falseIntent.indexOf("#");
      if (posId !== -1) {
        const toId = action.falseIntent.slice(posId+1);
        result.idConnectionFalse = idConnectorFalse+"/"+toId;
      }
    } else {
        result.isConnectedFalse = false;
        result.idConnectionFalse = null;
    }
    return result;
}



export function checkConnectionStatusByConnector(toIntentId: any, idConnector: string){
    const result = {
        isConnected: false,
        idConnection: null
    };
    if(toIntentId){
        result.isConnected = true;
        const posId = toIntentId.indexOf("#");
        if (posId !== -1) {
            const toId = toIntentId.slice(posId+1);
            result.idConnection = idConnector+"/"+toId;
        }
    } else {
        result.isConnected = false;
        result.idConnection = null;
    }
    return result;
}



export function updateConnector(connector, action, isConnectedTrue, isConnectedFalse, idConnectionTrue, idConnectionFalse): any {
    if (!connector?.fromId) {
        return;
    }
    const segments = connector.fromId.split('/');
    if (segments.length < 2) {
        return;
    }
    const idAction = segments[1];
    if (idAction !== action._tdActionId) {
        return;
    }
    const lastSegment = segments[segments.length - 1];
    const isTrueSegment = lastSegment === 'true';
    const isFalseSegment = lastSegment === 'false';
    let resp = {
        action: action,
        isConnectedTrue: isConnectedTrue,
        isConnectedFalse: isConnectedFalse,
        idConnectionTrue: idConnectionTrue,
        idConnectionFalse: idConnectionFalse,
        emit: false
    }
      // Gestione della cancellazione del connector
    if (connector.deleted) {
        if (isTrueSegment) {
            resp.action.trueIntent = null;
            resp.isConnectedTrue = false;
            resp.idConnectionTrue = null;
        }
        if (isFalseSegment) {
            resp.action.falseIntent = null;
            resp.isConnectedFalse = false;
            resp.idConnectionFalse = null;
        }
        if (connector.save) {
            resp.emit = true;
        }
        return resp;
    }
    // Aggiornamento per il ramo "true"
    if (isTrueSegment) {
        resp.action.trueIntent = '#' + connector.toId;
        resp.isConnectedTrue = true;
        resp.idConnectionTrue = connector.id;
        if (connector.save) {
            resp.emit = true;
        }
    }
    // Aggiornamento per il ramo "false"
    if (isFalseSegment) {
        resp.action.falseIntent = '#' + connector.toId;
        resp.isConnectedFalse = true;
        resp.idConnectionFalse = connector.id;
        if (connector.save) {
            resp.emit = true;
        }
    }
    return resp;
  }



    export function updateSingleConnector(connector, action, isConnected, idConnection): any {
        if (!connector?.fromId) {
            return;
        }
        const segments = connector.fromId.split('/');
        if (segments.length < 2) {
            return;
        }
        const idAction = segments[1];
        if (idAction !== action._tdActionId) {
            return;
        }
        const lastSegment = segments[segments.length - 1];
        let resp = {
            action: action,
            isConnected: isConnected,
            idConnection: idConnection,
            emit: false
        }
        if(connector.deleted){ 
            // DELETE 
            action.intentName = null;
            action.goToIntent = null;
            resp.isConnected = false;
            resp.idConnection = null;
        } else { 
            // ADD / EDIT
            resp.isConnected = true;
            resp.idConnection = connector.fromId+"/"+connector.toId;
            action.goToIntent = "#"+connector.toId;
            action.intentName = "#"+connector.toId;
        };
        // Aggiornamento per il ramo 
        if (lastSegment) {
            resp.action.falseIntent = '#' + connector.toId;
            resp.isConnected = true;
            resp.idConnection = connector.id;
            if (connector.save) {
                resp.emit = true;
            }
        }
        return resp;
    }

/**
 * Campi di una action che indicano il blocco dove andare. Il motore li legge come
 * comando `/<valore>` e cerca il blocco per id SOLO se il valore comincia con '#'
 * (MongodbBotsDataSource.getByIntentDisplayNameCache): senza '#' lo cerca per nome,
 * non lo trova e il flusso si ferma, mentre il canvas lo disegna collegato lo stesso.
 */
export const ACTION_DESTINATION_FIELDS: string[] = [
    'trueIntent', 'falseIntent', 'goToIntent', 'fallbackIntent',
    'elseIntent', 'errorIntent', 'noInputIntent', 'noMatchIntent'
];

/**
 * Rimette il '#' davanti all'id di un blocco quando manca. `isIntentId` dice se il
 * valore e' davvero l'id di un blocco: un valore che non lo e' (un nome di blocco
 * dei flussi piu' vecchi, un vuoto) resta com'e'.
 */
export function withDestinationHash(value: any, isIntentId: (id: string) => boolean): any {
    if (typeof value !== 'string') { return value; }
    const trimmed = value.trim();
    if (trimmed === '' || trimmed.startsWith('#')) { return value; }
    return isIntentId(trimmed) ? '#' + trimmed : value;
}

/**
 * Applica withDestinationHash a ogni destinazione della action: i campi di
 * ACTION_DESTINATION_FIELDS, i rami dell'AI Condition (`intents[].conditionIntentId`)
 * e i casi della condizione a piu' uscite (`cases[].intent`). Restituisce true se ha
 * cambiato qualcosa.
 */
export function fixActionDestinationHashes(action: any, isIntentId: (id: string) => boolean): boolean {
    if (!action || typeof action !== 'object') { return false; }
    let changed = false;
    const fix = (holder: any, key: string) => {
        const fixed = withDestinationHash(holder[key], isIntentId);
        if (fixed !== holder[key]) {
            holder[key] = fixed;
            changed = true;
        }
    };
    ACTION_DESTINATION_FIELDS.forEach(field => fix(action, field));
    if (Array.isArray(action.intents)) {
        action.intents.forEach((entry: any) => { if (entry && typeof entry === 'object') { fix(entry, 'conditionIntentId'); } });
    }
    if (Array.isArray(action.cases)) {
        action.cases.forEach((branch: any) => { if (branch && typeof branch === 'object') { fix(branch, 'intent'); } });
    }
    return changed;
}
