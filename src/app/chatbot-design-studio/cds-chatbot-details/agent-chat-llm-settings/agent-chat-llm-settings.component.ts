import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
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

  /** Fired once when this deployment declares no `model_catalog` at all, so
   *  the parent can drop the tab rather than leave it opening onto nothing.
   *  Not an error: §4 says such a deployment must behave exactly as it did
   *  before this feature existed, and most of them are in that state. */
  @Output() unavailable = new EventEmitter<void>();

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
  /** The deployment declares no catalog (`409 not_configured`). Nothing is
   *  wrong, so nothing is said: the template renders no form and no message. */
  notConfigured = false;
  loading = true;
  saving = false;
  /** An i18n key, not a sentence -- the template translates it. When it
   *  instead holds the runtime's own message (a save-time 400, say) that
   *  text has no matching key, and ngx-translate's fallback for a missing
   *  key is to render the value verbatim, which is exactly the raw server
   *  message we want in that case. */
  error: string | null = null;
  saved = false;

  /** Resolved once in `ngOnInit`: `optionLabel` is called from the template
   *  on every change-detection pass, and the translate pipe is not available
   *  to it there. */
  private defaultMarker = 'LlmSettingsDefault';

  constructor(
    public settings: AgentChatSettingsService,
    private dashboardService: DashboardService,
    private translate: TranslateService
  ) {}

  get defaultModel(): RuntimeModel | undefined {
    return this.models.find(m => m.default);
  }

  /** Everything except the deployment default, which the sentinel option
   *  already offers. `GET /v1/models` always includes the default flagged
   *  `default: true`, so looping over the whole list rendered it twice --
   *  two indistinguishable lines, and picking the second one pinned the
   *  project to that model *by name*, which is the outcome §4.1 exists to
   *  prevent (and makes every run build a model instead of reusing the boot
   *  instance, since such an override is still `is_override: true`). */
  get selectableModels(): RuntimeModel[] {
    return this.models.filter(m => !m.default);
  }

  /** The option's text, as a plain string.
   *
   *  It has to be built here rather than in the template: the marker used to
   *  be a `<span *ngIf>` nested inside the `<option>`, and a browser renders
   *  no elements inside an option -- so the one thing that distinguished the
   *  default from its duplicate never appeared on screen. */
  optionLabel(model: RuntimeModel | undefined): string {
    if (!model) { return ''; }
    return model.default ? `${model.label} — ${this.defaultMarker}` : model.label;
  }

  async ngOnInit(): Promise<void> {
    try {
      this.models = await this.settings.listModels();
      const current: ProjectModelSettings =
        await this.settings.read(this.dashboardService.projectID);
      this.apply(current);
      this.defaultMarker =
        await firstValueFrom(this.translate.get('LlmSettingsDefault'));
    } catch (e: any) {
      if (e?.status === 409 && e?.error?.error?.code === 'not_configured') {
        // A deployment with no `model_catalog`. `GET /v1/models` still answers
        // 200 with the single default entry, so only this 409 says so -- and
        // reporting it as "the runtime configuration could not be loaded" told
        // every correctly configured deployment that something was broken,
        // over a form whose Save could only 409 again.
        this.notConfigured = true;
        this.unavailable.emit();
      } else if (e?.status === 403) {
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
    if (id === '') {
      // The deployment default carries no params of its own -- the fields
      // are about to become disabled (see the template), and leaving a
      // stale number sitting in a disabled box would read as "still in
      // effect" when it is about to be discarded on save.
      this.temperature = null;
      this.maxTokens = null;
    }
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
