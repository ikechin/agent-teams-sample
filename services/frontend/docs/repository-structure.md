# Frontend リポジトリ構造

## 概要

本ドキュメントは、Frontendサービスのディレクトリ構造とファイル配置規則を定義します。

**参照ドキュメント:**
- [Frontend CLAUDE.md](../CLAUDE.md)
- [functional-design.md](functional-design.md)

---

## ディレクトリ構造（全体）

```
services/frontend/
├── CLAUDE.md                           # Frontend開発ルール
├── docs/                               # ドキュメント
│   ├── functional-design.md
│   ├── repository-structure.md         # このファイル
│   └── development-guidelines.md
├── .steering/                          # Frontend固有のステアリング
│
├── src/                                # ソースコード
│   ├── app/                            # Next.js App Router
│   │   ├── layout.tsx                  # ルートレイアウト
│   │   ├── page.tsx                    # トップページ（→ /dashboard へリダイレクト）
│   │   ├── globals.css                 # グローバルCSS
│   │   │
│   │   ├── (auth)/                     # 認証レイアウトグループ
│   │   │   ├── layout.tsx              # 認証専用レイアウト
│   │   │   └── login/
│   │   │       └── page.tsx            # ログイン画面
│   │   │
│   │   └── (dashboard)/                # ダッシュボードレイアウトグループ
│   │       ├── layout.tsx              # ダッシュボード共通レイアウト
│   │       ├── page.tsx                # ダッシュボードホーム
│   │       │
│   │       ├── merchants/              # 加盟店管理
│   │       │   ├── page.tsx            # 加盟店一覧
│   │       │   ├── new/
│   │       │   │   └── page.tsx        # 加盟店新規登録
│   │       │   └── [id]/
│   │       │       ├── page.tsx        # 加盟店詳細
│   │       │       └── edit/
│   │       │           └── page.tsx    # 加盟店編集
│   │       │
│   │       ├── contracts/              # 契約管理
│   │       │   ├── page.tsx            # 契約一覧
│   │       │   ├── new/
│   │       │   │   └── page.tsx        # 契約新規登録
│   │       │   └── [id]/
│   │       │       ├── page.tsx        # 契約詳細
│   │       │       ├── edit/
│   │       │       │   └── page.tsx    # 契約編集
│   │       │       └── history/
│   │       │           └── page.tsx    # 契約変更履歴
│   │       │
│   │       ├── services/               # サービス管理
│   │       │   ├── page.tsx            # サービス一覧
│   │       │   ├── new/
│   │       │   │   └── page.tsx        # サービス新規登録
│   │       │   └── [id]/
│   │       │       ├── page.tsx        # サービス詳細
│   │       │       └── edit/
│   │       │           └── page.tsx    # サービス編集
│   │       │
│   │       └── reports/                # レポート
│   │           └── page.tsx            # レポートダッシュボード
│   │
│   ├── components/                     # UIコンポーネント
│   │   ├── ui/                         # shadcn/uiコンポーネント
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── pagination.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── popover.tsx
│   │   │   └── skeleton.tsx
│   │   │
│   │   ├── layouts/                    # レイアウトコンポーネント
│   │   │   ├── DashboardLayout.tsx     # ダッシュボードレイアウト
│   │   │   ├── Sidebar.tsx             # サイドバー
│   │   │   ├── Header.tsx              # ヘッダー
│   │   │   └── Footer.tsx              # フッター
│   │   │
│   │   ├── auth/                       # 認証関連
│   │   │   ├── LoginForm.tsx           # ログインフォーム
│   │   │   └── AuthGuard.tsx           # 認証ガード
│   │   │
│   │   ├── merchants/                  # 加盟店関連
│   │   │   ├── MerchantList.tsx        # 加盟店一覧
│   │   │   ├── MerchantTable.tsx       # 加盟店テーブル
│   │   │   ├── MerchantCard.tsx        # 加盟店カード
│   │   │   ├── MerchantDetail.tsx      # 加盟店詳細
│   │   │   ├── MerchantForm.tsx        # 加盟店フォーム
│   │   │   ├── MerchantSearchBar.tsx   # 加盟店検索バー
│   │   │   └── MerchantFilters.tsx     # 加盟店フィルター
│   │   │
│   │   ├── contracts/                  # 契約関連
│   │   │   ├── ContractList.tsx        # 契約一覧
│   │   │   ├── ContractTable.tsx       # 契約テーブル
│   │   │   ├── ContractCard.tsx        # 契約カード
│   │   │   ├── ContractDetail.tsx      # 契約詳細
│   │   │   ├── ContractForm.tsx        # 契約フォーム
│   │   │   ├── ContractSearchBar.tsx   # 契約検索バー
│   │   │   ├── ContractFilters.tsx     # 契約フィルター
│   │   │   ├── ContractHistory.tsx     # 契約変更履歴
│   │   │   ├── ContractHistoryItem.tsx # 契約変更履歴アイテム
│   │   │   └── ContractListByMerchant.tsx # 加盟店別契約一覧
│   │   │
│   │   ├── services/                   # サービス関連
│   │   │   ├── ServiceList.tsx         # サービス一覧
│   │   │   ├── ServiceTable.tsx        # サービステーブル
│   │   │   ├── ServiceCard.tsx         # サービスカード
│   │   │   ├── ServiceDetail.tsx       # サービス詳細
│   │   │   └── ServiceForm.tsx         # サービスフォーム
│   │   │
│   │   ├── reports/                    # レポート関連
│   │   │   ├── ReportDashboard.tsx     # レポートダッシュボード
│   │   │   ├── ContractSummaryCard.tsx # 契約サマリーカード
│   │   │   ├── ServiceContractChart.tsx # サービス別契約グラフ
│   │   │   └── MonthlyTrendChart.tsx   # 月次推移グラフ
│   │   │
│   │   ├── dashboard/                  # ダッシュボード関連
│   │   │   ├── ContractSummary.tsx     # 契約サマリー
│   │   │   └── RecentContracts.tsx     # 最近の契約
│   │   │
│   │   └── common/                     # 共通コンポーネント
│   │       ├── DataTable.tsx           # 汎用データテーブル
│   │       ├── Pagination.tsx          # ページネーション
│   │       ├── SearchBar.tsx           # 検索バー
│   │       ├── StatusBadge.tsx         # ステータスバッジ
│   │       ├── LoadingSpinner.tsx      # ローディングスピナー
│   │       ├── ErrorBoundary.tsx       # エラー境界
│   │       ├── ConfirmDialog.tsx       # 確認ダイアログ
│   │       └── DatePicker.tsx          # 日付ピッカー
│   │
│   ├── lib/                            # ユーティリティ・設定
│   │   ├── api/                        # APIクライアント
│   │   │   ├── client.ts               # 共通APIクライアント
│   │   │   ├── merchants.ts            # 加盟店API
│   │   │   ├── contracts.ts            # 契約API
│   │   │   ├── services.ts             # サービスAPI
│   │   │   ├── reports.ts              # レポートAPI
│   │   │   └── auth.ts                 # 認証API
│   │   │
│   │   ├── validations/                # バリデーションスキーマ
│   │   │   ├── auth.ts                 # 認証バリデーション
│   │   │   ├── merchant.ts             # 加盟店バリデーション
│   │   │   ├── contract.ts             # 契約バリデーション
│   │   │   └── service.ts              # サービスバリデーション
│   │   │
│   │   ├── utils.ts                    # 汎用ユーティリティ
│   │   ├── cn.ts                       # クラス名マージ（tailwind-merge）
│   │   ├── format-date.ts              # 日付フォーマット
│   │   ├── format-currency.ts          # 金額フォーマット
│   │   └── constants.ts                # 定数定義
│   │
│   ├── hooks/                          # カスタムフック
│   │   ├── use-merchants.ts            # 加盟店データフック
│   │   ├── use-contracts.ts            # 契約データフック
│   │   ├── use-services.ts             # サービスデータフック
│   │   ├── use-auth.ts                 # 認証フック
│   │   ├── use-pagination.ts           # ページネーションフック
│   │   └── use-debounce.ts             # デバウンスフック
│   │
│   ├── stores/                         # Zustandストア
│   │   ├── auth-store.ts               # 認証ストア
│   │   ├── ui-store.ts                 # UI状態ストア
│   │   └── filter-store.ts             # フィルター状態ストア
│   │
│   ├── types/                          # TypeScript型定義
│   │   ├── api.ts                      # BFF APIの型（openapi-typescriptで自動生成）
│   │   ├── merchant.ts                 # 加盟店型
│   │   ├── contract.ts                 # 契約型
│   │   ├── service.ts                  # サービス型
│   │   └── common.ts                   # 共通型
│   │
│   └── styles/                         # スタイル
│       └── globals.css                 # グローバルCSS（Tailwind設定含む）
│
├── public/                             # 静的ファイル
│   ├── favicon.ico
│   ├── logo.png
│   └── images/
│
├── tests/                              # テストファイル
│   ├── unit/                           # ユニットテスト
│   │   ├── components/
│   │   │   ├── merchants/
│   │   │   │   └── MerchantCard.test.tsx
│   │   │   └── contracts/
│   │   │       └── ContractCard.test.tsx
│   │   ├── hooks/
│   │   │   └── use-pagination.test.ts
│   │   └── lib/
│   │       └── format-date.test.ts
│   │
│   ├── integration/                    # 統合テスト
│   │   └── api/
│   │       └── merchants.test.ts
│   │
│   └── e2e/                            # E2Eテスト
│       ├── merchant-flow.spec.ts
│       ├── contract-flow.spec.ts
│       └── login-flow.spec.ts
│
├── .env.local                          # 環境変数（ローカル）
├── .env.example                        # 環境変数サンプル
├── .eslintrc.json                      # ESLint設定
├── .prettierrc                         # Prettier設定
├── .gitignore
├── package.json                        # 依存関係
├── tsconfig.json                       # TypeScript設定
├── tailwind.config.ts                  # Tailwind CSS設定
├── next.config.js                      # Next.js設定
├── vitest.config.ts                    # Vitest設定
├── playwright.config.ts                # Playwright設定
├── components.json                     # shadcn/ui設定
└── README.md                           # Frontendサービスの説明
```

