import { afterEach, describe, expect, it } from 'vitest';

import { createModeler, destroyModeler, expectUndoRedo } from './helper.js';

import { getExtensionElement, getExtensionElementsList } from '../index.js';

import xml from './fixtures/copy-paste.bpmn?raw';
import emptyXml from './fixtures/simple.bpmn?raw';


describe('UpdateModdleIdBehavior', function() {

  afterEach(destroyModeler);


  it('claims the new ID and releases the old one', async function() {

    // given
    const { get, element, saveXML } = await createModeler(xml);
    const ids = get('moddle').ids;
    const signal = get('canvas').getRootElement().businessObject.$parent.get('rootElements')
      .find(rootElement => rootElement.get('id') === 'Signal_1');

    // when
    get('modeling').updateModdleProperties(element('SignalThrow'), signal, { id: 'Alarm' });

    // then
    await expectUndoRedo(get('commandStack'), {
      before: () => {
        expect(ids.assigned('Signal_1')).toBe(signal);
        expect(ids.assigned('Alarm')).toBe(false);
      },
      after: () => {
        expect(ids.assigned('Alarm')).toBe(signal);
        expect(ids.assigned('Signal_1')).toBe(false);
      }
    });

    expect(await saveXML()).toContain('signalRef="Alarm"');
  });


  it('lets the old ID be used again', async function() {

    // given
    const { get, element, businessObject } = await createModeler(xml);
    const signal = element('SignalThrow').businessObject.get('eventDefinitions')[0].get('signalRef');

    // when
    get('modeling').updateModdleProperties(element('SignalThrow'), signal, { id: 'Alarm' });
    get('modeling').updateProperties(element('HttpTask'), { id: 'Signal_1' });

    // then
    expect(get('moddle').ids.assigned('Alarm')).toBe(signal);
    expect(get('moddle').ids.assigned('Signal_1')).toBe(businessObject('Signal_1'));
    expect(businessObject('Signal_1').$type).toBe('bpmn:ServiceTask');
  });


  it('ignores an unchanged ID', async function() {

    // given
    const { get, element, businessObject } = await createModeler(xml);
    const task = businessObject('UserTask_1');

    // when
    get('modeling').updateModdleProperties(element('UserTask_1'), task, { id: 'UserTask_1', name: 'Check' });

    // then
    expect(get('moddle').ids.assigned('UserTask_1')).toBe(task);
  });


  it('leaves the registry as it was without the behaviors', async function() {

    // given
    const { get, element } = await createModeler(xml, { behaviors: false });
    const signal = element('SignalThrow').businessObject.get('eventDefinitions')[0].get('signalRef');

    // when
    get('modeling').updateModdleProperties(element('SignalThrow'), signal, { id: 'Alarm' });

    // then
    expect(get('moddle').ids.assigned('Alarm')).toBe(false);
  });

});


