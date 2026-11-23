import { afterEach, describe, expect, it } from 'vitest';

import { createModeler, destroyModeler, expectUndoRedo } from './helper.js';

import {
  addExtensionElements,
  getExtensionElement,
  getExtensionElementsList,
  removeExtensionElements
} from '../index.js';

import xml from './fixtures/simple.bpmn?raw';


describe('TidyExtensionElementsBehavior', function() {

  afterEach(destroyModeler);


  describe('remove empty containers', function() {

    it('when the last value is removed', async function() {

      // given
      const { get, element, businessObject } = await createModeler(xml);
      const task = businessObject('UserTask_1');
      const container = task.get('extensionElements');
      const listener = container.get('values')[0];

      // when
      get('modeling').updateModdleProperties(element('UserTask_1'), container, { values: [] });

      // then
      await expectUndoRedo(get('commandStack'), {
        before: () => {
          expect(task.get('extensionElements')).toBe(container);
          expect(container.get('values')).toEqual([ listener ]);
        },
        after: () => {
          expect(task.get('extensionElements')).toBeUndefined();
        }
      });
    });


    it('when an empty container is set', async function() {

      // given
      const { get, element, businessObject } = await createModeler(xml);
      const startEvent = businessObject('StartEvent_1');
      const container = get('bpmnFactory').create('bpmn:ExtensionElements', { values: [] });

      // when
      get('modeling').updateModdleProperties(element('StartEvent_1'), startEvent, { extensionElements: container });

      // then
      await expectUndoRedo(get('commandStack'), {
        before: () => expect(startEvent.get('extensionElements')).toBeUndefined(),
        after: () => expect(startEvent.get('extensionElements')).toBeUndefined()
      });
    });


    it('when an empty container is set with updateProperties', async function() {

      // given
      const { get, element, businessObject } = await createModeler(xml);
      const container = get('bpmnFactory').create('bpmn:ExtensionElements', { values: [] });

      // when
      get('modeling').updateProperties(element('StartEvent_1'), { extensionElements: container });

      // then
      expect(businessObject('StartEvent_1').get('extensionElements')).toBeUndefined();
    });


    it('on a business object other than the element', async function() {

      // given
      const { get, element, businessObject, saveXML } = await createModeler(xml);
      const process = businessObject('Process_1');
      const container = get('bpmnFactory').create('bpmn:ExtensionElements', {
        values: [ get('bpmnFactory').create('flowable:EventListener', { class: 'org.example.Listener' }) ]
      });

      get('modeling').updateModdleProperties(element('Process_1'), process, { extensionElements: container });

      // when
      get('modeling').updateModdleProperties(element('Process_1'), container, { values: [] });

      // then
      expect(process.get('extensionElements')).toBeUndefined();
      expect(await saveXML()).not.toMatch(/<process[^>]*>\s*<extensionElements/);
    });


    it('not without the behaviors', async function() {

      // given
      const { get, element, businessObject } = await createModeler(xml, { behaviors: false });
      const container = businessObject('UserTask_1').get('extensionElements');

      // when
      get('modeling').updateModdleProperties(element('UserTask_1'), container, { values: [] });

      // then
      expect(businessObject('UserTask_1').get('extensionElements')).toBe(container);
    });

  });


  describe('create containers when needed', function() {

    it('attaches a new container once it has values', async function() {

      // given
      const { get, element, businessObject, saveXML } = await createModeler(xml);
      const startEvent = businessObject('StartEvent_1');
      const bpmnFactory = get('bpmnFactory');

      const container = bpmnFactory.create('bpmn:ExtensionElements', { values: [] });
      container.$parent = startEvent;

      const listener = bpmnFactory.create('flowable:ExecutionListener', { event: 'start', class: 'org.example.Start' });

      // when
      get('modeling').updateModdleProperties(element('StartEvent_1'), container, { values: [ listener ] });

      // then
      await expectUndoRedo(get('commandStack'), {
        before: () => expect(startEvent.get('extensionElements')).toBeUndefined(),
        after: () => {
          expect(startEvent.get('extensionElements')).toBe(container);
          expect(getExtensionElementsList(startEvent)).toEqual([ listener ]);
          expect(listener.$parent).toBe(container);
        }
      });

      expect(await saveXML()).toContain('<flowable:executionListener event="start" class="org.example.Start" />');
    });


    it('keeps the panel flow: set an empty container, then fill it', async function() {

      // given
      const { get, element, businessObject } = await createModeler(xml);
      const startEvent = businessObject('StartEvent_1');
      const bpmnFactory = get('bpmnFactory');

      const container = bpmnFactory.create('bpmn:ExtensionElements', { values: [] });
      container.$parent = startEvent;

      const listener = bpmnFactory.create('flowable:ExecutionListener', { event: 'end', class: 'org.example.End' });
      listener.$parent = container;

      // when
      get('commandStack').execute('test.multi', [
        { cmd: 'element.updateModdleProperties', context: { element: element('StartEvent_1'), moddleElement: startEvent, properties: { extensionElements: container } } },
        { cmd: 'element.updateModdleProperties', context: { element: element('StartEvent_1'), moddleElement: container, properties: { values: [ listener ] } } }
      ]);

      // then
      await expectUndoRedo(get('commandStack'), {
        before: () => expect(startEvent.get('extensionElements')).toBeUndefined(),
        after: () => {
          expect(startEvent.get('extensionElements')).toBe(container);
          expect(container.get('values')).toEqual([ listener ]);
        }
      });
    });


    it('does not replace an attached container', async function() {

      // given
      const { get, element, businessObject } = await createModeler(xml);
      const task = businessObject('UserTask_1');
      const attached = task.get('extensionElements');

      const other = get('bpmnFactory').create('bpmn:ExtensionElements', { values: [] });
      other.$parent = task;

      // when
      get('modeling').updateModdleProperties(element('UserTask_1'), other, {
        values: [ get('bpmnFactory').create('flowable:TaskListener', { event: 'complete' }) ]
      });

      // then
      expect(task.get('extensionElements')).toBe(attached);
    });

  });


  describe('set missing parents', function() {

    it('of values', async function() {

      // given
      const { get, element, businessObject } = await createModeler(xml);
      const container = businessObject('UserTask_1').get('extensionElements');
      const listener = get('bpmnFactory').create('flowable:TaskListener', { event: 'complete', class: 'org.example.Done' });

      // when
      get('modeling').updateModdleProperties(element('UserTask_1'), container, {
        values: [ ...container.get('values'), listener ]
      });

      // then
      expect(listener.$parent).toBe(container);
    });


    it('of a container and its values', async function() {

      // given
      const { get, element, businessObject } = await createModeler(xml);
      const startEvent = businessObject('StartEvent_1');
      const listener = get('bpmnFactory').create('flowable:ExecutionListener', { event: 'start' });
      const container = get('bpmnFactory').create('bpmn:ExtensionElements', { values: [ listener ] });

      // when
      get('modeling').updateProperties(element('StartEvent_1'), { extensionElements: container });

      // then
      expect(container.$parent).toBe(startEvent);
      expect(listener.$parent).toBe(container);
    });

  });

});


