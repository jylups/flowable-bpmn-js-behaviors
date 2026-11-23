import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import { is, isAny } from 'bpmn-js/lib/util/ModelUtil';

import { getExtensionElementsList, removeExtensionElements } from '../util/ExtensionElementsUtil.js';


const CATCH_EVENTS = [ 'bpmn:StartEvent', 'bpmn:BoundaryEvent', 'bpmn:IntermediateCatchEvent' ];

const THROW_EVENTS = [ 'bpmn:IntermediateThrowEvent', 'bpmn:EndEvent' ];

/**
 * Extension elements of an event registry or variable listener event: valid
 * on catch events without a BPMN event definition.
 */
const DEFINITIONLESS_CATCH_TYPES = [
  'flowable:EventType',
  'flowable:EventName',
  'flowable:EventCorrelationParameter',
  'flowable:EventOutParameter',
  'flowable:StartEventCorrelationConfiguration',
  'flowable:VariableListenerEventDefinition'
];

/**
 * The flowable:type values a send task runs.
 */
const SEND_TASK_TYPES = [ 'mail', 'camel', 'dmn' ];

const ERROR_VARIABLE_ATTRIBUTES = [
  'flowable:errorVariableName',
  'flowable:errorVariableTransient',
  'flowable:errorVariableLocalScope'
];


/**
 * Removes Flowable properties the replacing element can't use, where the
 * descriptor alone does not tell (bpmn-js already leaves out attributes the
 * new type does not have, and the AllowedExtensionElementsBehavior extension
 * elements it does not allow):
 *
 * - event registry and variable listener settings, unless the new element is
 *   a start, boundary or intermediate catch event without an event
 *   definition;
 * - the async option of a signal definition, unless the event throws;
 * - the error variable options of an error definition, unless the event
 *   catches;
 * - a send task's flowable:type other than mail, camel or dmn, with its
 *   fields.
 *
 * The changes are part of the replace, so one undo restores the old element.
 */
export default class CleanUpReplacedElementBehavior extends CommandInterceptor {

  constructor(eventBus, modeling, commandStack) {
    super(eventBus);

    this.postExecuted('shape.replace', context => {
      const element = context.newShape;
      const businessObject = element.businessObject;

      if (is(businessObject, 'bpmn:Event')) {
        cleanUpEvent(element, businessObject, modeling, commandStack);
      }

      if (is(businessObject, 'bpmn:SendTask')) {
        cleanUpSendTask(element, businessObject, modeling, commandStack);
      }
    }, true);
  }
}

CleanUpReplacedElementBehavior.$inject = [ 'eventBus', 'modeling', 'commandStack' ];


function cleanUpEvent(element, businessObject, modeling, commandStack) {
  const definitions = businessObject.get('eventDefinitions') || [];

  if (!isAny(businessObject, CATCH_EVENTS) || definitions.length) {
    const invalid = getExtensionElementsList(businessObject)
      .filter(value => isAny(value, DEFINITIONLESS_CATCH_TYPES));

    if (invalid.length) {
      removeExtensionElements(element, businessObject, invalid, commandStack);
    }
  }

  definitions.forEach(definition => {
    if (is(definition, 'bpmn:SignalEventDefinition') && !isAny(businessObject, THROW_EVENTS)) {
      unset(element, definition, [ 'flowable:async' ], modeling);
    }

    if (is(definition, 'bpmn:ErrorEventDefinition') && !isAny(businessObject, CATCH_EVENTS)) {
      unset(element, definition, ERROR_VARIABLE_ATTRIBUTES, modeling);
    }
  });
}

function cleanUpSendTask(element, businessObject, modeling, commandStack) {
  const type = businessObject.get('flowable:type');

  if (!type || SEND_TASK_TYPES.includes(type)) {
    return;
  }

  unset(element, businessObject, [ 'flowable:type' ], modeling);

  const fields = getExtensionElementsList(businessObject, 'flowable:Field');

  if (fields.length) {
    removeExtensionElements(element, businessObject, fields, commandStack);
  }
}

/**
 * Unsets the attributes a moddle element has set.
 */
function unset(element, moddleElement, attributes, modeling) {
  const properties = {};

  attributes.forEach(attribute => {
    if (moddleElement.get(attribute) !== undefined) {
      properties[attribute] = undefined;
    }
  });

  if (Object.keys(properties).length) {
    modeling.updateModdleProperties(element, moddleElement, properties);
  }
}