describe('copy and paste', function() {

  afterEach(destroyModeler);


  it('copies a user task with its Flowable properties', async function() {

    // given
    const { get, copyPaste, businessObject } = await createModeler(xml);

    // when
    const [ pasted ] = copyPaste([ 'UserTask_1' ]);

    // then
    const original = businessObject('UserTask_1');
    const copy = pasted.businessObject;

    expect(copy.get('id')).not.toBe('UserTask_1');
    expect(copy.get('flowable:assignee')).toBe('${initiator}');
    expect(copy.get('flowable:candidateGroups')).toBe('managers');
    expect(copy.get('flowable:formKey')).toBe('review');

    const listener = getExtensionElement(copy, 'flowable:TaskListener');

    expect(listener).not.toBe(getExtensionElement(original, 'flowable:TaskListener'));
    expect(listener.$parent).toBe(copy.get('extensionElements'));
    expect(listener.get('fields')[0].get('name')).toBe('channel');
    expect(listener.get('fields')[0].get('string')).toBe('email');
    expect(listener.get('fields')[0].$parent).toBe(listener);

    const formProperty = getExtensionElement(copy, 'flowable:FormProperty');

    expect(formProperty.get('id')).toBe('color');
    expect(formProperty.get('values').map(value => value.get('id'))).toEqual([ 'red', 'blue' ]);

    await expectUndoRedo(get('commandStack'), {
      before: () => expect(get('elementRegistry').get(pasted.id)).toBeUndefined(),
      after: () => expect(get('elementRegistry').get(pasted.id)).toBe(pasted)
    });
  });


  it('copies multi-instance settings and variable aggregations', async function() {

    // given
    const { copyPaste, saveXML } = await createModeler(xml);

    // when
    const [ pasted ] = copyPaste([ 'UserTask_1' ]);

    // then
    const loop = pasted.businessObject.get('loopCharacteristics');

    expect(loop.get('flowable:collection')).toBe('${reviewers}');
    expect(loop.get('flowable:elementVariable')).toBe('reviewer');
    expect(getExtensionElement(loop, 'flowable:VariableAggregation').get('target')).toBe('reviews');

    const saved = await saveXML();

    expect(saved.match(/<flowable:variableAggregation target="reviews">/g)).toHaveLength(2);
    expect(saved.match(/<variable source="approved" target="approved" \/>/g)).toHaveLength(2);
  });


  it('copies HTTP handlers with their fields and scripts', async function() {

    // given
    const { copyPaste, saveXML } = await createModeler(xml);

    // when
    const [ pasted ] = copyPaste([ 'HttpTask' ]);

    // then
    expect(pasted.businessObject.get('flowable:type')).toBe('http');
    expect(getExtensionElementsList(pasted.businessObject).map(value => value.$type)).toEqual([
      'flowable:Field',
      'flowable:HttpRequestHandler',
      'flowable:HttpResponseHandler'
    ]);

    const saved = await saveXML();

    expect(saved.match(/<flowable:expression>\$\{token\}<\/flowable:expression>/g)).toHaveLength(2);
    expect(saved.match(/<flowable:script language="groovy">/g)).toHaveLength(2);
  });


  it('copies timer options', async function() {

    // given
    const { copyPaste } = await createModeler(xml);

    // when
    const [ pasted ] = copyPaste([ 'TimerCatch' ]);

    // then
    const definition = pasted.businessObject.get('eventDefinitions')[0];

    expect(definition.get('flowable:businessCalendarName')).toBe('office');
    expect(definition.get('timeCycle').get('flowable:endDate')).toBe('2027-01-01T00:00:00');
    expect(definition.get('timeCycle').get('body')).toBe('R3/PT1H');
  });


  it('keeps unknown attributes of a pasted element', async function() {

    // given
    const { copyPaste, businessObject } = await createModeler(xml);

    businessObject('UserTask_1').$attrs['flowable:designNote'] = 'check';

    // when
    const [ pasted ] = copyPaste([ 'UserTask_1' ]);

    // then
    expect(pasted.businessObject.$attrs['flowable:designNote']).toBe('check');
  });


  it('leaves unknown attributes out when the type changes', async function() {

    // given
    const { get, element, businessObject } = await createModeler(xml);

    businessObject('UserTask_1').$attrs['flowable:designNote'] = 'check';

    // when
    const serviceTask = get('bpmnReplace').replaceElement(element('UserTask_1'), { type: 'bpmn:ServiceTask' });

    // then
    expect(serviceTask.businessObject.$attrs['flowable:designNote']).toBeUndefined();
  });


  it('keeps unknown Flowable elements that the app registered', async function() {

    // given
    const { copyPaste } = await createModeler(xml, { registerUnknown: true });

    // when
    const [ pasted ] = copyPaste([ 'UserTask_1' ]);

    // then
    const hint = getExtensionElement(pasted.businessObject, 'flowable:DesignerHint');

    expect(hint).toBeDefined();
    expect(hint.get('body')).toBe('keep');
    expect(hint.$attrs.color).toBe('blue');
  });


  it('brings the signal and its scope into another diagram', async function() {

    // given
    const { modeler, copyPaste, paste, saveXML } = await createModeler(xml);

    copyPaste([ 'SignalThrow' ]);

    await modeler.importXML(emptyXml);

    // when
    const [ pasted ] = paste();

    // then
    const definition = pasted.businessObject.get('eventDefinitions')[0];

    expect(definition.get('flowable:async')).toBe(true);
    expect(definition.get('signalRef').get('flowable:scope')).toBe('processInstance');

    const saved = await saveXML();

    expect(saved).toContain('<signal id="Signal_1" name="alarm" flowable:scope="processInstance" />');
    expect(saved).toContain('signalRef="Signal_1"');
  });


  it('makes copies that change apart from the original', async function() {

    // given
    const { get, copyPaste, businessObject } = await createModeler(xml);
    const [ pasted ] = copyPaste([ 'UserTask_1' ]);
    const field = getExtensionElement(pasted.businessObject, 'flowable:TaskListener').get('fields')[0];

    // when
    get('modeling').updateModdleProperties(pasted, field, { string: 'sms' });

    // then
    const original = getExtensionElement(businessObject('UserTask_1'), 'flowable:TaskListener').get('fields')[0];

    expect(field.get('string')).toBe('sms');
    expect(original.get('string')).toBe('email');
  });

});

