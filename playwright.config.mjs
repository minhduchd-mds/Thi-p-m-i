import {defineConfig,devices} from '@playwright/test';
export default defineConfig({
  testDir:'./tests/e2e',
  fullyParallel:false,
  forbidOnly:true,
  retries:1,
  workers:1,
  timeout:45000,
  expect:{timeout:12000},
  reporter:[['list'],['html',{open:'never',outputFolder:'playwright-report'}]],
  outputDir:'test-results',
  use:{
    baseURL:'http://127.0.0.1:4177',
    ...devices['Desktop Chrome'],
    viewport:{width:1366,height:768},
    trace:'retain-on-failure',
    screenshot:'only-on-failure',
    video:'retain-on-failure',
    acceptDownloads:true
  },
  webServer:{
    command:'node server.js',
    url:'http://127.0.0.1:4177/api/health',
    reuseExistingServer:!process.env.CI,
    timeout:30000,
    env:{PORT:'4177',DATA_DIR:'./.test-data-playwright'}
  }
});
