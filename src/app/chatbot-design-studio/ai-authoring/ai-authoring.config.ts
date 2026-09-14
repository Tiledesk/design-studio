/**
 * Switch dell'authoring AI del V3: modale «Crea agente con l'AI» (sidebar), pulsante «AI» e
 * pannello AI nell'header (storia, versioni, modifica via prompt) e probe del modulo delle
 * revisioni sul server.
 *
 * Su questo branch il vibe coder è quello della chat in iframe (cartella `agent-chat`), quindi
 * l'authoring AI del V3 resta SPENTO di default: niente viene rimosso, tutto il codice resta e si
 * riaccende alzando questo switch. Un singolo ambiente può accenderlo dalla remote config con
 * `aiAgentGeneratorEnabled: true` senza toccare il codice.
 *
 * Con lo switch spento il generatore non riceve URL e chiave, quindi `isConfigured` è false: la
 * sidebar non mostra il pulsante, l'header non mostra «AI», il canvas non riapre il pannello e il
 * DS non interroga il modulo delle revisioni (release e cancellazioni non chiamano il server).
 */
export const AI_AGENT_GENERATOR_FEATURE_ENABLED = false;

export function isAiAgentGeneratorEnabled(appConfig: any): boolean {
  return AI_AGENT_GENERATOR_FEATURE_ENABLED || appConfig?.aiAgentGeneratorEnabled === true;
}
