/**
 * Gli interruttori del lavoro sui connettori. Stanno in un posto solo perche' si possano
 * spegnere da una riga, senza cercare nel codice, se qualcosa non torna su un flusso vero.
 */
export const CONNECTORS_CONFIG = {
  /** La lista dei connettori del bot (`attributes.connectors`) e' la fonte del disegno; spenta, si deriva dalle action a ogni apertura senza salvare. */
  useCollection: true,
  /** All'apertura, le riparazioni del flusso e la lista vengono salvate sul server. Spento: solo il rapporto in console. */
  repairSaveAtOpen: true,
  /** Quanti blocchi per richiesta quando si salvano le riparazioni in blocco. */
  repairSaveChunk: 50,
};

/** La versione del formato della lista: cambia solo se cambia la forma dei record. */
export const CONNECTORS_COLLECTION_VERSION = 1;
