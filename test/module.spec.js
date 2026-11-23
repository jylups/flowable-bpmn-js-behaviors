import { afterEach, describe, expect, it } from 'vitest';

import { createModeler, destroyModeler, expectUndoRedo } from './helper.js';

import { FlowableBehaviorsModule } from '../index.js';

import xml from './fixtures/simple.bpmn?raw';


describe('FlowableBehaviorsModule', function() {

  afterEach(destroyModeler);


  it('is a bpmn-js module', function() {
    expect(FlowableBehaviorsModule.__init__).toBeInstanceOf(Array);
  });


  it('imports and saves Flowable XML with the behaviors', async function() {

    // when
    const { warnings, businessObject, saveXML } = await createModeler(xml);

    // then
    expect(warnings).toEqual([]);
    expect(businessObject('UserTask_1').get('flowable:assignee')).toBe('${initiator}');

    const saved = await saveXML();

    expect(saved).toContain('flowable:assignee="${initiator}"');
    expect(saved).toContain('<flowable:taskListener event="create" class="org.example.CreateListener" />');
  });


  it('runs without the behaviors for comparison', async function() {

    // when
    const { modeler } = await createModeler(xml, { behaviors: false });

    // then
    expect(modeler.get('elementRegistry').get('UserTask_1')).toBeDefined();
  });

});


describe('expectUndoRedo', function() {

  afterEach(destroyModeler);


  it('checks a change, its undo and its redo', async function() {

    // given
    const { get, element, businessObject } = await createModeler(xml);
    const calls = [];

    // when
    get('modeling').updateProperties(element('UserTask_1'), { 'flowable:assignee': 'kermit' });

    await expectUndoRedo(get('commandStack'), {
      before: () => {
        calls.push('before');
        expect(businessObject('UserTask_1').get('flowable:assignee')).toBe('${initiator}');
      },
      after: () => {
        calls.push('after');
        expect(businessObject('UserTask_1').get('flowable:assignee')).toBe('kermit');
      }
    });

    // then
    expect(calls).toEqual([ 'after', 'before', 'after' ]);
  });

});
