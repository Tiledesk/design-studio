# Fixture per la parita' dei connettori

Qui stanno i flussi su cui la spec di parita' (`connector-catalog.parity.spec.ts`) confronta i
connettori prodotti dal catalogo nuovo con quelli del codice attuale (`createConnectorsOfIntent`
e `createMapOfConnectors` di `services/connector.service.ts`). Finche' i due elenchi non
coincidono al 100% su ogni fixture, il motore di disegno non si tocca.

## Come esportare un flusso reale

1. Dal Design Studio o con l'API: `GET /<projectId>/faq_kb/exportjson/<id_faq_kb>`.
2. Salvare il JSON qui con un nome che dica cosa copre, per esempio `legacy-reply-buttons.json`.
3. **Sanificare** prima di salvare: chiavi e segreti dentro `hubspot`, `make`, `customerio`,
   `brevo`, `n8n`, `webrequestv2.headers`, `askgptv2`/`ai_prompt` (chiavi dei modelli), i
   Global del bot, email e telefoni nei testi. La forma delle action va lasciata intatta.
4. Il file e' un array di intent (`faqs`) oppure un oggetto con `faqs` o `intents`: la spec
   accetta entrambi.

## Cosa deve coprire il campione

| fixture | cosa contiene |
|---|---|
| `legacy-reply-buttons.json` | reply v1 con bottoni `type: action`, anche nella forma `#id{...}`, `settings.noInputIntent/noMatchIntent` |
| `legacy-bare-ids.json` | destinazioni senza `#` (id nudi) e collegamenti per nome di blocco |
| `v3-ai-and-conditions.json` | `ai_condition`, `jsonconditionmulti`, `iteration` con `goto` e `fallback`, `capture_user_reply` con e senza `goToIntent`, famiglia true/false |
| `v3-return-stack.json` | blocco "Return to parent agent" con `nextBlockAction` ancora valorizzato |
| `voice.json` | `dtmf_menu`, `dtmf_form`, `blind_transfer`, `speech_form` |
| `dangling.json` | riferimenti a blocchi cancellati, `attributes.connectors` stantii e senza `id` |

Le fixture `synthetic-*.json` sono costruite a mano per coprire le forme nell'attesa dei
flussi reali: valgono meno, vanno sostituite appena possibile.
