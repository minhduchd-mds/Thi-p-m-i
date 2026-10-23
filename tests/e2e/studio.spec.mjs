import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';

const STUDIO = '/studio.html';
const ready = async page => {
  await page.goto(STUDIO);
  await expect(page.locator('#stage .stage-block')).toHaveCount(11);
  await expect(page.locator('#asset-grid .asset-card')).toHaveCount(5);
  await expect(page.locator('#fields-form textarea#field-message')).toHaveCount(1);
};
const capture = async (page, testInfo, name) => {
  const path = testInfo.outputPath(name + '.png');
  await page.screenshot({ path, fullPage: true, animations: 'disabled' });
  await testInfo.attach(name, { path, contentType: 'image/png' });
};

const javascriptErrors = new WeakMap();
test.beforeEach(async ({ page }) => {
  const issues = [];
  javascriptErrors.set(page, issues);
  page.on('pageerror', error => issues.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(javascriptErrors.get(page) || [], 'Unexpected browser JavaScript exceptions').toEqual([]);
});

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
    expect(url).toMatch(/\/i\/HY-[A-HJ-NP-Z2-9]{12}$/);
    const visitor=await page.context().newPage();
    await visitor.goto(url);
    await expect(visitor.locator('#viewer')).toBeVisible();
    await expect(visitor.locator('#poster .stage-block')).toHaveCount(11);
    await visitor.locator('#toggle-open').click();
    await expect(visitor.locator('#book')).toHaveClass(/is-open/);
    await expect(visitor.locator('#inside-poster .stage-block').first()).toBeVisible();
    await visitor.locator('#guest-name').fill('Khách kiểm thử');
    await visitor.locator('#wish').fill('Chúc cô dâu và chú rể trăm năm hạnh phúc');
    await visitor.locator('#rsvp button[type="submit"]').click();
    await expect(visitor.locator('#result')).toContainText('đã được ghi nhận', { timeout: 15000 });
    await capture(visitor,testInfo,'06-published-rsvp');
    await visitor.close();
  });

  test('Chỉnh mặt trong, lưu riêng và Preview mở thiệp có animation', async ({ page }, testInfo) => {
    await ready(page);
    await expect(page.locator('[data-face="cover"]')).toHaveAttribute('aria-selected','true');
    await page.locator('[data-face="inside"]').click();
    await expect(page.locator('[data-face="inside"]')).toHaveAttribute('aria-selected','true');
    await expect(page.locator('#stage [data-block-id="inside-message"]')).toBeVisible();
    const initial=await page.locator('#stage .stage-block').count();
    await page.locator('.tool[data-add="text"]').click();
    await expect(page.locator('#stage .stage-block')).toHaveCount(initial+1);
    await page.locator('#save-local').click();
    await page.reload();
    await page.locator('[data-face="inside"]').click();
    await expect(page.locator('#stage .stage-block')).toHaveCount(initial+1);
    await capture(page,testInfo,'08-inside-editing');
    const previewPromise=page.context().waitForEvent('page');
    await page.locator('#preview').click();
    const preview=await previewPromise;
    await preview.waitForLoadState('domcontentloaded');
    await expect(preview.locator('#viewer')).toBeVisible();
    await expect(preview.locator('#poster .stage-block')).toHaveCount(11);
    await expect(preview.locator('#inside-poster [data-block-id="inside-message"]')).toBeVisible();
    await expect(preview.locator('#book')).toHaveClass(/is-open/, {timeout:4500});
    await expect(preview.locator('#toggle-open')).toHaveAttribute('aria-expanded','true');
    await capture(preview,testInfo,'09-opening-animation-inner');
    await preview.locator('#toggle-open').click();
    await expect(preview.locator('#book')).not.toHaveClass(/is-open/);
    await preview.locator('#toggle-open').click();
    await expect(preview.locator('#book')).toHaveClass(/is-open/);
    await preview.close();
  });


  test('Tuỳ chỉnh nhiều trang: Google Maps, VietQR và trang mới; lưu và mở trên thiệp khách', async ({page},testInfo)=>{
    await ready(page);
    await page.locator('[data-new-page="map"]').click();
    await expect(page.locator('#stage [data-block-id="map-photo"]')).toBeVisible();
    await page.locator('.palette-tab[data-panel="fields"]').click();
    await page.locator('#field-venue').fill('Trung tâm tiệc cưới Bách Việt');
    await page.locator('#field-address').fill('Hà Nội, Việt Nam');
    await expect(page.locator('#stage .map-place')).toContainText('Trung tâm tiệc cưới Bách Việt');
    await expect(page.locator('#map-preview-link')).toHaveAttribute('href',/google\.com\/maps\/search\/\?api=1/);
    await page.locator('.palette-tab[data-panel="blocks"]').click();
    await page.locator('[data-new-page="gift"]').click();
    await page.locator('.palette-tab[data-panel="fields"]').click();
    await expect(page.locator('#stage .gift-qr-placeholder')).toBeVisible();
    await page.locator('#gift-bank').selectOption('VCB');
    await page.locator('#gift-account').fill('0123456789');
    await page.locator('#gift-holder').fill('Test Receiver');
    await page.locator('#gift-note').fill('Mung cuoi');
    await expect(page.locator('#stage .gift-qr-block img')).toHaveAttribute('src',/img\.vietqr\.io\/image\/VCB-0123456789/);
    await capture(page,testInfo,'10-gift-qr');
    await page.locator('.palette-tab[data-panel="blocks"]').click();
    await page.locator('[data-new-page="custom"]').click();
    await expect(page.locator('#stage .stage-block')).toHaveCount(5);
    await page.locator('#current-page-title').fill('Kỷ niệm của chúng mình');
    await page.locator('#current-page-title').press('Tab');
    await page.locator('#page-duplicate').click();
    await expect(page.locator('#extra-page-tabs [data-face]')).toHaveCount(4);
    page.once('dialog',d=>d.accept());
    await page.locator('#page-remove').click();
    await expect(page.locator('#extra-page-tabs [data-face]')).toHaveCount(3);
    await page.locator('#save-local').click();
    await page.reload();
    await expect(page.locator('#extra-page-tabs [data-face]')).toHaveCount(3);
    const open=page.context().waitForEvent('page');
    await page.locator('#preview').click();
    const viewer=await open;await viewer.waitForLoadState('domcontentloaded');
    await expect(viewer.locator('#book')).toHaveClass(/is-open/,{timeout:5000});
    await viewer.locator('#page-next').click();
    await expect(viewer.locator('#page-name')).toContainText('Địa điểm');
    await expect(viewer.locator('#map-directions')).toHaveAttribute('href',/google\.com\/maps\/search/);
    await viewer.locator('#page-next').click();
    await expect(viewer.locator('#page-name')).toContainText('Mừng cưới');
    await expect(viewer.locator('#gift-bank-details')).toContainText('0123456789');
    await viewer.locator('#page-next').click();
    await expect(viewer.locator('#page-name')).toContainText('Kỷ niệm');
    await expect(viewer.locator('#page-interactions')).toBeHidden();
    await expect(viewer.locator('#map-directions')).toBeHidden();
    await expect(viewer.locator('#gift-details')).toBeHidden();
    await expect(viewer.locator('#poster')).toHaveCSS('pointer-events','none');
    await expect(viewer.locator('#cover-leaf')).toHaveCSS('pointer-events','none');
    await expect(viewer.locator('#back-couple')).toContainText('Minh Anh & Hoàng Nam');
    await expect(viewer.locator('#book-left-inside')).toBeVisible();
    await expect(viewer.locator('#left-couple')).toContainText('Minh Anh & Hoàng Nam');
    await expect(viewer.locator('#book-left-inside')).toBeVisible();
    await expect(viewer.locator('#left-couple')).toContainText('Minh Anh & Hoàng Nam');
    await capture(viewer,testInfo,'11-extra-custom-page');
    await viewer.close();
  });

  test('Lưới không thay nền của Hồng Hỷ, Ngọc Uyển và Hoa Vân', async ({page}, testInfo)=>{
    await ready(page);
    page.on('dialog',d=>d.accept());
    for(const theme of ['red','jade','pink']){
      await page.locator('[data-theme="'+theme+'"]').click();
      const before=await page.locator('#stage').evaluate(el=>getComputedStyle(el).backgroundImage);
      await page.locator('#grid-toggle').click();
      await expect(page.locator('#stage')).toHaveClass(/show-grid/);
      const after=await page.locator('#stage').evaluate(el=>getComputedStyle(el).backgroundImage);
      expect(after, 'Grid overlay must never replace invitation paper background').toBe(before);
      const overlay=await page.locator('#stage').evaluate(el=>getComputedStyle(el,'::after').backgroundImage);
      expect(overlay).toContain('linear-gradient');
      if(theme==='red')await capture(page,testInfo,'12-grid-preserves-paper');
      await page.locator('#grid-toggle').click();
    }
  });

  test('Không xuất QR thiếu ảnh khi VietQR bị ngắt kết nối', async ({page})=>{
    await page.route('https://img.vietqr.io/**',route=>route.abort('failed'));
    await ready(page);
    await page.locator('[data-new-page="gift"]').click();
    await page.locator('.palette-tab[data-panel="fields"]').click();
    await page.locator('#gift-account').fill('0123456789');
    await page.locator('#gift-holder').fill('Test Receiver');
    await expect(page.locator('#stage .gift-qr-placeholder')).toContainText('Không tải được mã VietQR');
    await page.locator('.palette-tab[data-panel="blocks"]').click();
    await page.locator('#export-png').click();
    await expect(page.locator('#status')).toContainText('Xuất PNG thất bại');
    await expect(page.locator('#status')).toContainText('VietQR');
  });

  test('Mobile mở thiệp nhiều trang, xem bản đồ và QR không tràn ngang', async ({page},testInfo)=>{
    await ready(page);
    await page.locator('[data-new-page="map"]').click();
    await page.locator('[data-new-page="gift"]').click();
    await page.locator('#save-local').click();
    await page.setViewportSize({width:390,height:844});
    await page.goto('/view.html?preview=1');
    await expect(page.locator('#viewer')).toBeVisible();
    await page.locator('#toggle-open').click();
    await expect(page.locator('#book')).toHaveClass(/is-open/);
    await page.locator('#page-next').click();
    await expect(page.locator('#page-name')).toContainText('Địa điểm');
    await expect(page.locator('#map-directions')).toBeVisible();
    await page.locator('#page-next').click();
    await expect(page.locator('#page-name')).toContainText('Mừng cưới');
    await expect(page.locator('#gift-details')).toBeHidden();
    const widths=await page.evaluate(()=>({screen:innerWidth,body:document.documentElement.scrollWidth}));
    expect(widths.body).toBeLessThanOrEqual(widths.screen+2);
    await capture(page,testInfo,'13-mobile-open-multipage');
  });

  test('PDF in 120×180mm nhiều trang và trang đang chọn',async({page},testInfo)=>{
    await ready(page);
    await page.locator('[data-new-page="map"]').click();
    const down=page.waitForEvent('download');
    await page.locator('#export-pdf-all').click();
    const pdf=await down;
    expect(pdf.suggestedFilename()).toMatch(/-toan-bo\.pdf$/);
    const content=await fs.readFile(await pdf.path());
    expect(content.subarray(0,8).toString()).toBe('%PDF-1.4');
    expect((content.toString('latin1').match(/\/Type \/Page\s/g)||[]).length).toBe(3);
    expect(content.toString('latin1')).toContain('/MediaBox [0 0 340.15748 510.23622]');
    const single=page.waitForEvent('download');
    await page.locator('#export-pdf-page').click();
    const pagePdf=await single;
    const bytes=await fs.readFile(await pagePdf.path());
    expect((bytes.toString('latin1').match(/\/Type \/Page\s/g)||[]).length).toBe(1);
    await capture(page,testInfo,'14-pdf-multipage');
  });

  test('Xuất bản mã HY duy nhất, link đẹp, thu hồi, gia hạn và khôi phục',async({page},testInfo)=>{
    await ready(page);
    await page.locator('#publish').click();
    await page.locator('#do-publish').click();
    await expect(page.locator('#publish-link-box')).toBeVisible({timeout:15000});
    const code=await page.locator('#public-code').innerText();
    expect(code).toMatch(/^HY-[A-HJ-NP-Z2-9]{12}$/);
    const link=await page.locator('#published-url').inputValue();
    expect(link).toContain('/i/'+code);
    await expect(page.locator('#share-qr')).toHaveAttribute('src',/api\.qrserver\.com\/v1\/create-qr-code/);
    const view=await page.context().newPage();
    await view.goto(link);
    await expect(view.locator('#viewer')).toBeVisible();
    await expect(view.locator('#inside-poster')).toBeVisible();
    await page.locator('#publish-dialog button[value="close"]').click();
    await page.locator('#manage').click();
    await expect(page.locator('#manage-information')).toBeVisible();
    await expect(page.locator('#manage-summary')).toContainText(code);
    const initial=await page.locator('#manage-summary').innerText();
    await page.locator('#manage-extend').click();
    await expect(page.locator('#manage-message')).toContainText('Đã gia hạn');
    const updated=await page.locator('#manage-summary').innerText();
    expect(updated).not.toBe(initial);
    page.once('dialog',dialog=>dialog.accept());
    await page.locator('#manage-toggle').click();
    await expect(page.locator('#manage-summary')).toContainText('Đã thu hồi');
    await view.reload();
    await expect(view.locator('#loading')).toContainText('Không thể mở thiệp');
    await page.locator('#manage-toggle').click();
    await expect(page.locator('#manage-summary')).toContainText('Đang hoạt động');
    await view.reload();
    await expect(view.locator('#viewer')).toBeVisible();
    await capture(page,testInfo,'15-owner-publication-dashboard');
    await view.close();
  });


  test('Bìa không xuyên chữ mặt trong; animation lật có trạng thái chuyển động thật',async({page},testInfo)=>{
    await ready(page);
    await page.locator('#save-local').click();
    await page.goto('/view.html?preview=1');
    await expect(page.locator('#viewer')).toBeVisible();
    const cover=page.locator('#cover-leaf'),inside=page.locator('#inside-poster');
    await expect(inside).toHaveCSS('visibility','hidden');
    await expect(inside).toHaveCSS('opacity','0');
    await expect(cover).toHaveCSS('backface-visibility','hidden');
    await expect(page.locator('body')).toHaveCSS('background-image','none');
    await capture(page,testInfo,'16-cover-no-text-bleed');
    const before=await cover.evaluate(el=>getComputedStyle(el).transform);
    await page.locator('#toggle-open').click();
    await page.waitForTimeout(180);
    const middle=await cover.evaluate(el=>getComputedStyle(el).transform);
    expect(middle).not.toBe(before);
    await page.waitForTimeout(1450);
    const finish=await cover.evaluate(el=>getComputedStyle(el).transform);
    expect(finish).not.toBe(middle);
    await expect(inside).toHaveCSS('visibility','visible');
    await expect(page.locator('#book-left-inside')).toBeVisible();
    await capture(page,testInfo,'17-open-after-real-animation');
    await page.locator('#toggle-open').click();
    await page.waitForTimeout(1400);
    await expect(inside).toHaveCSS('visibility','hidden');
    await expect(inside).toHaveCSS('opacity','0');
  });

  test('Link công khai mở trên điện thoại mới, không phụ thuộc localStorage',async({page,browser},testInfo)=>{
    await ready(page);
    await page.locator('#publish').click();
    await page.locator('#do-publish').click();
    await expect(page.locator('#publish-link-box')).toBeVisible({timeout:15000});
    const link=await page.locator('#published-url').inputValue();
    const context=await browser.newContext({viewport:{width:375,height:812},deviceScaleFactor:2,isMobile:true,hasTouch:true});
    const phone=await context.newPage();
    await phone.goto(link);
    await expect(phone.locator('#viewer')).toBeVisible({timeout:20000});
    await expect(phone.locator('#loading')).toBeHidden();
    await expect(phone.locator('#inside-poster')).toHaveCSS('visibility','hidden');
    await phone.locator('#toggle-open').click();
    await phone.waitForTimeout(1100);
    await expect(phone.locator('#inside-poster')).toHaveCSS('visibility','visible');
    await expect(phone.locator('#toggle-open')).toHaveAttribute('aria-expanded','true');
    const layout=await phone.evaluate(()=>({screen:innerWidth,page:document.documentElement.scrollWidth}));
    expect(layout.page).toBeLessThanOrEqual(layout.screen+2);
    await capture(phone,testInfo,'18-fresh-iphone-public-link');
    await context.close();
  });

  test('Preview cục bộ trên mobile khác báo cách lấy link đúng thay vì loading vô hạn',async({browser})=>{
    const context=await browser.newContext({baseURL:'http://127.0.0.1:4177',viewport:{width:390,height:844},isMobile:true,hasTouch:true});
    const phone=await context.newPage();
    await phone.goto('/view.html?preview=1&animate=1');
    await expect(phone.locator('#loading')).toHaveClass(/is-error/);
    await expect(phone.locator('#loading')).toContainText('Xuất bản');
    await expect(phone.locator('#loading a').first()).toBeVisible();
    await context.close();
  });

  test('Header editor bám phía trên; nền canvas sạch trên màn mobile',async({page},testInfo)=>{
    await page.setViewportSize({width:390,height:844});
    await ready(page);
    const header=page.locator('.topbar');
    await expect(header).toHaveCSS('position','sticky');
    await expect(header).toHaveCSS('top','0px');
    await expect(page.locator('.canvas-area')).toHaveCSS('background-image','none');
    await page.evaluate(()=>window.scrollTo(0,420));
    await expect(header).toBeInViewport();
    const layout=await page.evaluate(()=>({screen:innerWidth,page:document.documentElement.scrollWidth}));
    expect(layout.page).toBeLessThanOrEqual(layout.screen+2);
    await capture(page,testInfo,'19-clean-mobile-editor');
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
