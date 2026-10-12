/**
 * Gli interruttori del lavoro sui connettori degli agenti V3. Stanno in un posto solo perche' si
 * possano spegnere da una riga, senza cercare nel codice, se qualcosa non torna su un flusso vero.
 * Niente qui riguarda gli agenti V2: per loro vale il servizio preso da master, senza interruttori.
 */
export const CONNECTORS_CONFIG = {
  /** All'apertura di un V3, le riparazioni del flusso e la lista del bot vengono salvate sul server. Spento: solo il rapporto in console. */
  repairSaveAtOpen: true,
  /** Quanti blocchi per richiesta quando si salvano le riparazioni in blocco. */
  repairSaveChunk: 50,
  /**
   * V3: il JSON dell'agente non porta piu' le destinazioni alla maniera V2. All'apertura i blocchi
   * che le hanno ancora vengono salvati ripuliti (dopo la lista), e a ogni salvataggio i campi di
   * destinazione delle action e del pallino (NON i bottoni) partono vuoti: la lista
   * `attributes.connectors` del bot e' l'unica verita'. RICHIEDE IL MOTORE CHE LEGGE LA LISTA
   * (tiledesk-chatbot con ConnectorsV3): con un motore vecchio i V3 ripuliti non seguono piu' i
   * collegamenti. Spento: i campi viaggiano pieni e uguali alla lista (dato duplicato).
   */
  v3CleanDestinations: true,
};

/**
 * I tipi di action per cui e' lo store a scrivere e SALVARE il campo di destinazione quando un
 * connettore nasce o muore sul canvas. Per gli altri lo store scrive comunque il campo (e' lo
 * stesso valore), ma il salvataggio resta al componente, che ancora si sottoscrive al vecchio
 * stream: cosi' non ci sono salvataggi doppi. Vale per V2 e V3: i componenti sono condivisi.
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
