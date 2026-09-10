import { Component, OnInit } from '@angular/core';
import { DashboardService } from 'src/app/services/dashboard.service';
import {
  AgentChatSettingsService, ProjectModelSettings, RuntimeModel
} from '../../agent-chat/agent-chat-settings.service';

/** The model the vibe coder runs on, for this whole project.
 *
 *  It lives in the chatbot settings panel because that is where the studio
 *  keeps settings, but what it configures is the *project* -- every agent in
 *  it, not the chatbot that happens to be open. The template says so in as
 *  many words: the surrounding panel implies otherwise, and a user who reads
 *  the layout instead of the copy would be misled. */
@Component({
  selector: 'cds-agent-chat-llm-settings',
  templateUrl: './agent-chat-llm-settings.component.html',
  styleUrls: ['./agent-chat-llm-settings.component.scss']
})
export class AgentChatLlmSettingsComponent implements OnInit {

  models: RuntimeModel[] = [];
  temperature: number | null = null;
  maxTokens: number | null = null;
  /** True while the project is on the deployment's own model: saving then
   *  clears the override rather than pinning the default by name, so a
   *  deployment that later changes its model carries this project with it.
   *
   *  Picking a specific id always means "not the deployment default" --
   *  enforced by the `selectedModelId` setter below rather than left to
   *  whichever call site happens to touch it, so a direct assignment (as a
   *  test, or any future caller, might make) can't leave this stale against
   *  the id it no longer describes. */
  useDeploymentDefault = true;
  readOnly = false;
  loading = true;
  saving = false;
  error: string | null = null;
  saved = false;

  private _selectedModelId = '';

  get selectedModelId(): string {
    return this._selectedModelId;
  }

  set selectedModelId(id: string) {
    this._selectedModelId = id;
    this.useDeploymentDefault = false;
  }

  constructor(
    public settings: AgentChatSettingsService,
    private dashboardService: DashboardService
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.models = await this.settings.listModels();
      const current: ProjectModelSettings =
        await this.settings.read(this.dashboardService.projectID);
      this.apply(current);
    } catch (e: any) {
      if (e?.status === 403) {
        this.readOnly = true;
        this.error = 'Only a project admin can change this.';
      } else {
        this.error = 'The runtime configuration could not be loaded.';
      }
    } finally {
      this.loading = false;
    }
  }

  private apply(current: ProjectModelSettings): void {
    const fallback = this.models.find(m => m.default)?.id ?? '';
    // Order matters: the setter above always clears `useDeploymentDefault` as
    // a side effect, so the authoritative value is written back afterwards.
    this.selectedModelId = current?.model?.id ?? fallback;
    this.useDeploymentDefault = !current?.model;
    this.temperature = current?.model?.params?.temperature ?? null;
    this.maxTokens = current?.model?.params?.max_tokens ?? null;
  }

  onModelChange(id: string): void {
    this.selectedModelId = id;
    this.saved = false;
  }

  async save(): Promise<void> {
    this.saving = true;
    this.error = null;
    this.saved = false;
    try {
      const params: { temperature?: number; max_tokens?: number } = {};
      if (this.temperature !== null && this.temperature !== undefined) {
        params.temperature = Number(this.temperature);
      }
      if (this.maxTokens !== null && this.maxTokens !== undefined) {
        params.max_tokens = Number(this.maxTokens);
      }
      const model = this.useDeploymentDefault
        ? null
        : { id: this.selectedModelId, params };
      const stored = await this.settings.save(this.dashboardService.projectID, model);
      this.apply(stored);
      this.saved = true;
    } catch (e: any) {
      this.error = e?.status === 403
        ? 'Only a project admin can change this.'
        : (e?.error?.error?.message ?? 'The setting could not be saved.');
    } finally {
      this.saving = false;
    }
  }
}
