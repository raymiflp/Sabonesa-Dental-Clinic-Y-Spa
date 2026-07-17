import { execSync } from 'child_process';
import { chromium } from '@playwright/test';

const BACKEND_URL = 'http://localhost:3001';
const ADMIN_CREDENTIALS = {
  email: 'admin@betty.com',
  password: 'Test1234!',
};

async function waitForBackend(maxRetries = 30, interval = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/health`);
      if (res.ok) return;
    } catch {
      // Backend not ready yet
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('Backend did not become ready in time');
}

async function globalSetup() {
  // Re-seed the database to ensure clean state
  console.log('🌱 Seeding E2E test database...');
  execSync('npm run db:seed:e2e', { stdio: 'inherit', cwd: 'backend' });

  // Wait for backend to be ready (started by webServer in playwright.config.js)
  console.log('⏳ Waiting for backend to be ready...');
  await waitForBackend();
  console.log('✅ Backend is ready');

  // Login as admin via API
  console.log('🔑 Logging in as admin...');
  const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ADMIN_CREDENTIALS),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed: ${res.status} — ${text}`);
  }

  const data = await res.json();
  const token = data.token;

  // Save StorageState with the token
  const browser = await chromium.launch();
  const context = await browser.newContext({
    storageState: undefined,
  });

  // Set localStorage token via page
  const page = await context.newPage();
  // Navigate to login first (avoids ProtectedRoute redirect conflicts)
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  // Small delay to ensure React is fully hydrated
  await page.waitForTimeout(500);
  await page.evaluate((t) => {
    localStorage.setItem('token', t);
  }, token);

  await context.storageState({ path: './e2e/.auth/admin.json' });
  console.log('✅ StorageState saved to e2e/.auth/admin.json');

  await browser.close();
}

export default globalSetup;
