import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const STUDIO = '/studio.html';
const ready = async page => {
  await page.goto(STUDIO);
  await expect(page.locator('#stage .stage-block')).toHaveCount(11);
  await expect(page.locator('#asset-grid .asset-card')).toHaveCount(5);
};
const capture = async (page, testInfo, name) => {
  const path = testInfo.outputPath(name + '.png');
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
};

test.describe('Hỷ Studio v2 – browser journey', () => {
  test('Cổng 3D mở đến editor mới và giữ khả năng tắt nhạc', async ({ page }) => {
    await page.goto('/');
    const enter = page.locator('#hy-enter');
    await expect(enter).toBeVisible();
    await enter.click();
    await expect(page.locator('#hy-page-hall')).toBeVisible({ timeout: 12000 });
    await expect(page.locator('#hy-sound-toggle')).toBeVisible();
    await page.locator('[data-hy-action="design"]').click();
    await expect(page).toHaveURL(/\/studio\.html/);
    await expect(page.locator('#stage .stage-block')).toHaveCount(11);
  });

  test('Ba theme có layout thật, giữ dữ liệu custom; screenshot từng mẫu', async ({ page }, testInfo) => {
    await ready(page);
    const initial = await page.locator('[data-block-id="bride"]').evaluate(el => el.style.left);
    await capture(page, testInfo, '01-hong-hy-1366');
    page.on('dialog', dialog => dialog.accept());
    await page.locator('[data-theme="jade"]').click();
    await expect(page.locator('[data-theme="jade"]')).toHaveClass(/active/);
    const jade = await page.locator('[data-block-id="bride"]').evaluate(el => el.style.left);
    expect(jade).not.toBe(initial);
    await capture(page, testInfo, '02-ngoc-uyen-1366');
    await page.locator('[data-theme="pink"]').click();
    await expect(page.locator('[data-theme="pink"]')).toHaveClass(/active/);
    const pink = await page.locator('[data-block-id="bride"]').evaluate(el => el.style.left);
    expect(pink).not.toBe(jade);
    await capture(page, testInfo, '03-hoa-van-1366');
  });

  test('Kéo thả, thay đổi thuộc tính, resize, undo/redo và lưu draft', async ({ page }, testInfo) => {
    await ready(page);
    const blocks = page.locator('#stage .stage-block');
    const initial = await blocks.count();
    await page.locator('.tool[data-add="text"]').dragTo(page.locator('#stage'), { targetPosition: { x: 100, y: 150 } });
    await expect(blocks).toHaveCount(initial + 1);
    const added = page.locator('#stage .stage-block.is-selected');
    await expect(added).toContainText('Lời chúc hạnh phúc');
    const id = await added.getAttribute('data-block-id');
    expect(id).toMatch(/^b[a-z0-9]+$/);
    const beforeLeft = await added.evaluate(el => Number.parseInt(el.style.left));
    const box = await added.boundingBox();
    await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width/2 + 50, box.y + box.height/2 + 25, { steps: 7 });
    await page.mouse.up();
    const afterLeft = await page.locator('[data-block-id="' + id + '"]').evaluate(el => Number.parseInt(el.style.left));
    expect(afterLeft).toBeGreaterThan(beforeLeft);
    await page.locator('#prop-fontSize').fill('48');
    await page.locator('#prop-fontSize').press('Tab');
    await expect(page.locator('[data-block-id="' + id + '"]')).toHaveCSS('font-size','48px');
    await page.locator('[data-command="duplicate"]').click();
    await expect(blocks).toHaveCount(initial + 2);
    await page.locator('#undo').click();
    await expect(blocks).toHaveCount(initial + 1);
    await page.locator('#redo').click();
    await expect(blocks).toHaveCount(initial + 2);
    await page.locator('#save-local').click();
    await page.reload();
    await expect(blocks).toHaveCount(initial + 2);
    await capture(page,testInfo,'04-drag-drop-persisted');
  });

  test('Thư viện ảnh WebP, đổi chữ, xuất WebP/PNG dùng được', async ({ page }, testInfo) => {
    await ready(page);
    await page.locator('.palette-tab[data-panel="fields"]').click();
    await page.locator('#field-bride').fill('Mai Phương');
    await expect(page.locator('[data-block-id="bride"]')).toContainText('Mai Phương');
    await page.locator('.palette-tab[data-panel="blocks"]').click();
    await page.locator('.tool[data-add="image"]').click();
    const fixture=await fs.readFile('public/assets/textures/wood-mahogany.webp');
    await page.locator('#upload-input').setInputFiles({name:'wood.webp',mimeType:'image/webp',buffer:fixture});
    await expect(page.locator('#stage img[src^="data:image/webp;base64,"]')).toHaveCount(1);
    const webpEvent=page.waitForEvent('download');
    await page.locator('#export-webp').click();
    const webp=await webpEvent;
    expect(webp.suggestedFilename()).toMatch(/\.webp$/);
    expect((await fs.stat(await webp.path())).size).toBeGreaterThan(5000);
    const pngEvent=page.waitForEvent('download');
    await page.locator('#export-png').click();
    const png=await pngEvent;
    expect(png.suggestedFilename()).toMatch(/\.png$/);
    expect((await fs.stat(await png.path())).size).toBeGreaterThan(5000);
    await capture(page,testInfo,'05-webp-canvas-export');
  });

  test('Xuất bản trên Node API → khách mở link → RSVP', async ({ page }, testInfo) => {
    await ready(page);
    await page.locator('#publish').click();
    await expect(page.locator('#publish-dialog')).toBeVisible();
    await page.locator('#do-publish').click();
    await expect(page.locator('#publish-link-box')).toBeVisible({ timeout: 15000 });
    const url=await page.locator('#published-url').inputValue();
    expect(url).toMatch(/\/view\.html\?card=[0-9a-f-]+/);
    const visitor=await page.context().newPage();
    await visitor.goto(url);
    await expect(visitor.locator('#viewer')).toBeVisible();
    await expect(visitor.locator('#poster .stage-block')).toHaveCount(11);
    await visitor.locator('#guest-name').fill('Khách kiểm thử');
    await visitor.locator('#wish').fill('Chúc cô dâu và chú rể trăm năm hạnh phúc');
    await visitor.locator('#rsvp button[type="submit"]').click();
    await expect(visitor.locator('#result')).toContainText('đã được ghi nhận', { timeout: 15000 });
    await capture(visitor,testInfo,'06-published-rsvp');
    await visitor.close();
  });

  test('Xem trước trên mobile 390 × 844 không tràn ngang', async ({ page }, testInfo) => {
    await ready(page);
    await page.locator('#save-local').click();
    await page.setViewportSize({width:390,height:844});
    await page.goto('/view.html?preview=1');
    await expect(page.locator('#viewer')).toBeVisible();
    await expect(page.locator('#poster .stage-block')).toHaveCount(11);
    const widths=await page.evaluate(()=>({screen:innerWidth,body:document.body.scrollWidth}));
    expect(widths.body).toBeLessThanOrEqual(widths.screen+2);
    await capture(page,testInfo,'07-mobile-preview-390');
  });
});
