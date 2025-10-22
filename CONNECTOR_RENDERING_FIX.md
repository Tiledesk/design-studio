# Fix Rendering Connettori con Connessione Lenta

## Branch
`features/from-master/ds-generic-bug-fix-26`

## Problema Risolto
Con connessioni molto lente, `#drawConnector` in `tiledesk-connectors.js` non disegnava i connettori perché gli elementi DOM delle actions non erano ancora completamente renderizzati quando veniva chiamato il metodo di disegno.

## Modifiche Implementate

### 1. **connector.service.ts** - Sistema di Retry Automatico

#### Nuove Proprietà (linee ~37-40):
```typescript
// Coda per connettori che hanno fallito il rendering
private failedConnectorsQueue: Array<{
  intent: any, 
  fromId: string, 
  toId: string, 
  attributes: any, 
  retryCount: number
}> = [];
private retryIntervalId: any = null;
private readonly MAX_RETRY_ATTEMPTS = 5;
```

#### Nuove Funzioni da Aggiungere:

**a) `addToRetryQueue()`** - Aggiunge connettori falliti alla coda
```typescript
private addToRetryQueue(intent: any, fromId: string, toId: string, attributes: any) {
  this.failedConnectorsQueue.push({
    intent,
    fromId,
    toId,
    attributes,
    retryCount: 0
  });
  
  if (!this.retryIntervalId) {
    this.startRetryProcess();
  }
}
```

**b) `startRetryProcess()`** - Avvia il processo di retry (ogni 500ms)
```typescript
private startRetryProcess() {
  this.logger.log('[CONNECTOR-SERV] Avvio processo retry per connettori falliti');
  
  this.retryIntervalId = setInterval(async () => {
    if (this.failedConnectorsQueue.length === 0) {
      this.logger.log('[CONNECTOR-SERV] Coda retry vuota, termino processo');
      this.stopRetryProcess();
      return;
    }
    
    this.logger.log('[CONNECTOR-SERV] Ritento creazione connettori, coda:', this.failedConnectorsQueue.length);
    
    const connectorsToRetry = [...this.failedConnectorsQueue];
    this.failedConnectorsQueue = [];
    
    for (const connector of connectorsToRetry) {
      connector.retryCount++;
      
      if (connector.retryCount > this.MAX_RETRY_ATTEMPTS) {
        this.logger.error('[CONNECTOR-SERV] Connettore fallito definitivamente dopo', this.MAX_RETRY_ATTEMPTS, 'tentativi:', connector.fromId, connector.toId);
        continue;
      }
      
      const success = await this.createConnectorFromId(
        connector.fromId, 
        connector.toId, 
        false, 
        connector.attributes
      );
      
      if (!success) {
        this.failedConnectorsQueue.push(connector);
      } else {
        this.logger.log('[CONNECTOR-SERV] Connettore creato con successo al tentativo', connector.retryCount, ':', connector.fromId, connector.toId);
      }
    }
  }, 500);
}
```

**c) `stopRetryProcess()`** - Ferma il processo di retry
```typescript
private stopRetryProcess() {
  if (this.retryIntervalId) {
    clearInterval(this.retryIntervalId);
    this.retryIntervalId = null;
  }
}
```

**d) `clearRetryQueue()`** - Pulisce la coda (public)
```typescript
public clearRetryQueue() {
  this.failedConnectorsQueue = [];
  this.stopRetryProcess();
}
```

#### Modifiche a Funzioni Esistenti:

**e) `createConnector()` → async** - Gestisce fallimenti
```typescript
private async createConnector(intent, idConnectorFrom, idConnectorTo){
  const connectorsAttributes = intent.attributes.connectors;
  this.logger.log('[DEBUG] - createConnector ->', intent, connectorsAttributes, idConnectorFrom, idConnectorTo);
  if(idConnectorFrom && idConnectorTo){
    let attributes = {};
    if(connectorsAttributes && connectorsAttributes[idConnectorFrom]){
      attributes = connectorsAttributes[idConnectorFrom];
    }
    this.logger.log('[DEBUG] - createConnector attributes ->', idConnectorFrom, connectorsAttributes, attributes);
    const success = await this.createConnectorFromId(idConnectorFrom, idConnectorTo, false, attributes);
    
    // Se fallisce, aggiunge alla coda retry
    if (!success) {
      this.logger.log('[CONNECTOR-SERV] Connettore fallito, aggiunto alla coda retry:', idConnectorFrom, idConnectorTo);
      this.addToRetryQueue(intent, idConnectorFrom, idConnectorTo, attributes);
    }
  } else {
    this.logger.log('[DEBUG] - il connettore è rotto non esiste intent ->', idConnectorTo);
  }
}
```

