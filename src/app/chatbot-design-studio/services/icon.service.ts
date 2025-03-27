import { Injectable } from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root', // Questo rende il servizio disponibile in tutta l'app
})
export class IconService {
  constructor(
    private readonly matIconRegistry: MatIconRegistry, 
    private readonly domSanitizer: DomSanitizer
  ) {}

  registerIcons(): void {

    // ai prompt //
    this.matIconRegistry.addSvgIcon(
      'anthropic',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/ai_prompt/anthropic.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'cohere',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/ai_prompt/cohere.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'deepseek',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/ai_prompt/deepseek.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'google',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/ai_prompt/google.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'groq',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/ai_prompt/groq.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'ollama',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/ai_prompt/ollama.svg')
    );

    // mouse trackpad //
    this.matIconRegistry.addSvgIcon(
      'mouse_and_whell_zoom',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/mouse_trackpad/mouse_and_whell_zoom.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'pinch_to_zoom',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/mouse_trackpad/pinch_to_zoom.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'slide_to_move',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/mouse_trackpad/slide_to_move.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'whell_and_drag',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/mouse_trackpad/whell_and_drag.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'whell_scroll',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/mouse_trackpad/whell_scroll.svg')
    );

    // actions_category //
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions_category/ai.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions_category/ai.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions_category/flow.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions_category/flow.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions_category/integrations.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions_category/integrations.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions_category/most_used.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions_category/most_used.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions_category/new.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions_category/new.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions_category/special.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions_category/special.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions_category/voice.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions_category/voice.svg')
    );


    // actions //
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/add_tag.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/add_tag.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/agent_handoff.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/agent_handoff.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/ai-prompt.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/ai-prompt.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/ask_to_kb.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/ask_to_kb.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/assign_var.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/assign_var.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/brevo.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/brevo.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/capture_user_reply.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/capture_user_reply.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/change_department.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/change_department.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/clear_transcript.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/clear_transcript.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/close.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/close.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/code.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/code.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/condition.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/condition.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/connect_intent.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/connect_intent.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/customerio.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/customerio.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/delete_var.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/delete_var.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/filter.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/filter.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/hidden_message.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/hidden_message.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/hubspot.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/hubspot.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/lead_update.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/lead_update.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/make.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/make.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/move_to_unassigned.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/move_to_unassigned.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/n8n.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/n8n.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/online_agents.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/online_agents.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/open_hours.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/open_hours.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/openai_assistent.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/openai_assistent.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/openai_icon.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/openai_icon.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/qapla.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/qapla.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/random_reply.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/random_reply.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/replace_bot.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/replace_bot.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/reply_v2.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/reply_v2.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/reply.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/reply.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/send_email.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/send_email.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/wait.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/wait.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/web_request.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/web_request.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/web_response.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/web_response.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'assets/images/actions/whatsapp.svg',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/actions/whatsapp.svg')
    );
















    // icons //
    this.matIconRegistry.addSvgIcon(
      'add_ai_model',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/add_ai_model.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'add_audio',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/add_audio.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'add_image',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/add_image.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'add',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/add.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'audio',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/audio.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'bin',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/bin.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'block',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/block.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'bolt',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/bolt.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'chevron_left',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/chevron_left.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'chevron_right',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/chevron_right.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'copilot',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/copilot.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'copy',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/copy.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'data_object',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/data_object.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'drag_indicator',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/drag_indicator.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'edit',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/edit.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'electric_bolt',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/electric_bolt.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'event',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/event.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'fold',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/fold.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'groups',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/groups.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'if_condition',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/if_condition.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'line_text',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/line_text.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'list_alt',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/list_alt.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'man',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/man.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'more_vert',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/more_vert.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'palette',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/palette.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'play',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/play.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'search',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/search.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'unfold',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/unfold.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'webhook',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/webhook.svg')
    );
    this.matIconRegistry.addSvgIcon(
      'youtube',
      this.domSanitizer.bypassSecurityTrustResourceUrl('assets/images/icons/youtube.svg')
    );

   
  }
}

