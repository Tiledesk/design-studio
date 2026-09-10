import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { AppConfigService } from 'src/app/services/app-config';
import { readAgentChatConfig } from './agent-chat.config';

export interface RuntimeModel {
  id: string;
  label: string;
  provider: string;
  vision: boolean;
  pricing: unknown | null;
  default: boolean;
}

export interface ProjectModelSettings {
  project_id: string;
  model: { id: string; params: { temperature?: number; max_tokens?: number } } | null;
  updated_at: string | null;
  updated_by: string | null;
}

/** The design studio's own client for the runtime's project configuration.
 *
 *  It talks to the runtime through the chat's address, which is the only one
 *  this application is told: the chat's nginx reverse proxies `/v1/` to the
 *  runtime. The chat itself is not involved -- it never learns that a project
 *  can choose a model -- which is what keeps it a generic client of the
 *  runtime rather than a Tiledesk-specific one. */
@Injectable({ providedIn: 'root' })
export class AgentChatSettingsService {

  constructor(
    private http: HttpClient,
    private appConfigService: AppConfigService
  ) {}

  public isAvailable(): boolean {
    return readAgentChatConfig(this.appConfigService.getConfig()) !== null;
  }

  public async listModels(): Promise<RuntimeModel[]> {
    const res = await firstValueFrom(
      this.http.get<{ data: RuntimeModel[] }>(`${this.base()}/v1/models`,
                                              { headers: this.headers() }));
    return res?.data ?? [];
  }

  // `async`, not a bare `firstValueFrom(...)` return: `settingsUrl()` calls
  // `base()` eagerly, and `base()` throws synchronously when the chat isn't
  // configured. A `Promise<...>`-typed method that can throw synchronously is
  // a trap for a caller who writes `.catch(...)`, as `listModels()`'s own
  // `async` already protects it from doing -- these two must fail the same
  // way, as a rejection, not an uncaught exception.
  public async read(projectId: string): Promise<ProjectModelSettings> {
    return firstValueFrom(this.http.get<ProjectModelSettings>(
      this.settingsUrl(projectId), { headers: this.headers() }));
  }

  public async save(projectId: string,
                    model: ProjectModelSettings['model']): Promise<ProjectModelSettings> {
    return firstValueFrom(this.http.put<ProjectModelSettings>(
      this.settingsUrl(projectId), { model }, { headers: this.headers() }));
  }

  private settingsUrl(projectId: string): string {
    return `${this.base()}/v1/projects/${encodeURIComponent(projectId)}/settings`;
  }

  /** `readAgentChatConfig` has already stripped any trailing slash, so paths
   *  can be appended without doubling it. */
  private base(): string {
    const config = readAgentChatConfig(this.appConfigService.getConfig());
    if (!config) {
      throw new Error('the agent chat is not configured for this deployment');
    }
    return config.chatUrl;
  }

  /** `tiledesk_token` may hold the whole header or just the token, so the
   *  scheme is normalised rather than assumed -- sending `JWT JWT x` fails as
   *  an unauthenticated request, with nothing on screen to say why. Mirrors
   *  `stripTokenScheme` in agent-chat-host.service.ts. */
  private headers(): HttpHeaders {
    const stored = localStorage.getItem('tiledesk_token') || '';
    const bare = stored.replace(/^\s*jwt\s+/i, '');
    return new HttpHeaders({ Authorization: `JWT ${bare}` });
  }
}
