/**
 * Flowable resolves errorRef, messageRef, signalRef and escalationRef by
 * code or name when no element has the referenced ID: errorRef="notFound"
 * catches the error code notFound. bpmn-moddle reports such a reference as
 * unresolved and drops it on save.
 *
 * createMissingDefinitions adds the definition Flowable would use and points
 * the reference at it, so the model keeps its meaning:
 *
 *   errorRef="notFound"   ->  <error id="notFound" errorCode="notFound" />
 *   messageRef="order"    ->  <message id="order" name="order" />
 *   signalRef="alarm"     ->  <signal id="alarm" name="alarm" />
 *   escalationRef="late"  ->  <escalation id="late" escalationCode="late" />
 *
 * A value with a prefix bound to the target namespace, such as
 * messageRef="tns:writeReport", is a qualified name for the element with
 * the ID writeReport, as Flowable reads it; it points at that element.
 *
 * Otherwise an existing definition with that code or name is used, or one is
 * created per distinct value. The value becomes its ID when it is a valid,
 * unused ID, so the reference is written as before; otherwise an ID is
 * generated.
 *
 * It only needs moddle, so it runs on any import result, with or without
 * bpmn-js.
 */

const DEFINITIONS = {
  'bpmn:errorRef': { type: 'bpmn:Error', attribute: 'errorCode', prefix: 'Error' },
  'bpmn:messageRef': { type: 'bpmn:Message', attribute: 'name', prefix: 'Message' },
  'bpmn:signalRef': { type: 'bpmn:Signal', attribute: 'name', prefix: 'Signal' },
  'bpmn:escalationRef': { type: 'bpmn:Escalation', attribute: 'escalationCode', prefix: 'Escalation' }
};

const UNRESOLVED = /^unresolved reference </;

/**
 * XML IDs as bpmn.io accepts them (an NCName without dots or dashes first).
 */
const ID_PATTERN = /^[a-z_][\w-.]*$/i;

/**
 * Adds the definitions that unresolved errorRef, messageRef, signalRef and
 * escalationRef values stand for, and removes the fixed warnings.
 *
 * @param {ModdleElement} definitions - the imported bpmn:Definitions
 * @param {Object} result - from the import
 * @param {Object[]} result.warnings - import warnings; fixed ones are removed
 * @param {Object} [result.elementsById] - IDs in use; created IDs are added
 *
 * @return {Object[]} what was fixed: { warning, element, property, value, definition }
 */
export function createMissingDefinitions(definitions, { warnings, elementsById = {} }) {
  if (!definitions || !warnings) {
    return [];
  }

  const moddle = definitions.$model;
  const created = new Map();
  const fixed = [];

  warnings.forEach(warning => {
    const spec = DEFINITIONS[warning.property];

    if (!spec || !warning.element || typeof warning.value !== 'string' || !UNRESOLVED.test(warning.message || '')) {
      return;
    }

    const key = `${ spec.type } ${ warning.value }`;

    let definition = resolveQualifiedName(definitions, spec, warning.value, elementsById) ||
      created.get(key) ||
      findDefinition(definitions, spec, warning.value);

    if (!definition) {
      definition = moddle.create(spec.type, {
        id: getId(spec, warning.value, elementsById),
        [ spec.attribute ]: warning.value
      });

      addRootElement(definitions, definition);

      elementsById[definition.get('id')] = definition;
    }

    created.set(key, definition);

    warning.element.set(warning.property, definition);

    fixed.push({
      warning,
      element: warning.element,
      property: warning.property,
      value: warning.value,
      definition
    });
  });

  // remove the fixed warnings from the caller's list
  const remaining = warnings.filter(warning => !fixed.some(entry => entry.warning === warning));

  warnings.splice(0, warnings.length, ...remaining);

  return fixed;
}


/**
 * The element a qualified name such as tns:writeReport stands for, when its
 * prefix is bound to the target namespace.
 */
function resolveQualifiedName(definitions, spec, value, elementsById) {
  const match = /^([A-Za-z_][\w.-]*):([A-Za-z_][\w.-]*)$/.exec(value);

  if (!match) {
    return null;
  }

  const [ , prefix, id ] = match;
  const namespace = definitions.$attrs && definitions.$attrs[`xmlns:${ prefix }`];
  const element = elementsById[id];

  if (!namespace || namespace !== definitions.get('targetNamespace') || !element || !element.$instanceOf(spec.type)) {
    return null;
  }

  return element;
}

function findDefinition(definitions, spec, value) {
  return (definitions.get('rootElements') || []).find(rootElement =>
    rootElement.$instanceOf(spec.type) && rootElement.get(spec.attribute) === value
  );
}

function getId(spec, value, elementsById) {
  if (ID_PATTERN.test(value) && !elementsById[value]) {
    return value;
  }

  const base = `${ spec.prefix }_${ value.replace(/[^\w-.]/g, '_').replace(/^_+|_+$/g, '') || 'Ref' }`;

  let id = base;

  for (let n = 2; elementsById[id]; n++) {
    id = `${ base }_${ n }`;
  }

  return id;
}

/**
 * Adds a definition after the other error, message, signal and escalation
 * definitions, before the processes and collaborations, where Flowable's
 * exporter writes them.
 */
function addRootElement(definitions, definition) {
  const rootElements = definitions.get('rootElements');

  let index = rootElements.findIndex(rootElement =>
    !Object.values(DEFINITIONS).some(spec => rootElement.$instanceOf(spec.type))
  );

  if (index === -1) {
    index = rootElements.length;
  }

  rootElements.splice(index, 0, definition);

  definition.$parent = definitions;
}
