import AllowedExtensionElementsBehavior from './behavior/AllowedExtensionElementsBehavior.js';
import CleanUpReplacedElementBehavior from './behavior/CleanUpReplacedElementBehavior.js';
import TidyExtensionElementsBehavior from './behavior/TidyExtensionElementsBehavior.js';

/**
 * The Flowable behaviors. Each behavior hooks into bpmn-js modeling commands
 * and keeps Flowable extension data consistent with the model.
 */
export default {
  __init__: [
    'allowedExtensionElementsBehavior',
    'cleanUpReplacedElementBehavior',
    'tidyExtensionElementsBehavior'
  ],
  allowedExtensionElementsBehavior: [ 'type', AllowedExtensionElementsBehavior ],
  cleanUpReplacedElementBehavior: [ 'type', CleanUpReplacedElementBehavior ],
  tidyExtensionElementsBehavior: [ 'type', TidyExtensionElementsBehavior ]
};
