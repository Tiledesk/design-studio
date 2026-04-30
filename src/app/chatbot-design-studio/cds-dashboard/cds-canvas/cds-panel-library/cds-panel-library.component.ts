import { Component, OnInit, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CdkDragStart, CdkDragEnd } from '@angular/cdk/drag-drop';
import { TranslateService } from '@ngx-translate/core';

import { TYPE_OF_MENU } from '../../../utils';
import { BRAND_BASE_INFO } from 'src/app/chatbot-design-studio/utils-resources';
import { TYPE_CHATBOT, ACTIONS_LIST, TYPE_ACTION_CATEGORY, ACTION_CATEGORY } from 'src/app/chatbot-design-studio/utils-actions';
import { ProjectPlanUtils } from 'src/app/utils/project-utils';
import { DashboardService } from 'src/app/services/dashboard.service';
import { ControllerService } from '../../../services/controller.service';
import { LoggerService } from 'src/chat21-core/providers/abstract/logger.service';
import { LoggerInstance } from 'src/chat21-core/providers/logger/loggerInstance';

interface ActionItem {
  type: string;
  value: any;
  canLoad: boolean;
}

interface CategoryEntry {
  type: string;
  name: string;
  src: string;
}


@Component({
  selector: 'cds-panel-library',
  templateUrl: './cds-panel-library.component.html',
  styleUrls: ['./cds-panel-library.component.scss']
})
export class CdsPanelLibraryComponent implements OnInit {

  @Input() isBlocksOpen = false;
  @Output() hideActionPlaceholderOfActionPanel = new EventEmitter<boolean>();
  @Output() closePanel = new EventEmitter<void>();
  @Output() openBlocks = new EventEmitter<void>();

  @ViewChild('tooltipEl') tooltipEl: ElementRef<HTMLElement>;

  private readonly logger: LoggerService = LoggerInstance.getInstance();

  BRAND_BASE_INFO = BRAND_BASE_INFO;

  categories: CategoryEntry[] = ACTION_CATEGORY as CategoryEntry[];
  actionsByCategory: Record<string, ActionItem[]> = {};
  filteredActionsByCategory: Record<string, ActionItem[]> = {};
  expandedCategories = new Set<string>();
  searchText = '';
  isDragging = false;

  hoveredElement: any = null;
  tooltipPos = { x: 0, y: 0 };
  isTooltipOpen = false;

  constructor(
    private readonly projectPlanUtils: ProjectPlanUtils,
    private readonly dashboardService: DashboardService,
    private readonly controllerService: ControllerService,
    private readonly translate: TranslateService,
  ) {}

  ngOnInit(): void {
    this.buildActionsByCategory();
    if (this.categories.length > 0) {
      this.expandedCategories.add(this.categories[0].type);
    }
    this.applyFilter();
  }

  private buildActionsByCategory(): void {
    const subtype = (this.dashboardService.selectedChatbot?.subtype ?? TYPE_CHATBOT.CHATBOT) as TYPE_CHATBOT;
    this.projectPlanUtils.checkIfActionIsInChatbotType(subtype);

    this.categories.forEach(cat => {
      const items = Object.values(ACTIONS_LIST)
        .filter(el => el.category === TYPE_ACTION_CATEGORY[cat.type] && el.status !== 'inactive')
        .map(el => ({
          type: TYPE_OF_MENU.ACTION,
          value: el,
          canLoad: el.plan ? this.projectPlanUtils.checkIfCanLoad(el.type, el.plan) : true,
        }));
      if (items.length > 0) {
        this.actionsByCategory[cat.type] = items;
      }
    });
    this.logger.log('[CDS-PANEL-LIBRARY] actionsByCategory', this.actionsByCategory);
  }

  onSearch(text: string): void {
    this.searchText = text;
    this.applyFilter();
  }

  applyFilter(): void {
    const q = this.searchText.toLowerCase().trim();
    if (!q) {
      this.filteredActionsByCategory = { ...this.actionsByCategory };
      return;
    }
    this.filteredActionsByCategory = {};
    Object.entries(this.actionsByCategory).forEach(([cat, items]) => {
      const filtered = items.filter(i => {
        const translated = this.translate.instant(i.value.name as string).toLowerCase();
        return translated.includes(q);
      });
      if (filtered.length > 0) {
        this.filteredActionsByCategory[cat] = filtered;
        this.expandedCategories.add(cat);
      }
    });
  }

  toggleCategory(type: string): void {
    if (this.expandedCategories.has(type)) {
      this.expandedCategories.delete(type);
    } else {
      this.expandedCategories.add(type);
    }
  }

  isExpanded(type: string): boolean {
    return this.expandedCategories.has(type);
  }

  visibleCategories(): CategoryEntry[] {
    return this.categories.filter(c => !!this.filteredActionsByCategory[c.type]);
  }

  itemCount(type: string): number {
    return this.filteredActionsByCategory[type]?.length ?? 0;
  }

  onDragStarted(event: CdkDragStart, index: number): void {
    this.isDragging = true;
    this.controllerService.closeActionDetailPanel();

    const actionDragPlaceholder = document.querySelector('.lib-drag-placeholder') as HTMLElement;
    const addActionPlaceholderEl = document.querySelector('.add--action-placeholder') as HTMLElement;

    if (actionDragPlaceholder) {
      const observer = new ResizeObserver(entries => {
        entries.forEach(entry => {
          const w = entry.contentRect.width;
          const hide = w !== 258;
          this.hideActionPlaceholderOfActionPanel.emit(hide);
          if (actionDragPlaceholder) { actionDragPlaceholder.style.opacity = hide ? '0' : '1'; }
          if (addActionPlaceholderEl) { addActionPlaceholderEl.style.opacity = hide ? '1' : '0'; }
        });
      });
      observer.observe(actionDragPlaceholder);
    }
  }

  onDragEnd(event: CdkDragEnd): void {
    this.isDragging = false;
    this.hideActionPlaceholderOfActionPanel.emit(false);
  }

  openInfo(e: HTMLElement, element: any): void {
    this.logger.log('[CDS-PANEL-LIBRARY] openInfo!', element);

    if (!BRAND_BASE_INFO['DOCS']) { return; }

    if (!element.doc || element.doc === '') {
      this.closeInfo();
      return;
    }

    setTimeout(() => {
      this.hoveredElement = element;
      const rect = e.getBoundingClientRect();
      this.isTooltipOpen = true;
      this.tooltipPos = { x: rect.right + 10, y: rect.top };
    }, 0);
  }

  closeInfo(): void {
    if (!BRAND_BASE_INFO['DOCS']) { return; }
    setTimeout(() => { this.isTooltipOpen = false; }, 0);
    this.hoveredElement = null;
  }

  onVideoUrlClick(): void {
    const url = this.translate.instant(this.hoveredElement.doc + '.VIDEO_URL');
    window.open(url, '_blank');
  }
}
