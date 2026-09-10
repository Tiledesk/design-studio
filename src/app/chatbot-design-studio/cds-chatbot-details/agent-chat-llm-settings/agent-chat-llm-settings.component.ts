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
  /** '' is the sentinel for "the deployment's own model": it is what the
   *  first, synthetic option in the dropdown carries. Saving with '' sends
   *  `model: null` rather than the default's id by name, so a deployment
   *  that later changes its default carries this project with it.
   *
   *  This used to be split across this field plus a separate
   *  `useDeploymentDefault` checkbox -- two pieces of state that could
   *  disagree (checkbox ticked, a different model still showing in the
   *  dropdown; save honouring one while the screen showed the other). A
   *  single control that is either the sentinel or a real id cannot
   *  disagree with itself. */
  selectedModelId = '';
  temperature: number | null = null;
  maxTokens: number | null = null;
  readOnly = false;
  loading = true;
  saving = false;
  /** An i18n key, not a sentence -- the template translates it. When it
   *  instead holds the runtime's own message (a save-time 400, say) that
   *  text has no matching key, and ngx-translate's fallback for a missing
   *  key is to render the value verbatim, which is exactly the raw server
   *  message we want in that case. */
  error: string | null = null;
  saved = false;

  constructor(
    public settings: AgentChatSettingsService,
    private dashboardService: DashboardService
  ) {}

  get defaultModel(): RuntimeModel | undefined {
    return this.models.find(m => m.default);
  }

  async ngOnInit(): Promise<void> {
    try {
      this.models = await this.settings.listModels();
      const current: ProjectModelSettings =
        await this.settings.read(this.dashboardService.projectID);
      this.apply(current);
    } catch (e: any) {
      if (e?.status === 403) {
        // The runtime 403s the GET as well as the PUT, so the current value
        // genuinely cannot be shown -- the template hides the form entirely
        // rather than leaving fields on screen that look like real state.
        this.readOnly = true;
        this.error = 'LlmSettingsForbidden';
      } else {
        this.error = 'LlmSettingsLoadError';
      }
    } finally {
      this.loading = false;
    }
  }

  private apply(current: ProjectModelSettings): void {
    this.selectedModelId = current?.model?.id ?? '';
    this.temperature = current?.model?.params?.temperature ?? null;
    this.maxTokens = current?.model?.params?.max_tokens ?? null;
  }

  onModelChange(id: string): void {
    this.selectedModelId = id;
    this.saved = false;
  }

  onTemperatureChange(value: number | null): void {
    this.temperature = value;
    this.saved = false;
  }

  onMaxTokensChange(value: number | null): void {
    this.maxTokens = value;
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
      const model = this.selectedModelId === ''
        ? null
        : { id: this.selectedModelId, params };
      const stored = await this.settings.save(this.dashboardService.projectID, model);
      this.apply(stored);
      this.saved = true;
    } catch (e: any) {
      this.error = e?.status === 403
        ? 'LlmSettingsForbidden'
        : (e?.error?.error?.message ?? 'LlmSettingsSaveError');
    } finally {
      this.saving = false;
    }
  }
}
