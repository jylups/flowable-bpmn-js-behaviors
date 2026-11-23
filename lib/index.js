import TidyExtensionElementsBehavior from './behavior/TidyExtensionElementsBehavior.js';

/**
 * The Flowable behaviors. Each behavior hooks into bpmn-js modeling commands
 * and keeps Flowable extension data consistent with the model.
 */
export default {
  __init__: [
    'tidyExtensionElementsBehavior'
  ],
  tidyExtensionElementsBehavior: [ 'type', TidyExtensionElementsBehavior ]
};
