import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';

/*
 * Tests run in headless Chromium through Playwright.
 *
 * Use the Chromium that Playwright installs (`npx playwright install chromium`),
 * or set TEST_BROWSER_CHANNEL=chrome to use an installed Google Chrome.
 */
export default defineConfig({
  test: {
    include: [ 'test/**/*.spec.js' ],
    browser: {
      enabled: true,
      headless: true,
      provider: playwright({
        launchOptions: {
          channel: process.env.TEST_BROWSER_CHANNEL || undefined
        }
      }),
      instances: [
        { browser: 'chromium' }
      ]
    }
  }
});
