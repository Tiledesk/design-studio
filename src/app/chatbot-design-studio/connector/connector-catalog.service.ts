import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TYPE_ACTION, TYPE_ACTION_CATEGORY } from '../utils-actions';
import { ConnectorActionEntry, ConnectorManifest } from './connector-manifest.model';

export interface ConnectorPaletteEntry {
  name: string;
  chatbot_types: any[];
  category: TYPE_ACTION_CATEGORY;
  type: TYPE_ACTION;                // == TYPE_ACTION.CONNECTOR (palette marker)
  src: string;
  status: 'active';
  connectorRef: string;             // entry.id
  connectorEntry: ConnectorActionEntry;
}

export interface ConnectorGroup {
  id: string;
  name: string;
  icon: string;
  entries: ConnectorPaletteEntry[];
}

@Injectable({ providedIn: 'root' })
export class ConnectorCatalogService {
  constructor(private http: HttpClient) {}

  fetchManifest(baseUrl: string): Observable<ConnectorManifest> {
    return this.http.get(`${baseUrl}/api/manifest`).pipe(
      map((r: any) => r.data as ConnectorManifest)
    );
  }

  toPaletteEntries(manifest: ConnectorManifest): ConnectorPaletteEntry[] {
    return manifest.actions.map(a => ({
      name: a.name,
      chatbot_types: [],
      category: TYPE_ACTION_CATEGORY.INTEGRATIONS,
      type: TYPE_ACTION.CONNECTOR,
      src: manifest.connector?.icon || 'assets/images/actions/web_request.svg',
      status: 'active' as const,
      connectorRef: a.id,
      connectorEntry: { ...a, icon: manifest.connector?.icon }
    }));
  }

  toConnectorGroup(manifest: ConnectorManifest): ConnectorGroup {
    return {
      id: manifest.connector?.id,
      name: manifest.connector?.name,
      icon: manifest.connector?.icon || 'assets/images/actions/web_request.svg',
      entries: this.toPaletteEntries(manifest),
    };
  }
}
