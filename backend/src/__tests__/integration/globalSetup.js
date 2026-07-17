import { startPostgres, stopPostgres } from './helpers/containers.js';

/**
 * Vitest globalSetup — starts a PostgreSQL Testcontainer and runs Prisma migrations.
 *
 * If Docker is not available, sets SKIP_INTEGRATION_TESTS so test files can skip gracefully.
 */
export async function setup() {
  try {
    const databaseUrl = await startPostgres();
    process.env.INTEGRATION_DATABASE_URL = databaseUrl;

    // Run prisma db push to create the schema in the ephemeral container
    const { execSync } = await import('child_process');
    execSync('npx prisma db push --skip-generate', {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      cwd: process.cwd(),
      stdio: 'pipe',
    });

    console.log('[globalSetup] PostgreSQL Testcontainer ready — schema pushed');
  } catch (err) {
    // Likely Docker not available — skip all integration tests
    console.warn('[globalSetup] Docker not available — skipping integration tests:', err.message);
    process.env.SKIP_INTEGRATION_TESTS = 'true';
  }
}

export async function teardown() {
  // If setup succeeded, stop the container
  if (!process.env.SKIP_INTEGRATION_TESTS && process.env.INTEGRATION_DATABASE_URL) {
    await stopPostgres();
    console.log('[globalTeardown] PostgreSQL Testcontainer stopped');
  }
}
