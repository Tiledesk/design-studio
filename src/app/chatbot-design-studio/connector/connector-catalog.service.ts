import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TYPE_ACTION, TYPE_ACTION_CATEGORY } from '../utils-actions';
import { ConnectorActionEntry, ConnectorManifest, ConnectorManifestGroup } from './connector-manifest.model';
import { ConnectorTriggerGroup } from './connector-trigger.model';

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

export interface ConnectorSubgroup {
  id: string;
  name: string;
  icon: string;
  entries: ConnectorPaletteEntry[];
}

export interface ConnectorGroup {
  id: string;
  name: string;
  icon: string;
  entries: ConnectorPaletteEntry[];
  subgroups: ConnectorSubgroup[];
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

  private titleCase(id: string): string {
    return id ? id.charAt(0).toUpperCase() + id.slice(1) : id;
  }

  toConnectorSubgroups(manifest: ConnectorManifest): ConnectorSubgroup[] {
    const entries = this.toPaletteEntries(manifest);
    const groupDefs: ConnectorManifestGroup[] = manifest.groups || [];
    const connectorIcon = manifest.connector?.icon || 'assets/images/actions/web_request.svg';
    const orderOf = (id: string) => {
      const def = groupDefs.find(g => g.id === id);
      return def?.order !== undefined ? def.order : Number.MAX_SAFE_INTEGER;
    };
    const buckets = new Map<string, ConnectorPaletteEntry[]>();
    entries.forEach(e => {
      const gid = e.connectorEntry?.group || '';
      if (!buckets.has(gid)) { buckets.set(gid, []); }
      buckets.get(gid).push(e);
    });
    return Array.from(buckets.entries())
      .map(([id, es]) => {
        const def = groupDefs.find(g => g.id === id);
        return {
          id,
          name: (def && def.name) || this.titleCase(id),
          icon: (def && def.icon) || connectorIcon,
          entries: es,
        };
      })
      .sort((a, b) => orderOf(a.id) - orderOf(b.id) || a.name.localeCompare(b.name));
  }

  toConnectorGroup(manifest: ConnectorManifest): ConnectorGroup {
    return {
      id: manifest.connector?.id,
      name: manifest.connector?.name,
      icon: manifest.connector?.icon || 'assets/images/actions/web_request.svg',
      entries: this.toPaletteEntries(manifest),
      subgroups: this.toConnectorSubgroups(manifest),
    };
  }

  toTriggerGroup(manifest: ConnectorManifest, baseUrl: string, apiKey?: string): ConnectorTriggerGroup {
    return {
      id: manifest.connector?.id,
      name: manifest.connector?.name,
      icon: manifest.connector?.icon || 'assets/images/actions/web_request.svg',
      baseUrl,
      apiKey,
      entries: (manifest.triggers || []).map(t => ({ ...t, icon: manifest.connector?.icon })),
      groups: manifest.groups || [],
    };
  }
}
