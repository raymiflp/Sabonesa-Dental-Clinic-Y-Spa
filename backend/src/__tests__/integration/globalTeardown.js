/**
 * Vitest globalTeardown — cleanup after all integration tests.
 *
 * The container is already stopped in globalSetup's teardown export.
 * This file exists as a separate entry point for Vitest's globalTeardown config.
 */
export async function teardown() {
  // All cleanup is handled in globalSetup.js teardown export.
  // This file is required by Vitest's globalTeardown configuration.
}
