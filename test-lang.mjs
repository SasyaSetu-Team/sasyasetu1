import { chromium } from 'playwright';

const BASE = 'http://localhost:5173';
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const results = [];

  await page.goto(BASE);
  await sleep(2000);

  await page.click('button.role-card:has-text("Farmer")');
  await sleep(1000);
  await page.fill('input[type="password"]', 'test123456');
  await page.click('button.button:has-text("Sign In")');
  await sleep(3000);

  await page.click('button:has-text("My Crops")');
  await sleep(2000);

  const enTitle = await page.textContent('h1');
  results.push(`EN crops title: ${enTitle}`);

  await page.click('button:has-text("Add")').catch(() => {});
  await sleep(2000);
  const enFormText = await page.textContent('.form-card').catch(() => 'no form');
  results.push(`EN form has "Crop name": ${enFormText?.includes('Crop name') || false}`);
  results.push(`EN form has "Status": ${enFormText?.includes('Status') || false}`);
  results.push(`EN form has "Other crop": ${enFormText?.includes('Other crop') || false}`);

  await page.click('button:has-text("Back")').catch(() => {});
  await sleep(1000);

  await page.click('.floating-tools button:first-child').catch(() => {});
  await sleep(1000);
  await page.click('button:has-text("Settings")').catch(() => {});
  await sleep(1000);
  await page.click('button:has-text("తెలుగు")').catch(() => {});
  await sleep(1000);

  await page.click('button:has-text("Back")').catch(() => {});
  await sleep(500);
  await page.click('button:has-text("Back")').catch(() => {});
  await sleep(1000);
  await page.click('button:has-text("నా పంటలు")').catch(() => {});
  await sleep(2000);

  const teTitle = await page.textContent('h1').catch(() => 'not found');
  results.push(`TE crops title: ${teTitle}`);

  await page.click('button:has-text("పంట జోడించండి")').catch(() => {});
  await sleep(2000);
  const teFormText = await page.textContent('.form-card').catch(() => 'no form');
  results.push(`TE form has "పంట పేరు": ${teFormText?.includes('పంట పేరు') || false}`);
  results.push(`TE form has "స్థితి": ${teFormText?.includes('స్థితి') || false}`);
  results.push(`TE form has "ఇతర పంట": ${teFormText?.includes('ఇతర పంట') || false}`);

  await page.click('button:has-text("వెనుకకు")').catch(() => {});
  await sleep(1000);
  await page.click('.floating-tools button:first-child').catch(() => {});
  await sleep(1000);
  await page.click('button:has-text("సెట్టింగ్‌లు")').catch(() => {});
  await sleep(1000);
  await page.click('button:has-text("हिन्दी")').catch(() => {});
  await sleep(1000);
  await page.click('button:has-text("वापस")').catch(() => {});
  await sleep(500);
  await page.click('button:has-text("वापस")').catch(() => {});
  await sleep(1000);
  await page.click('button:has-text("मेरी फसलें")').catch(() => {});
  await sleep(2000);

  const hiTitle = await page.textContent('h1').catch(() => 'not found');
  results.push(`HI crops title: ${hiTitle}`);

  await page.click('button:has-text("फसल जोड़ें")').catch(() => {});
  await sleep(2000);
  const hiFormText = await page.textContent('.form-card').catch(() => 'no form');
  results.push(`HI form has "फसल नाम": ${hiFormText?.includes('फसल नाम') || false}`);
  results.push(`HI form has "स्थिति": ${hiFormText?.includes('स्थिति') || false}`);
  results.push(`HI form has "अन्य फसल": ${hiFormText?.includes('अन्य फसल') || false}`);

  console.log(results.join('\n'));
  await browser.close();
}

test().catch(e => { console.error(e.message); process.exit(1); });
