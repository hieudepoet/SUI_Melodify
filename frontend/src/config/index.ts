/**
 * Get the test private key from environment variables.
 * Supports both VITE_ and REACT_APP_ prefixes for compatibility.
 */
export const getTestPrivateKey = (): string | undefined => {
  return import.meta.env.VITE_TEST_PRIVATE_KEY || import.meta.env.REACT_APP_TEST_PRIVATE_KEY;
};
