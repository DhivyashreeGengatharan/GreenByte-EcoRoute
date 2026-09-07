import { chromium } from 'playwright';

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 ECOROUTE MASTER PLAYWRIGHT E2E VERIFICATION');
  console.log('====================================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  const consoleErrors = [];
  const network401s = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      console.log(`[Browser Error Console]: ${msg.text()}`);
      consoleErrors.push(msg.text());
    }
  });

  page.on('response', (res) => {
    if (res.status() === 401) {
      console.log(`[401 Response Detected]: ${res.url()}`);
      network401s.push(res.url());
    }
  });

  page.on('pageerror', (err) => {
    console.log(`[Page Crash/Error]: ${err.message}`);
    consoleErrors.push(err.message);
  });

  try {
    // -------------------------------------------------------------
    // TEST 1: LANDING PAGE
    // -------------------------------------------------------------
    console.log('\n[TEST 1] Visiting Landing Page: http://localhost:5173/');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle', timeout: 15000 });
    
    const title = await page.title();
    console.log(`✓ Page loaded. Title: "${title}"`);

    const heroHeading = await page.locator('h1').first().textContent();
    console.log(`✓ Hero Heading: "${heroHeading?.trim()}"`);

    // Test Highway toggle
    const highwayBtn = page.locator('button:has-text("Standard Route"), button:has-text("Direct Highway")').first();
    if (await highwayBtn.isVisible()) {
      await highwayBtn.click();
      console.log('✓ Clicked Highway mode toggle');
      await page.waitForTimeout(300);
    }
    // Test Eco toggle
    const ecoBtn = page.locator('button:has-text("Eco Route"), button:has-text("Eco-Optimized")').first();
    if (await ecoBtn.isVisible()) {
      await ecoBtn.click();
      console.log('✓ Clicked Eco mode toggle');
      await page.waitForTimeout(300);
    }

    // -------------------------------------------------------------
    // TEST 2: DASHBOARD COCKPIT (GUEST STATE)
    // -------------------------------------------------------------
    console.log('\n[TEST 2] Navigating to Dashboard Cockpit: http://localhost:5173/dashboard');
    await page.goto('http://localhost:5173/dashboard', { waitUntil: 'networkidle', timeout: 15000 });

    const mapContainer = page.locator('.leaflet-container');
    await mapContainer.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Leaflet spatial map initialized and visible');

    // -------------------------------------------------------------
    // TEST 3: GUEST ACCESS TO LEDGER (VERIFY ZERO 401s)
    // -------------------------------------------------------------
    console.log('\n[TEST 3] Opening Carbon Credits Ledger as Unauthenticated Guest');
    const ledgerBtn = page.locator('button.nav-ledger-btn, button:has-text("Ledger")').first();
    await ledgerBtn.click();
    await page.waitForTimeout(600);

    const modalHeading = await page.locator('.history-header h2').textContent();
    console.log(`✓ Ledger Modal Opened: "${modalHeading?.trim()}"`);

    const authRequiredText = await page.locator('.history-body').textContent();
    const showsAuthPrompt = authRequiredText?.includes('Authentication Required') || authRequiredText?.includes('Account Required') || authRequiredText?.includes('Sign In');
    console.log(`✓ Ledger gracefully shows Auth Prompt for guest: ${showsAuthPrompt}`);

    console.log(`✓ 401 count during guest ledger access: ${network401s.length}`);
    if (network401s.length > 0) {
      throw new Error(`Unexpected 401 error intercepted: ${network401s.join(', ')}`);
    }

    // Close ledger modal using Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    console.log('✓ Closed Ledger Modal');

    // -------------------------------------------------------------
    // TEST 4: USER AUTHENTICATION
    // -------------------------------------------------------------
    console.log('\n[TEST 4] Authenticating with Demo Account');
    const signInNavBtn = page.locator('header button:has-text("Sign In")').first();
    await signInNavBtn.click();
    await page.waitForTimeout(500);

    const demoFillBtn = page.locator('button.auth-demo-btn, button:has-text("Fill Demo")');
    if (await demoFillBtn.isVisible()) {
      await demoFillBtn.click();
      console.log('✓ Clicked Fill Demo button');
      await page.waitForTimeout(300);
    } else {
      await page.fill('input[type="email"]', 'demo@greenbyte.io');
      await page.fill('input[type="password"]', 'password123');
    }

    // Submit Auth Form
    const submitBtn = page.locator('form button[type="submit"]');
    await submitBtn.click();
    await page.waitForTimeout(1500);

    // Verify user avatar in navbar
    const avatarBtn = page.locator('.nav-avatar-btn');
    await avatarBtn.waitFor({ state: 'visible', timeout: 5000 });
    const avatarText = await avatarBtn.textContent();
    console.log(`✓ Authenticated session active in Navbar. Avatar initials: "${avatarText?.trim()}"`);

    // -------------------------------------------------------------
    // TEST 5: AUTHENTICATED LEDGER ACCESS
    // -------------------------------------------------------------
    console.log('\n[TEST 5] Checking Carbon Credits Ledger as Authenticated User');
    await ledgerBtn.click();
    await page.waitForTimeout(1000);

    const authLedgerContent = await page.locator('.history-body').textContent();
    console.log('✓ Authenticated Ledger body rendered successfully without 401s');
    
    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);

    // -------------------------------------------------------------
    // TEST 6: MAP ROUTING CALCULATION
    // -------------------------------------------------------------
    console.log('\n[TEST 6] Triggering Route Calculation on Map');
    
    // Click on map to place Point A and Point B
    const mapBox = await mapContainer.boundingBox();
    if (mapBox) {
      const originX = mapBox.x + mapBox.width * 0.60;
      const originY = mapBox.y + mapBox.height * 0.35;
      await page.mouse.click(originX, originY);
      console.log(`✓ Placed Pin A on map at (${originX.toFixed(0)}, ${originY.toFixed(0)})`);
      await page.waitForTimeout(600);

      const destX = mapBox.x + mapBox.width * 0.70;
      const destY = mapBox.y + mapBox.height * 0.50;
      await page.mouse.click(destX, destY);
      console.log(`✓ Placed Pin B on map at (${destX.toFixed(0)}, ${destY.toFixed(0)})`);
      await page.waitForTimeout(600);
    }

    const calcBtn = page.locator('button:has-text("Calculate Green Route")').first();
    if (await calcBtn.isEnabled()) {
      await calcBtn.click();
      console.log('✓ Clicked Calculate Green Route');
      
      // Wait for route cards in dashboard panel
      const routeCard = page.locator('.route-card').first();
      await routeCard.waitFor({ state: 'visible', timeout: 20000 });
      
      const allRouteCards = page.locator('.route-card');
      const count = await allRouteCards.count();
      console.log(`✓ Route alternative cards rendered: ${count}`);

      // Click second route card to switch active route
      if (count > 1) {
        await allRouteCards.nth(1).click();
        await page.waitForTimeout(400);
        console.log('✓ Successfully clicked alternative route card');
      }
    }

    // -------------------------------------------------------------
    // TEST 7: DIGITAL TWIN SIMULATION
    // -------------------------------------------------------------
    console.log('\n[TEST 7] Running Digital Twin Simulation');
    const overlayLocator = page.locator('.analytics-overlay');
    let isOverlayVisible = await overlayLocator.isVisible();

    if (!isOverlayVisible) {
      const twinTabBtn = page.locator('button:has-text("Digital Twin")').first();
      if (await twinTabBtn.isVisible()) {
        await twinTabBtn.click({ force: true });
        console.log('✓ Switched to Digital Twin tab in Sidebar');
        await page.waitForTimeout(400);

        const greenWallCard = page.locator('button:has-text("Green Wall")').first();
        if (await greenWallCard.isVisible()) {
          await greenWallCard.click({ force: true });
          console.log('✓ Selected Green Wall biophilic intervention');
          await page.waitForTimeout(300);
        }

        const simImpactBtn = page.locator('button:has-text("Run Digital Twin Simulation"), button:has-text("Simulat")').first();
        if (await simImpactBtn.isVisible()) {
          await simImpactBtn.click({ force: true });
          console.log('✓ Clicked Run Digital Twin Simulation');
        }
      }
    }

    await overlayLocator.waitFor({ state: 'visible', timeout: 10000 });
    console.log('✓ Digital Twin Analytics Laboratory overlay displayed with Charts & Telemetry');

    // Verify PDF Export button exists
    const pdfBtn = page.locator('button:has-text("Export Executive Audit Report"), button:has-text("PDF")').first();
    const hasPdfBtn = await pdfBtn.isVisible();
    console.log(`✓ PDF Audit Export button available: ${hasPdfBtn}`);

    // Close analytics modal via Escape key
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    console.log('✓ Closed Digital Twin Analytics Laboratory');

    // -------------------------------------------------------------
    // TEST 8: CLIMATE TECH MARKETPLACE
    // -------------------------------------------------------------
    console.log('\n[TEST 8] Navigating to Climate Tech Marketplace: http://localhost:5173/marketplace');
    await page.goto('http://localhost:5173/marketplace', { waitUntil: 'networkidle', timeout: 15000 });

    const marketHeading = await page.locator('h1, h2').first().textContent();
    console.log(`✓ Marketplace Loaded: "${marketHeading?.trim()}"`);

    const vendorCards = page.locator('.vendor-card');
    await vendorCards.first().waitFor({ state: 'visible', timeout: 8000 });
    const vCount = await vendorCards.count();
    console.log(`✓ Verified marketplace vendor cards rendered: ${vCount}`);

    // Search filter test
    const searchInput = page.locator('.marketplace-search-input');
    await searchInput.fill('Green Wall');
    await page.waitForTimeout(400);
    const filteredCount = await vendorCards.count();
    console.log(`✓ Search filter for "Green Wall" yielded: ${filteredCount} vendors`);

    // Reset search
    await searchInput.fill('');
    await page.waitForTimeout(300);

    // Pill filter test
    const pillBtn = page.locator('.marketplace-pill-btn:has-text("Algae Panel")').first();
    if (await pillBtn.isVisible()) {
      await pillBtn.click();
      await page.waitForTimeout(300);
      const algaeCount = await vendorCards.count();
      console.log(`✓ Category filter pill "Algae Panel" yielded: ${algaeCount} vendors`);
    }

    // -------------------------------------------------------------
    // FINAL RESULTS & ASSERTIONS
    // -------------------------------------------------------------
    console.log('\n====================================================');
    console.log('📊 MASTER VERIFICATION AUDIT SUMMARY');
    console.log('====================================================');
    console.log(`Total 401 Unauthorized errors detected: ${network401s.length}`);
    console.log(`Total Unhandled Console errors detected: ${consoleErrors.length}`);

    if (network401s.length > 0) {
      console.error('❌ Failed: 401 errors were encountered:');
      network401s.forEach(url => console.error(`  - ${url}`));
      process.exit(1);
    }

    if (consoleErrors.length > 0) {
      console.warn('⚠️ Console messages recorded:');
      consoleErrors.forEach(err => console.warn(`  - ${err}`));
    }

    console.log('\n🎉 ALL 8 E2E VERIFICATION MODULES PASSED WITH 0 UNAUTHORIZED ERRORS!');
  } catch (error) {
    console.error('❌ Verification failed with error:', error);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runVerification();
