import { Page } from '@playwright/test';

/**
 * ログイン処理
 */
export async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.fill('[name="email"]', email);
  await page.fill('[name="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
}

/**
 * ログアウト処理
 */
export async function logout(page: Page) {
  await page.click('[aria-label="ユーザーメニュー"]');
  await page.click('text=ログアウト');
  await page.waitForURL('**/login');
}

/**
 * 加盟店データ型
 */
export interface MerchantData {
  merchant_code: string;
  name: string;
  address: string;
  contact_person: string;
  contact_phone: string;
  contact_email: string;
}

/**
 * 加盟店を作成
 */
export async function createMerchant(page: Page, data: MerchantData) {
  await page.goto('/dashboard/merchants/new');
  await page.fill('[name="merchant_code"]', data.merchant_code);
  await page.fill('[name="name"]', data.name);
  await page.fill('[name="address"]', data.address);
  await page.fill('[name="contact_person"]', data.contact_person);
  await page.fill('[name="contact_phone"]', data.contact_phone);
  await page.fill('[name="contact_email"]', data.contact_email);
  await page.click('button:has-text("保存")');
  await page.waitForURL('**/merchants');
}

/**
 * 契約データ型
 */
export interface ContractData {
  merchant_id: string;
  service_id: string;
  start_date: string;
  end_date?: string;
  initial_fee: number;
  monthly_fee: number;
  notes?: string;
}

/**
 * 契約を作成
 */
export async function createContract(page: Page, data: ContractData) {
  await page.goto('/dashboard/contracts/new');

  // 加盟店選択
  await page.click('[name="merchant_id"]');
  await page.click(`[data-value="${data.merchant_id}"]`);

  // サービス選択
  await page.click('[name="service_id"]');
  await page.click(`[data-value="${data.service_id}"]`);

  // 日付入力
  await page.fill('[name="start_date"]', data.start_date);
  if (data.end_date) {
    await page.fill('[name="end_date"]', data.end_date);
  }

  // 金額入力
  await page.fill('[name="initial_fee"]', data.initial_fee.toString());
  await page.fill('[name="monthly_fee"]', data.monthly_fee.toString());

  // 備考（オプション）
  if (data.notes) {
    await page.fill('[name="notes"]', data.notes);
  }

  await page.click('button:has-text("保存")');
  await page.waitForURL('**/contracts');
}

/**
 * テーブルの行数を取得
 */
export async function getTableRowCount(page: Page, tableSelector: string = 'table tbody tr') {
  return await page.locator(tableSelector).count();
}

/**
 * トースト通知を待つ
 */
export async function waitForToast(page: Page, message: string) {
  await page.waitForSelector(`text=${message}`, { timeout: 5000 });
}
