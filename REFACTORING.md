# Design Studio v3 — Refactoring

Migrazione del Design Studio alla versione 3. Il modello semplificato prevede blocchi (intent) con una sola action, drag & drop ridotto al solo trascinamento dal pannello sullo stage, e rimozione dei controlli di editing inline sulle action.

---

## Changelog

- **[v3] Versioning** — Introdotto `DS_VERSION = '3'` negli environment; campo `cds_version` scritto sul chatbot ad ogni salvataggio
- **[v3] 1 action per blocco** — Limite universale: ogni intent accetta al massimo una action
- **[v3] Drag interno rimosso** — Eliminato il riordino delle action all'interno dello stesso blocco
- **[v3] Drag cross-intent rimosso** — Eliminato lo spostamento di action tra blocchi diversi
- **[v3] Drag action→stage rimosso** — Eliminata la creazione di un nuovo blocco trascinando una action da un blocco esistente sullo stage
- **[v3] Drop su blocco rimosso** — I blocchi non accettano più drop di nessun tipo (rimosso `cdkDropList` dall'intent)
- **[v3] cds-action-controls rimosso** — Rimosso il menu edit/delete/copy inline su ogni action
- **[v3] Add action rimosso** — Rimossi il placeholder e il bottone "Add action" nei blocchi (vuoti e non)

---

## Dettaglio modifiche

### Versioning (`DS_VERSION`)
Aggiunto `DS_VERSION: '3'` in tutti i file environment (`environment.ts`, `environment.prod.ts`, `environment.pre.ts`). Aggiunto campo `cds_version?: string` al modello `Chatbot`. In `FaqKbService.updateFaqKb()` e `updateChatbot()`, il valore viene scritto su `chatbot.cds_version` prima di ogni salvataggio, così ogni JSON di chatbot porta traccia della versione del Design Studio con cui è stato generato.

### 1 action per blocco
Rimossa la condizione `isNewChatbot` che limitava a 1 action solo i chatbot creati dopo una certa data. Il limite è ora universale e applicato a tutti i blocchi indipendentemente dalla data di creazione. La proprietà `isNewChatbot` rimane nel componente per eventuali usi non legati al drag, ma non condiziona più la logica di drop.

### Drag interno rimosso
Rimossi da `cds-intent.component.html` gli attributi `cdkDrag`, `(cdkDragStarted)`, `(cdkDragReleased)`, `(cdkDragMoved)` da ogni `div.box-action`. Rimossi `*cdkDragPreview`, `*cdkDragPlaceholder` e `cdkDragHandle`. In `cds-intent.component.ts` eliminati i metodi `onDragStarted()`, `onDragEnded()`, `onDragMove()` e le proprietà `isDragging`, `actionDragPlaceholderWidth`, `hideActionDragPlaceholder`, `dragDisabled`.

### Drag cross-intent rimosso
Rimosso il case 2 di `onDropAction()` che chiamava `intentService.moveActionBetweenDifferentIntents()`. Con il limite di 1 action per blocco e senza `cdkDrag` sulle action, questo flusso non è più raggiungibile né necessario.

### Drag action→stage rimosso
In `cds-canvas.component.ts`, rimosso il branch `else if (action)` di `onDroppedElementToStage()` che gestiva il trascinamento di una action da un blocco esistente sullo stage (con conseguente creazione di un nuovo blocco). Rimosso il metodo `createNewIntentDraggingActionFromAnotherIntent()`. Rimane attivo solo il branch `if (action.value && action.value.type)` che gestisce il drag dal pannello sinistro.

### Drop su blocco rimosso
Rimosso il contenitore `cdkDropList` dall'actions list in `cds-intent.component.html`. I blocchi non ricevono più drop di nessun tipo. Rimossi di conseguenza `onDropAction()` e `canEnterDropList()` da `cds-intent.component.ts`, e l'import `@angular/cdk/drag-drop` (non più usato nel componente).

### cds-action-controls rimosso
Rimosso il tag `<cds-action-controls>` dal template di ogni action in `cds-intent.component.html`. Il componente forniva il menu contestuale edit/delete/copy inline su ogni action. La condizione `*ngIf="!isNewChatbot"` che lo controllava è stata rimossa insieme al tag.

### Add action rimosso
Rimossi da `cds-intent.component.html`:
- Il `div.add--action-placeholder` (mostrato nei blocchi vuoti) con testo descrittivo e bottone "+ Add action"
- Il `div.footer-intent` contenente il bottone "+ Add action" mostrato in fondo ai blocchi con almeno una action