describe('ExtensionElementsUtil', function() {

  afterEach(destroyModeler);


  it('adds the first extension element in one step', async function() {

    // given
    const { get, element, businessObject, saveXML } = await createModeler(xml);
    const startEvent = businessObject('StartEvent_1');
    const listener = get('bpmnFactory').create('flowable:ExecutionListener', { event: 'start', expression: '${audit.log(execution)}' });

    // when
    addExtensionElements(element('StartEvent_1'), startEvent, listener, get('bpmnFactory'), get('commandStack'));

    // then
    await expectUndoRedo(get('commandStack'), {
      before: () => expect(startEvent.get('extensionElements')).toBeUndefined(),
      after: () => expect(getExtensionElement(startEvent, 'flowable:ExecutionListener')).toBe(listener)
    });

    expect(get('commandStack').canUndo()).toBe(true);

    get('commandStack').undo();

    expect(get('commandStack').canUndo()).toBe(false);

    get('commandStack').redo();

    expect(await saveXML()).toContain('<flowable:executionListener event="start" expression="${audit.log(execution)}" />');
  });


  it('adds to an existing container', async function() {

    // given
    const { get, element, businessObject } = await createModeler(xml);
    const task = businessObject('UserTask_1');
    const container = task.get('extensionElements');
    const listeners = [
      get('bpmnFactory').create('flowable:TaskListener', { event: 'assignment' }),
      get('bpmnFactory').create('flowable:TaskListener', { event: 'complete' })
    ];

    // when
    addExtensionElements(element('UserTask_1'), task, listeners, get('bpmnFactory'), get('commandStack'));

    // then
    expect(task.get('extensionElements')).toBe(container);
    expect(getExtensionElementsList(task, 'flowable:TaskListener').map(listener => listener.get('event')))
      .toEqual([ 'create', 'assignment', 'complete' ]);
  });


  it('removes the last extension element and its container', async function() {

    // given
    const { get, element, businessObject, saveXML } = await createModeler(xml);
    const task = businessObject('UserTask_1');
    const listener = getExtensionElement(task, 'flowable:TaskListener');

    // when
    removeExtensionElements(element('UserTask_1'), task, listener, get('commandStack'));

    // then
    await expectUndoRedo(get('commandStack'), {
      before: () => expect(getExtensionElementsList(task)).toEqual([ listener ]),
      after: () => expect(task.get('extensionElements')).toBeUndefined()
    });

    expect(await saveXML()).not.toContain('extensionElements');
  });


  it('reads the extension elements of a diagram element', async function() {

    // given
    const { element } = await createModeler(xml);

    // then
    expect(getExtensionElementsList(element('UserTask_1'), 'flowable:TaskListener')).toHaveLength(1);
    expect(getExtensionElementsList(element('StartEvent_1'))).toEqual([]);
  });

});
