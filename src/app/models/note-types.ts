// Note type for the stage notes.
// IMPORTANT: legacy saved notes may still have type 'image' or 'video'.
// We normalize them to 'media' at load time.
export type NoteType = 'text' | 'rect' | 'media';

/**
 * Payload opzionale per tipi di nota non testuali (immagini/video/shape).
 * Per retro-compatibilità le note testuali continuano ad usare `Note.text`.
 *
 * Nota: teniamo questo typing volutamente "soft" per non forzare migrazioni
 * massicce nel codice esistente. Quando introdurremo i nuovi renderer, potremo
 * specializzare meglio questi payload.
 */
export type NotePayload = Record<string, any>;


