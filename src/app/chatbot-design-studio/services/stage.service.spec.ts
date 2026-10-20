import { TestBed } from '@angular/core/testing';

import { StageService } from './stage.service';
import { ConnectorService } from './connector.service';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';

/** Storage finto: solo i due metodi usati dalla persistenza della tab. */
class FakeAppStorageService {
  private store: { [key: string]: string } = {};
  getItem(key: string): any { return this.store.hasOwnProperty(key) ? this.store[key] : null; }
  setItem(key: string, value: any): void { this.store[key] = value; }
  removeItem(key: string): void { delete this.store[key]; }
  clear(): void { this.store = {}; }
}

describe('StageService', () => {
  let service: StageService;
  let storage: FakeAppStorageService;

  beforeEach(() => {
    storage = new FakeAppStorageService();
    TestBed.configureTestingModule({
      providers: [
        StageService,
        { provide: AppStorageService, useValue: storage },
        { provide: ConnectorService, useValue: {} }
      ]
    });
    service = TestBed.inject(StageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  /**
   * La distinzione fra "nessuna preferenza" e "l'utente ha scelto Blocks" e' cio' che
   * permette di aprire Subagents al primo accesso senza sovrascrivere una scelta esplicita.
   */
  describe('getActiveLeftPanel', () => {

    it('restituisce null quando non esiste una preferenza salvata', () => {
      expect(service.getActiveLeftPanel('family-1')).toBeNull();
    });

    it('restituisce null con familyId vuoto', () => {
      expect(service.getActiveLeftPanel('')).toBeNull();
      expect(service.getActiveLeftPanel(null as any)).toBeNull();
    });

    it('restituisce la preferenza salvata', () => {
      service.saveActiveLeftPanel('family-1', 'blocks');
      expect(service.getActiveLeftPanel('family-1')).toBe('blocks');

      service.saveActiveLeftPanel('family-1', 'subagents');
      expect(service.getActiveLeftPanel('family-1')).toBe('subagents');
    });

    it('tiene separate le famiglie', () => {
      service.saveActiveLeftPanel('family-1', 'blocks');
      expect(service.getActiveLeftPanel('family-2')).toBeNull();
    });

    it('ignora un valore non riconosciuto in storage', () => {
      storage.setItem('cds_left_panel_family-1', 'qualcosa-di-strano');
      expect(service.getActiveLeftPanel('family-1')).toBeNull();
    });
  });
});
