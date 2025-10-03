// Result type for error handling
export { Result, Ok, Err } from './result.js';

// UUID utilities
export {
  generateUuid,
  validateUuid,
  isValidUuid,
  parseUuid,
} from './uuid-utils.js';

// Value objects
export { RecordId } from './record-id.js';
export { TagId } from './tag-id.js';
export { RecordContent } from './record-content.js';
export { SearchQuery } from './search-query.js';

// Date utilities
export {
  formatDate,
  parseDate,
  isValidDate,
  getCurrentTimestamp,
  addDays,
  subtractDays,
  daysBetween,
  type DateInput,
  type DateFormat,
} from './date-utils.js';

// String utilities
export {
  normalizeString,
  slugify,
  truncate,
  sanitizeInput,
  isEmptyOrWhitespace,
} from './string-utils.js';

// Validation constants and rules
export { ValidationConstants, ValidationRules } from './validation-constants.js';

// Configuration
export { DefaultConfig, createConfig, type AppConfig } from './config.js';