---

## ディレクトリ詳細

### 1. `src/app/` - Next.js App Router

**役割:** ページルーティング、レイアウト定義

**特徴:**
- ファイルシステムベースのルーティング
- Server ComponentsとClient Componentsの使い分け
- Route Groupsによるレイアウト分離

**命名規則:**
- ページファイル: `page.tsx`
- レイアウトファイル: `layout.tsx`
- ローディング: `loading.tsx`
- エラー: `error.tsx`
- Route Groups: `(groupName)/`

**例:**
```
app/
├── (auth)/                  # 認証専用レイアウト
│   └── login/
│       └── page.tsx
└── (dashboard)/             # ダッシュボードレイアウト
    ├── layout.tsx
    └── merchants/
        ├── page.tsx         # /dashboard/merchants
        ├── new/
        │   └── page.tsx     # /dashboard/merchants/new
        └── [id]/
            ├── page.tsx     # /dashboard/merchants/:id
            └── edit/
                └── page.tsx # /dashboard/merchants/:id/edit
```

---

### 2. `src/components/` - UIコンポーネント

**役割:** 再利用可能なUIコンポーネント

**分類:**

#### 2.1 `components/ui/` - shadcn/uiコンポーネント
- shadcn/uiで生成された基本コンポーネント
- **直接編集可能**（プロジェクト固有のカスタマイズ）
- 例: Button, Card, Form, Input, Table