**f) `createConnectors()` → async** - Pulisce coda prima di iniziare
```typescript
public async createConnectors(intents){
  this.listOfIntents = intents;
  this.clearRetryQueue(); // Pulisce coda precedente
  
  for (const intent of intents) {
    await this.createConnectorsOfIntent(intent);
  }
}
```

**g) `createConnectorsOfIntent()` → async**
```typescript
public async createConnectorsOfIntent(intent:any){
  // ... il resto del codice rimane uguale, solo aggiunto async
}
```

---

### 2. **cds-canvas.component.ts** - Ritardo Rendering

#### Modifiche alla Funzione:

**a) `onAllIntentsRendered()` - Aggiunto ritardo prima del disegno** (linea ~307-320)
```typescript
async onAllIntentsRendered() {
  this.labelInfoLoading = 'CDSCanvas.intentsComplete';
  this.logger.log("[CDS-CANVAS]  •••• Tutti i cds-intent sono stati renderizzati ••••", this.countRenderedElements);
  
  // Aspetta che Angular completi il rendering delle actions e dei loro connettori
  // Usa sia setTimeout che requestAnimationFrame per essere sicuri che il DOM sia pronto
  setTimeout(() => {
    requestAnimationFrame(() => {
      this.logger.log("[CDS-CANVAS]  •••• Inizio disegno connettori dopo rendering completo ••••");
      this.connectorService.createConnectors(this.listOfIntents);
      this.renderedAllIntents = true;
    });
  }, 100);
}
```

#### Pulizia Risorse:

**b) `ngOnDestroy()` - Aggiunta pulizia coda** (linea ~189-192)
```typescript
ngOnDestroy() {
  // Pulisci la coda di retry dei connettori
  this.connectorService.clearRetryQueue();
  
  // ... resto del codice esistente
}
```

**c) `initialize()` - Pulisce coda all'inizializzazione** (linea ~567-576)
```typescript
private async initialize(){
  this.selectedChatbot = this.dashboardService.selectedChatbot;
  this.projectID = this.dashboardService.projectID;
  this.id_faq_kb = this.dashboardService.id_faq_kb;
  this.listOfIntents = [];
  
  // Pulisci la coda di retry dei connettori prima di inizializzare un nuovo bot
  this.connectorService.clearRetryQueue();
  
  // ... resto del codice esistente
}
```

---

## Flusso Completo di Funzionamento

```
1. Intent renderizzati → onAllIntentsRendered()
   ↓
2. Aspetta 100ms + 1 frame (setTimeout + requestAnimationFrame)
   ↓
3. DOM stabile → createConnectors()
   ↓
4. Per ogni connettore → createConnectorFromId()
   ↓
5a. Successo ✓ → Connettore disegnato
   ↓
5b. Fallimento ✗ → Aggiunto a failedConnectorsQueue
   ↓
6. Timer controlla coda ogni 500ms
   ↓
7. Ritenta fino a 5 volte
   ↓
8a. Successo ✓ → Rimosso dalla coda
   ↓
8b. Fallimento finale ✗ → Errore loggato
```

---

## Vantaggi

✅ **Gestisce connessioni lente**: Retry automatico se elementi non pronti  
✅ **Non blocca UI**: Processo asincrono  
✅ **Robusto**: Fino a 5 tentativi con intervalli di 500ms  
✅ **Pulito**: Nessun memory leak, pulizia automatica  
✅ **Logging dettagliato**: Facile debugging  
✅ **Fino a ~3.5 secondi** totali per connettore  

---

## Test

Per testare con connessione lenta:
1. DevTools → Network → Throttling → "Slow 3G"
2. Ricaricare bot
3. Verificare che i connettori appaiano anche se lenti

---

## File Modificati
- `src/app/chatbot-design-studio/services/connector.service.ts`
- `src/app/chatbot-design-studio/cds-dashboard/cds-canvas/cds-canvas.component.ts`

---

## Note Tecniche
- Timeout iniziale 100ms: compromesso velocità/affidabilità
- Intervallo retry 500ms: permette aggiornamento DOM
- `isElementOnTheStage()` già aveva timeout 1000ms
- Totale: fino a 3.5 secondi (5 × 500ms + timeout iniziale)

