import { Injectable } from '@angular/core';
import { AppStorageService } from 'src/chat21-core/providers/abstract/app-storage.service';
import { environment } from 'src/environments/environment';
import { BRAND_BASE_INFO } from '../chatbot-design-studio/utils-resources';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

/**
 * Service per gestire la logica del changelog
 * Centralizza la logica di verifica e salvataggio dello stato changelog
 */
@Injectable({
  providedIn: 'root'
})
export class ChangelogService {
  private logger: LoggerService = LoggerInstance.getInstance();

  constructor(
    private appStorageService: AppStorageService
  ) {}

  /**
   * Verifica se il changelog deve essere mostrato
   * @returns true se il changelog deve essere mostrato, false altrimenti
   */
  shouldShowChangelog(): boolean {
    if (!BRAND_BASE_INFO['DOCS']) {
      return false;
    }

    const changelogKey = this.appStorageService.getItem("changelog");
    
    // Se non c'è una chiave salvata, mostra il changelog
    if (!changelogKey) {
      return true;
    }

    // Se la versione è cambiata, verifica se è una minor version diversa
    if (changelogKey && changelogKey !== environment.VERSION) {
      const storedMinorVersion = changelogKey.split('.')[1];
      const localMinorVersion = environment.VERSION.split('.')[1];
      
      // Mostra changelog solo se la minor version è cambiata
      return storedMinorVersion !== localMinorVersion;
    }

    return false;
  }

  /**
   * Marca il changelog come visto salvando la versione corrente
   */
  markChangelogAsSeen(): void {
    try {
      this.appStorageService.setItem('changelog', environment.VERSION);
      this.logger.log('[CHANGELOG-SERVICE] Changelog marked as seen for version:', environment.VERSION);
    } catch (error) {
      this.logger.error('[CHANGELOG-SERVICE] Error marking changelog as seen:', error);
    }
  }

  /**
   * Ottiene la versione salvata del changelog
   * @returns La versione salvata o null se non presente
   */
  getSavedVersion(): string | null {
    return this.appStorageService.getItem("changelog");
  }
}
