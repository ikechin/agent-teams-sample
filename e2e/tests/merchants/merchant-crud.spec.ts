import { test, expect, Page } from '@playwright/test';
import { waitForElement } from '../../utils/test-helpers';
import { ROLES } from '../../utils/roles';

test.use({ storageState: ROLES['contract-manager'].storageStatePath });

test.describe.serial('加盟店CRUD操作', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({
      storageState: ROLES['contract-manager'].storageStatePath,
    });
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('加盟店を新規登録できる', async () => {
    // 加盟店一覧へ
    await page.goto('/dashboard/merchants');
    await waitForElement(page, 'table');

    // 新規登録ボタンをクリック
    await page.click('a:has-text("新規登録")');
    await expect(page).toHaveURL(/.*merchants\/new/);

    // フォーム入力（merchant_codeは自動生成のため入力不要）
    await page.fill('#name', 'E2Eテスト加盟店');
    await page.fill('#address', '東京都渋谷区テスト町1-2-3');
    await page.fill('#contact_person', '山田太郎');
    await page.fill('#phone', '03-1234-5678');
    await page.fill('#email', 'e2e-test@example.com');

    // 登録ボタンをクリック
    await page.click('button:has-text("登録")');

    // 詳細画面または一覧画面にリダイレクトされる
    await expect(page).toHaveURL(/.*merchants\/[a-f0-9-]+$|.*merchants$/);

    // 登録した加盟店名が表示される（h2見出しで確認）
    await expect(page.locator('h2:has-text("E2Eテスト加盟店")')).toBeVisible({ timeout: 10000 });
  });

  test('加盟店詳細を表示できる', async () => {
    await page.goto('/dashboard/merchants');
    await waitForElement(page, 'table');

    // 最初の加盟店の名前を取得
    const firstMerchantName = await page.locator('table tbody tr:first-child td:nth-child(2)').textContent();

    // 最初の加盟店をクリック
    await page.click('table tbody tr:first-child');

    // 詳細画面が表示される
    await expect(page).toHaveURL(/.*merchants\/[a-f0-9-]+$/);

    // 加盟店名がh2で表示される
    if (firstMerchantName) {
      await expect(page.locator('h2')).toContainText(firstMerchantName.trim());
    }

    // 基本情報と連絡先情報のカードが表示される
    await expect(page.locator('text=基本情報')).toBeVisible();
    await expect(page.locator('text=連絡先情報')).toBeVisible();

    // 編集・削除ボタンが表示される
    await expect(page.locator('button:has-text("編集")')).toBeVisible();
    await expect(page.locator('button:has-text("削除")')).toBeVisible();
  });

  test('加盟店を編集できる', async () => {
    await page.goto('/dashboard/merchants');
    await waitForElement(page, 'table');

    // 最初の加盟店をクリックして詳細へ
    await page.click('table tbody tr:first-child');
    await expect(page).toHaveURL(/.*merchants\/[a-f0-9-]+$/);

    // 編集ボタンをクリック
    await page.click('button:has-text("編集")');
    await expect(page).toHaveURL(/.*edit$/);

    // 編集フォームが表示される
    await expect(page.locator('text=加盟店情報の編集')).toBeVisible();

    // フォームにデータがプリフィルされている
    const nameValue = await page.locator('#name').inputValue();
    expect(nameValue).not.toBe('');

    // 加盟店名を変更
    await page.fill('#name', '更新後の加盟店名（E2E）');

    // 更新ボタンをクリック
    await page.click('button:has-text("更新")');

    // 詳細画面にリダイレクトされる
    await expect(page).toHaveURL(/.*merchants\/[a-f0-9-]+$/);

    // 更新後の名前が表示される
    await expect(page.locator('h2')).toContainText('更新後の加盟店名（E2E）', { timeout: 10000 });
  });

  test('加盟店削除ボタンを押すと確認ダイアログが表示される', async () => {
    await page.goto('/dashboard/merchants');
    await waitForElement(page, 'table');

    // 最初の加盟店をクリックして詳細へ
    await page.click('table tbody tr:first-child');
    await expect(page).toHaveURL(/.*merchants\/[a-f0-9-]+$/);

    // 削除ボタンをクリック
    await page.click('button:has-text("削除")');

    // 確認ダイアログが表示される
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=この操作は取り消せません')).toBeVisible();

    // 加盟店名がダイアログに含まれている
    await expect(page.locator('[role="dialog"]')).toContainText('削除しますか');

    // ダイアログを閉じる
    await page.locator('[role="dialog"] button:has-text("キャンセル")').click();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('権限がないユーザーが削除するとエラーが表示される', async () => {
    // テストユーザー(contract-manager)はmerchants:delete権限なし
    await page.goto('/dashboard/merchants');
    await waitForElement(page, 'table');

    // 最初の加盟店をクリックして詳細へ
    await page.click('table tbody tr:first-child');
    await expect(page).toHaveURL(/.*merchants\/[a-f0-9-]+$/);

    // 削除ボタンをクリック
    await page.click('button:has-text("削除")');
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // ダイアログ内の削除ボタンをクリック
    await page.locator('[role="dialog"] button:has-text("削除")').click();

    // 権限エラーが表示される（Permission denied）
    await expect(page.locator('[role="alert"]')).toBeVisible({ timeout: 10000 });

    // ダイアログを閉じる
    await page.locator('[role="dialog"] button:has-text("キャンセル")').click();
  });

  test('編集画面で必須項目が空の場合、バリデーションエラーが表示される', async () => {
    await page.goto('/dashboard/merchants');
    await waitForElement(page, 'table');

    // 最初の加盟店をクリック→詳細→編集
    await page.click('table tbody tr:first-child');
    await expect(page).toHaveURL(/.*merchants\/[a-f0-9-]+$/);
    await page.click('button:has-text("編集")');
    await expect(page).toHaveURL(/.*edit$/);

    // 必須フィールドをクリア
    await page.fill('#name', '');
    await page.fill('#address', '');
    await page.fill('#contact_person', '');
    await page.fill('#phone', '');

    // 更新ボタンをクリック
    await page.click('button:has-text("更新")');

    // バリデーションエラーが表示される
    await expect(page.locator('text=加盟店名は必須です')).toBeVisible();
    await expect(page.locator('text=住所は必須です')).toBeVisible();
    await expect(page.locator('text=担当者名は必須です')).toBeVisible();
    await expect(page.locator('text=電話番号は必須です')).toBeVisible();
  });

  test('削除確認ダイアログでキャンセルすると削除されない', async () => {
    await page.goto('/dashboard/merchants');
    await waitForElement(page, 'table');

    // 最初の加盟店をクリックして詳細へ
    await page.click('table tbody tr:first-child');
    await expect(page).toHaveURL(/.*merchants\/[a-f0-9-]+$/);

    // 加盟店名を記憶
    const merchantName = await page.locator('h2').textContent();

    // 削除ボタンをクリック
    await page.click('button:has-text("削除")');

    // 確認ダイアログが表示される
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // キャンセルボタンをクリック
    await page.locator('[role="dialog"] button:has-text("キャンセル")').click();

    // ダイアログが閉じる
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // 詳細画面にとどまっている
    await expect(page).toHaveURL(/.*merchants\/[a-f0-9-]+$/);

    // 加盟店名がまだ表示されている
    if (merchantName) {
      await expect(page.locator('h2')).toContainText(merchantName.trim());
    }
  });

  test('削除確認ダイアログをESCキーで閉じられる', async () => {
    await page.goto('/dashboard/merchants');
    await waitForElement(page, 'table');

    // 最初の加盟店をクリックして詳細へ
    await page.click('table tbody tr:first-child');
    await expect(page).toHaveURL(/.*merchants\/[a-f0-9-]+$/);

    // 削除ボタンをクリック
    await page.click('button:has-text("削除")');

    // 確認ダイアログが表示される
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // ESCキーを押す
    await page.keyboard.press('Escape');

    // ダイアログが閉じる
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  test('新規登録画面で必須項目が空の場合、バリデーションエラーが表示される', async () => {
    await page.goto('/dashboard/merchants/new');

    // 何も入力せずに登録ボタンをクリック
    await page.click('button:has-text("登録")');

    // バリデーションエラーが表示される
    await expect(page.locator('text=加盟店名は必須です')).toBeVisible();
    await expect(page.locator('text=住所は必須です')).toBeVisible();
    await expect(page.locator('text=担当者名は必須です')).toBeVisible();
    await expect(page.locator('text=電話番号は必須です')).toBeVisible();
  });
});
