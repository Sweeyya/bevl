export const EXIT_CODES = {
  PASSED: 0,
  FINDINGS: 1, // ran successfully but found issues
  BAD_USAGE: 2, // wrong arguments
  ENV_ERROR: 3, // browser not available, port in use, etc.
} as const;
