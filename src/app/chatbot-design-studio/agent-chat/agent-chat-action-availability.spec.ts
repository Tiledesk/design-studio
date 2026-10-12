import {
  ACTIONS_LIST, TYPE_CHATBOT, availableActionEntries, isActionAvailableInSubagentContext,
  isSubagentSubtype, resolveChatbotSubtype
} from '../utils-actions';

/** ACTIONS_LIST is a module-level object that ProjectPlanUtils mutates on load
 *  (status = 'inactive'). Each test works on a deep copy so nothing leaks. */
function copyOfList(): typeof ACTIONS_LIST {
  return JSON.parse(JSON.stringify(ACTIONS_LIST));
}

describe('availableActionEntries', () => {
  const always = () => true;

  it('keeps exactly what the element panel used to keep, for every subtype', () => {
    // The panel's former inline filter, reproduced as the oracle: first the
    // subtype mutation (checkIfActionIsInChatbotType), then status + subagent context.
    for (const subtype of [TYPE_CHATBOT.CHATBOT, TYPE_CHATBOT.WEBHOOK, TYPE_CHATBOT.COPILOT,
                           TYPE_CHATBOT.VOICE, TYPE_CHATBOT.SUBAGENT]) {
      const oracleList = copyOfList();
      Object.values(oracleList)
        .filter(el => !el.chatbot_types.includes(resolveChatbotSubtype(subtype)))
        .forEach(el => el.status = 'inactive');
      const expected = Object.values(oracleList)
        .filter(el => el.status !== 'inactive'
          && isActionAvailableInSubagentContext(el, isSubagentSubtype(subtype)))
        .map(el => el.type).sort();

      const actual = availableActionEntries(subtype, always, copyOfList())
        .map(a => a.type).sort();
      expect(actual).withContext(String(subtype)).toEqual(expected);
    }
  });

  it('does not mutate the list it reads', () => {
    const list = copyOfList();
    const before = JSON.stringify(list);
    availableActionEntries(TYPE_CHATBOT.VOICE, always, list);
    expect(JSON.stringify(list)).toBe(before);
  });

  it('asks canLoad only for entries that carry a plan, and reports its answer', () => {
    const list = copyOfList();
    const canLoad = jasmine.createSpy('canLoad').and.returnValue(false);
    const result = availableActionEntries(TYPE_CHATBOT.CHATBOT, canLoad, list);
    const planned = result.filter(a => a.plan);
    const unplanned = result.filter(a => !a.plan);
    expect(planned.length).toBeGreaterThan(0);
    expect(planned.every(a => a.canLoad === false)).toBe(true);
    expect(unplanned.every(a => a.canLoad === true)).toBe(true);
    expect(canLoad).toHaveBeenCalledTimes(planned.length);
  });

  it('drops an entry already marked inactive by ProjectPlanUtils', () => {
    const list = copyOfList();
    const victim = Object.values(list).find(el => el.chatbot_types.includes(TYPE_CHATBOT.CHATBOT)
      && el.status !== 'inactive' && !el.subagent_visibility);
    victim.status = 'inactive';
    const types = availableActionEntries(TYPE_CHATBOT.CHATBOT, always, list).map(a => a.type);
    expect(types).not.toContain(victim.type);
  });

  it('treats a missing subtype as a chatbot', () => {
    expect(availableActionEntries(undefined, always, copyOfList()).map(a => a.type))
      .toEqual(availableActionEntries(TYPE_CHATBOT.CHATBOT, always, copyOfList()).map(a => a.type));
  });
});
