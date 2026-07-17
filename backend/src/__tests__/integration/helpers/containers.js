import { PostgreSqlContainer } from '@testcontainers/postgresql';

/** @type {import('@testcontainers/postgresql').StartedPostgreSqlContainer | null} */
let container;

/**
 * Start a PostgreSQL Testcontainer and return the connection URI.
 *
 * @returns {Promise<string>} The JDBC/connection URI for the started container
 */
export async function startPostgres() {
  container = await new PostgreSqlContainer('postgres:16-alpine')
    .withDatabase('betty_test')
    .withUsername('test')
    .withPassword('test')
    .start();
  return container.getConnectionUri();
}

/**
 * Stop the PostgreSQL container if it was started.
 */
export async function stopPostgres() {
  if (container) {
    try {
      await container.stop();
    } catch (err) {
      console.warn('[containers] Error stopping container:', err.message);
    }
    container = null;
  }
}
