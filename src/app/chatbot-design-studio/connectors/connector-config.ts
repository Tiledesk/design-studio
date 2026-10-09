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

/**
 * I tipi di action per cui e' lo store a scrivere e SALVARE il campo di destinazione quando un
 * connettore nasce o muore sul canvas. Per gli altri lo store scrive comunque il campo (e' lo
 * stesso valore), ma il salvataggio resta al componente, che ancora si sottoscrive al vecchio
 * stream: cosi' durante la migrazione non ci sono salvataggi doppi. Cresce con la fase 4.
 */
export const STORE_OWNED_TYPES: ReadonlySet<string> = new Set<string>([
  'ifonlineagents', 'ifonlineagentsv2', 'ifopenhours', 'jsoncondition', 'jsoncondition2',
  'askgpt', 'askgptv2', 'gpt_task', 'gpt_assistant', 'ai_prompt', 'webrequestv2', 'data_table',
  'make', 'hubspot', 'customerio', 'brevo', 'n8n', 'qapla', 'send_whatsapp', 'invoke_subagent',
  'reply', 'replyv2', 'randomreply',
  'intent', 'connect_block', 'capture_user_reply', 'iteration', 'jsonconditionmulti',
  /** Il pallino del blocco (`attributes.nextBlockAction`). */
  'next',
]);

/** La versione del formato della lista: cambia solo se cambia la forma dei record. */
export const CONNECTORS_COLLECTION_VERSION = 1;
