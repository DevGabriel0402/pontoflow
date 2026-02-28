const { chromium } = require('playwright');

(async () => {
    console.log('Starting Playwright...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error' || msg.type() === 'warning') {
            console.log(`[Browser ${msg.type()}] ${msg.text()}`);
        }
    });
    page.on('pageerror', error => {
        console.log(`[Browser PageError] ${error.stack}`);
    });

    console.log('Navigating to login...');
    await page.goto('http://localhost:3000');

    // Login as admin
    await page.fill('input[type="email"]', 'gabriellucas2301@gmail.com');
    await page.click('button:has-text("Entrar")');

    console.log('Waiting for login...');
    await page.waitForTimeout(3000);

    console.log('Navigating to admin dashboard...');
    await page.goto('http://localhost:3000/admin');
    await page.waitForTimeout(3000);

    console.log('Clicking Banco de Horas tab...');
    try {
        // Attempt to click the tab
        await page.click('text="Banco de Horas"');
        // Wait a bit to let the crash happen
        await page.waitForTimeout(3000);
    } catch (e) {
        console.error('Error clicking tab:', e.message);
    }

    console.log('Done capturing logs.');
    await browser.close();
})();
