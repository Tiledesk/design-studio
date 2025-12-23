import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { IntentService } from 'src/app/chatbot-design-studio/services/intent.service';
import { StageService } from 'src/app/chatbot-design-studio/services/stage.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { Intent } from 'src/app/models/intent-model';
import { ConnectorService } from 'src/app/chatbot-design-studio/services/connector.service';

@Component({
  selector: 'cds-connector-in',
  templateUrl: './cds-connector-in.component.html',
  styleUrls: ['./cds-connector-in.component.scss']
})
export class CdsConnectorInComponent implements OnInit {
  @Input() connectorsIn: any[] = [];

  labelNumber: string;
  connectedIntents: Array<{intent: Intent, connectorIds: string[]}> = [];


  constructor(
    private readonly intentService: IntentService,
    private readonly stageService: StageService,
    private readonly dashboardService: DashboardService,
    private readonly connectorService: ConnectorService
  ) { }

  ngOnInit(): void {
    this.labelNumber = this.connectorsIn.length.toString();
    if(this.connectorsIn.length>9){
      this.labelNumber = "+9";
    }
    this.loadConnectedIntents();
  }

  private loadConnectedIntents(): void {
    this.connectedIntents = [];
    if (this.connectorsIn && this.connectorsIn.length > 0) {
      const intentMap = new Map<string, {intent: Intent, connectorIds: string[]}>();
      
      this.connectorsIn.forEach((connector) => {
        if (connector.id) {
          // Estrae l'ID dell'intent di origine dalla connection ID
          // Il formato è: {fromIntentId}/{actionId}/.../{toIntentId}
          const segments = connector.id.split('/');
          if (segments.length > 0) {
            const fromIntentId = segments[0];
            if (!intentMap.has(fromIntentId)) {
              const intent = this.intentService.getIntentFromId(fromIntentId);
              if (intent) {
                intentMap.set(fromIntentId, { intent, connectorIds: [connector.id] });
              }
            } else {
              // Aggiungi il connectorId all'array esistente
              intentMap.get(fromIntentId)!.connectorIds.push(connector.id);
            }
          }
        }
      });
      
      this.connectedIntents = Array.from(intentMap.values()).sort((a, b) => {
        const nameA = a.intent.intent_display_name?.toLowerCase() || '';
        const nameB = b.intent.intent_display_name?.toLowerCase() || '';
        return nameA.localeCompare(nameB);
      });
    }
  }

  public showConnectorsIn(event: MouseEvent){
    event.stopPropagation();
    if(this.connectorsIn){
      this.connectorsIn.forEach((connector) => {
        const svgElement = document.getElementById(connector.id) as HTMLElement;
        if(svgElement){
          svgElement.setAttribute('opacity', (1).toString());
        }
        const svgElementRec = document.getElementById('rect_'+connector.id) as HTMLElement;
        if(svgElementRec){
          svgElementRec.setAttribute('opacity', (1).toString());
        }
        const svgElementTxt = document.getElementById('label_'+connector.id) as HTMLElement;
        if(svgElementTxt){
          svgElementTxt.setAttribute('opacity', (1).toString());
        }
      });
     
    }
  }

  public hideConnectorsIn(event: MouseEvent){
    // imposto l'opacità a quella settata nel chatbot-design-studio.component.ts
    const alphaConnectors = this.stageService.getAlpha() / 100;
    event.stopPropagation();
    if(this.connectorsIn){
      this.connectorsIn.forEach((connector) => {
        const svgElement = document.getElementById(connector.id) as HTMLElement;
        if(svgElement){
          svgElement.setAttribute('opacity', (alphaConnectors).toString());
        }
        const svgElementRec = document.getElementById('rect_'+connector.id) as HTMLElement;
        if(svgElementRec){
          svgElementRec.setAttribute('opacity', (alphaConnectors).toString());
        }
        const svgElementTxt = document.getElementById('label_'+connector.id) as HTMLElement;
        if(svgElementTxt){
          svgElementTxt.setAttribute('opacity', (alphaConnectors).toString());
        }
      });
      
    }
  }

  public onGoToIntent(event: MouseEvent, intent: Intent): void {
    event.stopPropagation();
    if (intent && intent.intent_id) {
      this.intentService.setIntentSelected(intent.intent_id);
      // Centra lo stage sull'intent selezionato (stessa animazione di cds-panel-intent-list)
      let stageElement = document.getElementById(intent.intent_id);
      if (stageElement) {
        let id_faq_kb = this.dashboardService.id_faq_kb;
        this.stageService.centerStageOnElement(id_faq_kb, stageElement);
      }
    }
  }

  public onMenuItemMouseEnter(connectorIds: string[]): void {
    connectorIds.forEach((connectorId) => {
      const svgElement = document.getElementById(connectorId);
      if (svgElement) {
        svgElement.setAttribute('class', 'tds_connector_over');
        svgElement.setAttribute('marker-start', 'url(#tds_arrow_over)');
        svgElement.setAttribute('opacity', '1');
      }
      // verifica se esiste un connector contract per questo connector il cui id è tutto tranne l'ultimo segmento
      const connectorIdWithoutLastSegment = connectorId.split('/').slice(0, -1).join('/');
      console.log('[cds-connector-in] onMenuItemMouseEnter:: connectorIdWithoutLastSegment', connectorIdWithoutLastSegment);
      if (connectorIdWithoutLastSegment) {
        const connectorContract = document.getElementById('contract_'+connectorIdWithoutLastSegment);
        console.log('[cds-connector-in] onMenuItemMouseEnter:: connectorContract', connectorIdWithoutLastSegment);
        const display = connectorContract.style.display;
        if (display !== 'none') {
          this.connectorService.showDefaultConnector(connectorId);
        }
      }
    });
    
  }

  public onMenuItemMouseLeave(connectorIds: string[]): void {
    connectorIds.forEach((connectorId) => {
      const svgElement = document.getElementById(connectorId);
      if (svgElement) {
        svgElement.setAttribute('class', 'tds_connector');
        // Ripristina il marker originale usando il pattern marker_${connectorId}
        const originalMarkerId = `marker_${connectorId}`;
        svgElement.setAttribute('marker-start', `url(#${originalMarkerId})`);
        // Mantieni l'opacità se il menu è ancora aperto
        const menuElement = document.querySelector('.connector-in-menu:hover');
        if (!menuElement) {
          const alphaConnectors = this.stageService.getAlpha() / 100;
          svgElement.setAttribute('opacity', alphaConnectors.toString());
        }
      }
      // verifica se esiste un connector contract per questo connector il cui id è tutto tranne l'ultimo segmento
      const connectorIdWithoutLastSegment = connectorId.split('/').slice(0, -1).join('/');
      console.log('[cds-connector-in] onMenuItemMouseEnter:: connectorIdWithoutLastSegment', connectorIdWithoutLastSegment);
      if (connectorIdWithoutLastSegment) {
        const connectorContract = document.getElementById('contract_'+connectorIdWithoutLastSegment);
        // se connector contract esiste, e se display è diverso da none, nascondilo
        if (connectorContract) {
          const display = connectorContract.style.display;
          if (display !== 'none') {
            this.connectorService.hideDefaultConnector(connectorId);
          }
        }
      }
    });
  }

}