#### 2.2 `components/layouts/` - レイアウトコンポーネント
- ページ全体のレイアウト構造
- Sidebar, Header, Footer等

#### 2.3 ドメイン別コンポーネント
- `components/merchants/` - 加盟店関連
- `components/contracts/` - 契約関連
- `components/services/` - サービス関連
- `components/reports/` - レポート関連

#### 2.4 `components/common/` - 共通コンポーネント
- プロジェクト固有の汎用コンポーネント
- DataTable, Pagination, ErrorBoundary等

**命名規則:**
- コンポーネントファイル: `PascalCase.tsx`
- 例: `MerchantCard.tsx`, `ContractForm.tsx`

**コンポーネントの配置基準:**

| 分類 | 配置先 | 例 |
|------|--------|-----|
| shadcn/ui基本 | `components/ui/` | Button, Card, Input |
| レイアウト | `components/layouts/` | Sidebar, Header |
| ドメイン固有 | `components/{domain}/` | MerchantCard, ContractForm |
| ドメイン横断 | `components/common/` | DataTable, Pagination |

---

### 3. `src/lib/` - ユーティリティ・設定

**役割:** ビジネスロジック、ユーティリティ関数、設定

#### 3.1 `lib/api/` - APIクライアント

**構成:**
```
lib/api/
├── client.ts           # 共通APIクライアント（fetch wrapper）
├── merchants.ts        # 加盟店API
├── contracts.ts        # 契約API
├── services.ts         # サービスAPI
└── auth.ts             # 認証API
```

