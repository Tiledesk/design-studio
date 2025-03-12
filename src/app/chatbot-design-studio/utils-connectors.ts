
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