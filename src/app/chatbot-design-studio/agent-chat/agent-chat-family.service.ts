import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from 'src/app/services/dashboard.service';
import { FaqKbService } from 'src/app/services/faq-kb.service';

export interface FamilyMember { _id: string; name: string; }

export interface Family {
  root_id: string;
  root_name: string;
  is_subagent: boolean;
  subagents: FamilyMember[];
}

/**
 * Ordina i subagent per nome, in ordine alfabetico.
 *
 * `localeCompare` con `sensitivity: 'base'` ignora maiuscole e accenti (cosi' "Ordini"
 * e "ordini" non finiscono in due blocchi separati) e `numeric: true` confronta i numeri
 * come numeri: "Agente 2" precede "Agente 10", che con l'ordinamento per stringa
 * finirebbe prima.
 *
 * Funzione pura, esportata anche da `cds-panel-subagents.component.ts` (re-export) cosi'
 * i chiamanti esistenti restano invariati.
 */
export function sortSubagentsByName(items: FamilyMember[]): FamilyMember[] {
  return [...items].sort((a, b) =>
    (a?.name || '').localeCompare(b?.name || '', undefined, { sensitivity: 'base', numeric: true })
  );
}

/** Who is in this family, and how to add to it.
 *
 *  The Subagents panel worked this out for itself, and the chat host needs the
 *  same answer: two copies of "the root is the open chatbot, or its parent_id
 *  when the open chatbot is a subagent" can disagree, and the one that
 *  disagrees would create a subagent under a subagent. */
@Injectable({ providedIn: 'root' })
export class AgentChatFamilyService {

  constructor(
    private dashboardService: DashboardService,
    private faqKbService: FaqKbService
  ) {}

  public isSubagent(): boolean {
    return (this.dashboardService.selectedChatbot as any)?.subtype === 'subagent';
  }

  public rootId(): string {
    const current: any = this.dashboardService.selectedChatbot;
    return this.isSubagent() ? current?.parent_id : this.dashboardService.id_faq_kb;
  }

  public async read(): Promise<Family> {
    const rootId = this.rootId();
    const current: any = this.dashboardService.selectedChatbot;
    const rootName = this.isSubagent()
      ? (await firstValueFrom(this.faqKbService.getBotById(rootId)) as any)?.name ?? ''
      : current?.name ?? '';
    const raw: any = await firstValueFrom(this.faqKbService.getSubagentsByFaqKbId(rootId));
    const list: any[] = Array.isArray(raw) ? raw : (raw?.subagents || raw?.data || []);
    return {
      root_id: rootId,
      root_name: rootName,
      is_subagent: this.isSubagent(),
      subagents: sortSubagentsByName(list.map(c => ({ _id: c._id, name: c.name })))
    };
  }

  public async contains(faqKbId: string): Promise<boolean> {
    if (!faqKbId) { return false; }
    const family = await this.read();
    return faqKbId === family.root_id || family.subagents.some(s => s._id === faqKbId);
  }

  /** The payload is the one the New-subagent modal sends
   *  (`cds-new-subagent-dialog.component.ts`), field for field. Two ways to
   *  create the same thing must not produce two different things. */
  public async createSubagent(name: string): Promise<FamilyMember> {
    const payload = {
      id_project: this.dashboardService.projectID,
      language: 'en',
      name: (name ?? '').trim(),
      subtype: 'subagent',
      template: 'blank',
      type: 'tilebot',
      parent_id: this.rootId()
    };
    try {
      const created: any = await firstValueFrom(this.faqKbService.createFaqKb(payload as any));
      return { _id: created?._id, name: created?.name };
    } catch (error: any) {
      throw new Error(
        error?.error?.msg || error?.error?.message || error?.message ||
        'Error while creating the subagent.');
    }
  }
}