**実装パターン:**
```typescript
// lib/api/merchants.ts
import { apiClient } from './client';
import type { paths } from '@/types/api';

type MerchantListResponse = paths['/api/v1/merchants']['get']['responses']['200']['content']['application/json'];

export const merchantsApi = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<MerchantListResponse>('/api/v1/merchants', { params }),

  getById: (id: string) =>
    apiClient.get(`/api/v1/merchants/${id}`),

  create: (data: CreateMerchantRequest) =>
    apiClient.post('/api/v1/merchants', data),
};
```

#### 3.2 `lib/validations/` - バリデーションスキーマ

**構成:**
```
lib/validations/
├── auth.ts             # 認証
├── merchant.ts         # 加盟店
├── contract.ts         # 契約
└── service.ts          # サービス
```

**実装パターン:**
```typescript
// lib/validations/merchant.ts
import { z } from 'zod';

export const merchantSchema = z.object({
  merchant_code: z.string().min(1, '加盟店コードは必須です'),
  name: z.string().min(1, '店舗名は必須です'),
  address: z.string().min(1, '住所は必須です'),
  contact_person: z.string().min(1, '担当者名は必須です'),
  contact_phone: z.string().regex(/^\d{2,4}-\d{2,4}-\d{4}$/, '電話番号の形式が正しくありません'),
  contact_email: z.string().email('メールアドレスの形式が正しくありません'),
});

export type MerchantFormData = z.infer<typeof merchantSchema>;
```

#### 3.3 ユーティリティファイル

**構成:**
```
lib/
├── utils.ts            # 汎用ユーティリティ
├── cn.ts               # クラス名マージ（tailwind-merge）
├── format-date.ts      # 日付フォーマット
├── format-currency.ts  # 金額フォーマット
└── constants.ts        # 定数定義
```

**実装例:**
```typescript
// lib/format-date.ts
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

export function formatDate(date: string | Date, pattern: string = 'yyyy年MM月dd日'): string {
  return format(new Date(date), pattern, { locale: ja });
}

// lib/format-currency.ts
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
  }).format(amount);
}

// lib/constants.ts
export const CONTRACT_STATUS = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  TERMINATED: 'TERMINATED',
} as const;

export const CONTRACT_STATUS_LABELS: Record<string, string> = {
  DRAFT: '下書き',
  ACTIVE: '有効',
  SUSPENDED: '一時停止',
  TERMINATED: '解約済み',
};
```

---

### 4. `src/hooks/` - カスタムフック

**役割:** ロジックの再利用、データフェッチング

**命名規則:**
- ファイル名: `use-{hookName}.ts`
- 関数名: `use{HookName}`

**実装例:**
```typescript
// hooks/use-merchants.ts
import { useState, useEffect } from 'react';
import { merchantsApi } from '@/lib/api/merchants';

export function useMerchants(params?: { page?: number; limit?: number }) {
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    merchantsApi
      .list(params)
      .then((data) => setMerchants(data.merchants))
      .catch((err) => setError(err))
      .finally(() => setLoading(false));
  }, [params]);

  return { merchants, loading, error };
}

// hooks/use-pagination.ts
export function usePagination(totalItems: number, itemsPerPage: number = 20) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  const nextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const goToPage = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  return {
    currentPage,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
  };
}
```

---

### 5. `src/stores/` - Zustandストア

**役割:** グローバル状態管理

