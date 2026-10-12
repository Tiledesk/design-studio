import { isReadOnlyRoute, ReadOnlyService } from './read-only.service';

/**
 * Sbagliare questa lettura vuol dire aprire in modifica un flusso gia' pubblicato:
 * e' l'errore che la preview esiste per non fare. La forma dei dati di rotta e'
 * insolita (un array di un oggetto, per via di RoleGuard) e l'ereditarieta' verso il
 * figlio a percorso vuoto puo' consegnarla in due modi diversi.
 */
describe('isReadOnlyRoute', () => {

  it('recognises the array shape, the one declared in the routing module', () => {
    expect(isReadOnlyRoute([{ roles: ['owner', 'admin'], readOnly: true }])).toBeTrue();
  });

  it('recognises the same data after Angular has merged it into an object', () => {
    expect(isReadOnlyRoute({ 0: { roles: ['owner', 'admin'], readOnly: true } })).toBeTrue();
  });

  it('recognises a plain object, in case the shape is ever normalised', () => {
    expect(isReadOnlyRoute({ readOnly: true })).toBeTrue();
  });

  it('says no for the editor route, which carries roles and nothing else', () => {
    expect(isReadOnlyRoute([{ roles: ['owner', 'admin'] }])).toBeFalse();
  });

  it('says no for empty or missing data rather than blowing up', () => {
    expect(isReadOnlyRoute({})).toBeFalse();
    expect(isReadOnlyRoute([])).toBeFalse();
    expect(isReadOnlyRoute(null)).toBeFalse();
    expect(isReadOnlyRoute(undefined)).toBeFalse();
  });

  it('demands the boolean true, so a stray "false" string cannot open the gate', () => {
    expect(isReadOnlyRoute([{ readOnly: 'false' }])).toBeFalse();
    expect(isReadOnlyRoute([{ readOnly: 0 }])).toBeFalse();
  });
});

/**
 * Il modo appartiene alla scheda del browser: si accende e non si spegne, cosi' nessuna
 * navigazione puo' riportare in modifica una scheda aperta in sola lettura.
 */
describe('ReadOnlyService', () => {

  it('starts off, so the editor is unaffected', () => {
    expect(new ReadOnlyService().readOnly).toBeFalse();
  });

  it('stays on once enabled, and offers no way back', () => {
    const service = new ReadOnlyService();
    service.enable();
    expect(service.readOnly).toBeTrue();
    expect((service as any).disable).toBeUndefined();
  });
});
