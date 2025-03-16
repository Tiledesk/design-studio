
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