**実装例:**
```typescript
// stores/auth-store.ts
import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));

// stores/ui-store.ts
interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
```

---

### 6. `src/types/` - TypeScript型定義

**役割:** 型定義の一元管理

**構成:**
```
types/
├── api.ts              # BFF APIの型（自動生成）
├── merchant.ts         # 加盟店型
├── contract.ts         # 契約型
├── service.ts          # サービス型
└── common.ts           # 共通型
```

**実装例:**
```typescript
// types/api.ts（自動生成）
// npx openapi-typescript ../../contracts/openapi/bff-api.yaml --output src/types/api.ts

// types/merchant.ts
export interface Merchant {
  id: string;
  merchant_code: string;
  name: string;
  address: string;
  contact_person: string;
  contact_email: string;
  contact_phone: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// types/common.ts
export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total_count: number;
    page: number;
    limit: number;
    total_pages: number;
  };
}
```

---

### 7. `tests/` - テストファイル

**役割:** テストコードの配置

**構成:**
```
tests/
├── unit/               # ユニットテスト
├── integration/        # 統合テスト
└── e2e/                # E2Eテスト
```

**命名規則:**
- ユニットテスト: `{FileName}.test.tsx` または `{FileName}.test.ts`
- E2Eテスト: `{flow-name}.spec.ts`

**配置例:**
```
tests/
├── unit/
│   ├── components/
│   │   └── merchants/
│   │       └── MerchantCard.test.tsx
│   └── lib/
│       └── format-date.test.ts
└── e2e/
    ├── merchant-flow.spec.ts
    └── contract-flow.spec.ts
```

---

## 設定ファイル

### package.json

```json
{
  "name": "frontend",
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test",
    "generate:api-types": "openapi-typescript ../../contracts/openapi/bff-api.yaml --output src/types/api.ts"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",
    "@hookform/resolvers": "^3.3.0",
    "date-fns": "^3.0.0",
    "class-variance-authority": "^0.7.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.300.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "typescript": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.0.0",
    "playwright": "^1.40.0",
    "openapi-typescript": "^6.7.0"
  }
}
```

### tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "incremental": true,
    "paths": {
      "@/*": ["./src/*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### tailwind.config.ts

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000',
  },
  // 本番環境での最適化
  output: 'standalone',
  // 画像最適化
  images: {
    domains: [],
  },
};

module.exports = nextConfig;
```

### .env.example

```bash
# BFF API URL
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000

# アプリケーション設定
NEXT_PUBLIC_APP_NAME=契約管理システム
```

---

## ファイル命名規則まとめ

| ファイルタイプ | 命名規則 | 例 |
|---------------|---------|-----|
| コンポーネント | PascalCase.tsx | `MerchantCard.tsx` |
| ページ | page.tsx | `app/merchants/page.tsx` |
| レイアウト | layout.tsx | `app/(dashboard)/layout.tsx` |
| ユーティリティ | kebab-case.ts | `format-date.ts` |
| フック | use-kebab-case.ts | `use-merchants.ts` |
| API | kebab-case.ts | `merchants.ts` |
| ストア | kebab-case-store.ts | `auth-store.ts` |
| 型定義 | kebab-case.ts | `merchant.ts` |
| テスト | {FileName}.test.tsx | `MerchantCard.test.tsx` |
| E2Eテスト | {flow-name}.spec.ts | `merchant-flow.spec.ts` |

---

## インポートパスのエイリアス

**設定:** `tsconfig.json`の`paths`で`@/*`を`./src/*`にマッピング

**使用例:**
```typescript
// ❌ 相対パス（階層が深いと複雑）
import { Button } from '../../../components/ui/button';

// ✅ エイリアス（推奨）
import { Button } from '@/components/ui/button';
import { merchantsApi } from '@/lib/api/merchants';
import { useAuthStore } from '@/stores/auth-store';
```

---

## 関連ドキュメント

- [Frontend CLAUDE.md](../CLAUDE.md) - 開発ルール
- [functional-design.md](functional-design.md) - 機能設計
- [development-guidelines.md](development-guidelines.md) - 開発ガイドライン

---

**最終更新日:** 2026-04-05
**作成者:** Claude Code
