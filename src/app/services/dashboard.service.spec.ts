import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(() => {
    LoggerInstance.setInstance({ log() {}, error() {}, warn() {}, info() {}, debug() {}, setLoggerConfig() {} } as any);
    // Costruito a mano: il costruttore non usa le dipendenze, e via TestBed il servizio
    // trascinerebbe HttpClient, Router, AppStorageService e il resto della catena.
    service = new DashboardService(null as any, null as any, null as any, null as any);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('resolveDsVersion: la versione dell\'editor la decide solo attributes.dsVersion', () => {
    const resolve = (chatbot: any) => (service as any).resolveDsVersion(chatbot);

    it('v3 apre con il V3', () => {
      resolve({ attributes: { dsVersion: 'v3' } });
      expect(service.isV3).toBeTrue();
      expect(service.isV3$.value).toBeTrue();
    });

    it('maiuscole e spazi non contano', () => {
      resolve({ attributes: { dsVersion: ' V3 ' } });
      expect(service.isV3).toBeTrue();
    });

    it('senza etichetta, o con un valore diverso, e\' legacy (V2)', () => {
      resolve({ attributes: { dsVersion: 'v3' } });
      resolve({ attributes: {}, createdAt: '2026-08-31T23:59:59.000Z' });
      expect(service.isV3).toBeFalse();
      expect(service.isV3$.value).toBeFalse();
      resolve({ attributes: { dsVersion: 'v4' }, createdAt: '2026-10-01T00:00:00.000Z' });
      expect(service.isV3).toBeFalse();
      resolve(null);
      expect(service.isV3).toBeFalse();
    });

    it('TEMPORANEO: senza etichetta ma creato dal 1 settembre 2026 apre con il V3', () => {
      resolve({ attributes: {}, createdAt: '2026-09-01T00:00:00.000Z' });
      expect(service.isV3).toBeTrue();
      resolve({ createdAt: '2026-10-09T14:55:00.000Z' });
      expect(service.isV3).toBeTrue();
      resolve({ createdAt: '2026-08-31T23:59:59.999Z' });
      expect(service.isV3).toBeFalse();
      resolve({ attributes: {} });
      expect(service.isV3).toBeFalse();
    });
  });
});
