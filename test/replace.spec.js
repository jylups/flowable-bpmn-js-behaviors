import { afterEach, describe, expect, it } from 'vitest';

import { createModeler, destroyModeler, expectUndoRedo } from './helper.js';

import { getExtensionElementsList } from '../index.js';

import xml from './fixtures/replace.bpmn?raw';


/**
 * Replaces an element and returns a getter for the current one: the new
 * element after redo, the old one after undo.
 */
async function replace(id, target) {
  const modeler = await createModeler(xml);
  const newElement = modeler.get('bpmnReplace').replaceElement(modeler.element(id), target);

  return {
    ...modeler,
    newElement,
    current: () => modeler.get('elementRegistry').get(newElement.id) || modeler.element(id)
  };
}

function types(businessObject) {
  return getExtensionElementsList(businessObject).map(value => value.$type);
}


describe('replacing elements', function() {

  afterEach(destroyModeler);


  it('imports the fixture without warnings', async function() {

    // when
    const { warnings } = await createModeler(xml);

    // then
    expect(warnings).toEqual([]);
  });


  describe('user task to service task', function() {

    it('drops the assignment and user task extension elements', async function() {

      // when
      const { get, newElement, current } = await replace('UserTask_1', { type: 'bpmn:ServiceTask' });

      // then
      await expectUndoRedo(get('commandStack'), {
        before: () => {
          const businessObject = current().businessObject;

          expect(businessObject.$type).toBe('bpmn:UserTask');
          expect(businessObject.get('flowable:assignee')).toBe('${initiator}');
          expect(types(businessObject)).toEqual([ 'flowable:TaskListener', 'flowable:FormProperty', 'flowable:ExecutionListener' ]);
        },
        after: () => {
          const businessObject = get('elementRegistry').get(newElement.id).businessObject;

          expect(businessObject.$type).toBe('bpmn:ServiceTask');
          expect(businessObject.get('flowable:assignee')).toBeUndefined();
          expect(types(businessObject)).toEqual([ 'flowable:ExecutionListener' ]);
        }
      });
    });


    it('keeps the shared properties', async function() {

      // when
      const { newElement } = await replace('UserTask_1', { type: 'bpmn:ServiceTask' });

      // then
      const businessObject = newElement.businessObject;

      expect(businessObject.get('flowable:async')).toBe(true);
      expect(businessObject.get('flowable:formKey')).toBe('review');
      expect(getExtensionElementsList(businessObject)[0].$parent).toBe(businessObject.get('extensionElements'));
    });


    it('keeps everything without the behaviors', async function() {

      // given
      const modeler = await createModeler(xml, { behaviors: false });

      // when
      const newElement = modeler.get('bpmnReplace').replaceElement(modeler.element('UserTask_1'), { type: 'bpmn:ServiceTask' });

      // then
      expect(types(newElement.businessObject)).toContain('flowable:TaskListener');
    });

  });


  describe('service tasks', function() {

    it('mail task to user task drops the type, fields and exception mappings', async function() {

      // when
      const { newElement, saveXML } = await replace('MailTask', { type: 'bpmn:UserTask' });

      // then
      const businessObject = newElement.businessObject;

      expect(businessObject.get('flowable:type')).toBeUndefined();
      expect(types(businessObject)).toEqual([ 'flowable:ExecutionListener' ]);
      expect(await saveXML()).not.toContain('kermit@example.org');
    });


    it('mail task to send task keeps the type and fields', async function() {

      // when
      const { newElement } = await replace('MailTask', { type: 'bpmn:SendTask' });

      // then
      const businessObject = newElement.businessObject;

      expect(businessObject.get('flowable:type')).toBe('mail');
      expect(types(businessObject)).toEqual([ 'flowable:Field', 'flowable:ExecutionListener' ]);
    });


    it('http task to send task drops the type, fields and handlers', async function() {

      // when
      const { get, newElement, current } = await replace('HttpTask', { type: 'bpmn:SendTask' });

      // then
      await expectUndoRedo(get('commandStack'), {
        before: () => {
          const businessObject = current().businessObject;

          expect(businessObject.get('flowable:type')).toBe('http');
          expect(types(businessObject)).toEqual([ 'flowable:Field', 'flowable:HttpRequestHandler' ]);
        },
        after: () => {
          const businessObject = get('elementRegistry').get(newElement.id).businessObject;

          expect(businessObject.$type).toBe('bpmn:SendTask');
          expect(businessObject.get('flowable:type')).toBeUndefined();
          expect(businessObject.get('extensionElements')).toBeUndefined();
        }
      });
    });

  });


  describe('call activity', function() {

    it('to sub process drops the mappings', async function() {

      // when
      const { newElement } = await replace('CallActivity_1', { type: 'bpmn:SubProcess', isExpanded: false });

      // then
      expect(newElement.businessObject.get('extensionElements')).toBeUndefined();
    });

  });


  describe('events', function() {

    it('event registry start event to timer start event drops the event registry settings', async function() {

      // when
      const { get, newElement, current } = await replace('RegistryStart', {
        type: 'bpmn:StartEvent',
        eventDefinitionType: 'bpmn:TimerEventDefinition'
      });

      // then
      await expectUndoRedo(get('commandStack'), {
        before: () => {
          expect(types(current().businessObject)).toEqual([
            'flowable:EventType',
            'flowable:EventCorrelationParameter',
            'flowable:EventOutParameter',
            'flowable:ExecutionListener'
          ]);
        },
        after: () => {
          const businessObject = get('elementRegistry').get(newElement.id).businessObject;

          expect(is(businessObject.get('eventDefinitions')[0], 'bpmn:TimerEventDefinition')).toBe(true);
          expect(types(businessObject)).toEqual([ 'flowable:ExecutionListener' ]);
        }
      });
    });


    it('event registry start event to end event drops the event registry settings', async function() {

      // when
      const { newElement } = await replace('RegistryStart', { type: 'bpmn:EndEvent' });

      // then
      expect(types(newElement.businessObject)).toEqual([ 'flowable:ExecutionListener' ]);
    });


    it('event registry start event to intermediate catch event keeps the event registry settings', async function() {

      // when
      const { newElement } = await replace('RegistryStart', { type: 'bpmn:IntermediateCatchEvent' });

      // then
      expect(types(newElement.businessObject)).toEqual([
        'flowable:EventType',
        'flowable:EventCorrelationParameter',
        'flowable:EventOutParameter',
        'flowable:ExecutionListener'
      ]);
    });


    it('variable listener boundary event to timer boundary event drops the variable listener', async function() {

      // when
      const { newElement } = await replace('VariableBoundary', {
        type: 'bpmn:BoundaryEvent',
        eventDefinitionType: 'bpmn:TimerEventDefinition',
        cancelActivity: false
      });

      // then
      expect(newElement.businessObject.get('extensionElements')).toBeUndefined();
    });


    it('signal throw event to signal catch event drops the async option', async function() {

      // when
      const { get, newElement, current } = await replace('SignalThrow', {
        type: 'bpmn:IntermediateCatchEvent',
        eventDefinitionType: 'bpmn:SignalEventDefinition'
      });

      // then
      await expectUndoRedo(get('commandStack'), {
        before: () => {
          expect(current().businessObject.get('eventDefinitions')[0].get('flowable:async')).toBe(true);
        },
        after: () => {
          const definition = get('elementRegistry').get(newElement.id).businessObject.get('eventDefinitions')[0];

          expect(definition.get('flowable:async')).toBeUndefined();
          expect(definition.get('flowable:signalExpression')).toBe('${alarmName}');
          expect(definition.get('signalRef').get('id')).toBe('Signal_1');
        }
      });
    });


    it('signal throw event to signal end event keeps the async option', async function() {

      // when
      const { newElement } = await replace('SignalThrow', {
        type: 'bpmn:EndEvent',
        eventDefinitionType: 'bpmn:SignalEventDefinition'
      });

      // then
      expect(newElement.businessObject.get('eventDefinitions')[0].get('flowable:async')).toBe(true);
    });


    it('error boundary event to error end event drops the error variable options', async function() {

      // when
      const { newElement } = await replace('ErrorBoundary', {
        type: 'bpmn:EndEvent',
        eventDefinitionType: 'bpmn:ErrorEventDefinition'
      });

      // then
      const definition = newElement.businessObject.get('eventDefinitions')[0];

      expect(definition.get('flowable:errorVariableName')).toBeUndefined();
      expect(definition.get('flowable:errorVariableLocalScope')).toBeUndefined();
    });

  });

});


function is(element, type) {
  return element && element.$instanceOf(type);
}
