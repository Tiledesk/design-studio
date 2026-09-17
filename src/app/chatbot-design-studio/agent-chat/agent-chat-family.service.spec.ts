import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AgentChatFamilyService } from './agent-chat-family.service';
import { DashboardService } from 'src/app/services/dashboard.service';
import { FaqKbService } from 'src/app/services/faq-kb.service';

describe('AgentChatFamilyService', () => {
  let dashboardService: any;
  let faqKbService: any;
  let service: AgentChatFamilyService;

  const build = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AgentChatFamilyService,
        { provide: DashboardService, useValue: dashboardService },
        { provide: FaqKbService, useValue: faqKbService }
      ]
    });
    service = TestBed.inject(AgentChatFamilyService);
  };

  beforeEach(() => {
    dashboardService = {
      id_faq_kb: 'parent1',
      projectID: 'proj1',
      selectedChatbot: { _id: 'parent1', name: 'Parent', subtype: 'chatbot' }
    };
    faqKbService = {
      getSubagentsByFaqKbId: jasmine.createSpy('getSubagentsByFaqKbId')
        .and.returnValue(of([{ _id: 'sub2', name: 'Beta' }, { _id: 'sub1', name: 'alfa' }])),
      getBotById: jasmine.createSpy('getBotById')
        .and.returnValue(of({ _id: 'parent1', name: 'Parent' })),
      createFaqKb: jasmine.createSpy('createFaqKb')
        .and.returnValue(of({ _id: 'new1', name: 'Nuovo' }))
    };
    build();
  });

  it('roots the family at the open chatbot when it is not a subagent', () => {
    expect(service.rootId()).toBe('parent1');
    expect(service.isSubagent()).toBe(false);
  });

  it('roots the family at parent_id when a subagent is open', () => {
    dashboardService.id_faq_kb = 'sub1';
    dashboardService.selectedChatbot =
      { _id: 'sub1', name: 'Alfa', subtype: 'subagent', parent_id: 'parent1' };
    build();
    expect(service.rootId()).toBe('parent1');
    expect(service.isSubagent()).toBe(true);
  });

  it('reads the family sorted, with the root named', async () => {
    const family = await service.read();
    expect(family.root_id).toBe('parent1');
    expect(family.root_name).toBe('Parent');
    expect(family.is_subagent).toBe(false);
    expect(family.subagents.map(s => s._id)).toEqual(['sub1', 'sub2']);
  });

  it('contains the root and its subagents, and nothing else', async () => {
    expect(await service.contains('parent1')).toBe(true);
    expect(await service.contains('sub1')).toBe(true);
    expect(await service.contains('stranger')).toBe(false);
  });

  // The parent is the family root even when the open chatbot is a subagent:
  // a subagent created from inside a subagent is a sibling, not a child.
  it('creates a subagent under the family root, never under the open subagent', async () => {
    dashboardService.id_faq_kb = 'sub1';
    dashboardService.selectedChatbot =
      { _id: 'sub1', name: 'Alfa', subtype: 'subagent', parent_id: 'parent1' };
    build();
    const created = await service.createSubagent('  Nuovo  ');
    expect(created).toEqual({ _id: 'new1', name: 'Nuovo' });
    expect(faqKbService.createFaqKb).toHaveBeenCalledWith({
      id_project: 'proj1', language: 'en', name: 'Nuovo', subtype: 'subagent',
      template: 'blank', type: 'tilebot', parent_id: 'parent1'
    });
  });

  // A refusal the user can act on -- "a subagent with that name exists" --
  // must reach the agent as text, not as "[object Object]".
  it('surfaces the server message when creation is refused', async () => {
    faqKbService.createFaqKb.and.returnValue(
      throwError(() => ({ error: { msg: 'name already taken' } })));
    await expectAsync(service.createSubagent('Nuovo'))
      .toBeRejectedWithError('name already taken');
  });
});
