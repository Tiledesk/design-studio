import {
  Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { AgentChatHostService } from 'src/app/chatbot-design-studio/agent-chat/agent-chat-host.service';
import { FlowOpsService } from 'src/app/chatbot-design-studio/agent-chat/flow-ops.service';
import { FlowOpsReport } from 'src/app/chatbot-design-studio/agent-chat/flow-ops.model';

@Component({
  selector: 'cds-panel-agent-chat',
  templateUrl: './cds-panel-agent-chat.component.html',
  styleUrls: ['./cds-panel-agent-chat.component.scss']
})
export class CdsPanelAgentChatComponent implements OnChanges, OnDestroy {

  @ViewChild('agentChatIframe') agentChatIframe: ElementRef<HTMLIFrameElement>;
  @Input() isPanelVisible: boolean = false;

  /** Null until the host is wired. Setting it is what loads the chat.
   *  Kept as a plain string beside the sanitised one so tests can assert the
   *  address without unwrapping Angular's SafeResourceUrl. */
  public iframeSrc: string | null = null;
  /** Starts at 'about:blank' rather than null: Angular's compiled resource-url
   *  sanitizer throws NG0904 on a literal null/undefined binding (it has no
   *  concept of "no value yet", unlike DomSanitizer.sanitize()), so the iframe
   *  needs a safe, real value from its very first render. */
  public safeIframeSrc: SafeResourceUrl;
  public error: string | null = null;
  public lastReport: FlowOpsReport | null = null;
  public appliedCount = 0;
  /** How many operations in the last report did not apply, and what the first
   *  of them said. Silence here is the one failure mode this whole feature is
   *  written against: a refused batch used to render no row at all, and a
   *  batch that applied 1 of 3 said only "Applied 1 change(s)". */
  public failedCount = 0;
  public firstError: string | null = null;
  public canUndo = false;

  private attached = false;
  private appliedSub: Subscription;

  constructor(
    public hostService: AgentChatHostService,
    private sanitizer: DomSanitizer,
    private flowOps: FlowOpsService
  ) {
    this.safeIframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl('about:blank');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isPanelVisible']?.currentValue && !this.attached) {
      this.attached = true;
      this.wire();
    }
  }

  private async wire(): Promise<void> {
    try {
      // The order is the whole point: the chat posts `ready` as soon as the
      // frame loads, so the listener must exist before the src does.
      await this.hostService.attach(this.agentChatIframe?.nativeElement
        ?? document.createElement('iframe'));
      // Clear a previous failure: without this, a successful retry after an
      // earlier attach() error would still render the error block forever,
      // since *ngIf="error" in the template never gets a chance to flip back.
      this.error = null;
      this.iframeSrc = this.hostService.iframeSrc();
      this.safeIframeSrc = this.sanitizer.bypassSecurityTrustResourceUrl(this.iframeSrc);
      this.appliedSub = this.hostService.applied$
        .subscribe((report: FlowOpsReport) => {
          this.lastReport = report;
          this.appliedCount = report.results.filter(r => r.ok).length;
          const failures = report.results.filter(r => !r.ok);
          this.failedCount = failures.length;
          this.firstError = failures.length ? (failures[0].error ?? null) : null;
          // A batch refused during validation changed nothing, so there is
          // nothing to undo and offering it would be a lie.
          this.canUndo = !report.rejected_before_applying && this.appliedCount > 0;
        });
    } catch {
      this.attached = false;
      this.error = this.hostService.lastError;
    }
  }

  onUndo(): void {
    this.flowOps.undoLast();
    this.canUndo = false;
    // The whole batch has been taken back, so "Applied 3 changes" is now
    // simply wrong about the flow. Any failures the report also carried are
    // left standing: undo did not make those operations happen.
    this.appliedCount = 0;
  }

  ngOnDestroy(): void {
    this.appliedSub?.unsubscribe();
    this.hostService.detach();
  }
}
