# Frontend Service - CLAUDE.md

## 概要

このドキュメントは、加盟店契約管理システムのFrontendサービスにおける開発ルールを定義します。

**重要:** このCLAUDE.mdは、ルートの[CLAUDE.md](../../CLAUDE.md)を継承します。
ルートで定義された規則に加えて、Frontend固有の規則を定義します。

---

## 技術スタック

### コア技術

- **言語**: TypeScript 5.x
- **フレームワーク**: Next.js 14 (App Router)
- **UIライブラリ**: React 18
- **スタイリング**: Tailwind CSS 3.x
- **コンポーネントライブラリ**: shadcn/ui
- **パッケージマネージャー**: npm

### 主要ライブラリ

**UI/UX:**
- `shadcn/ui` - 再利用可能なコンポーネント
- `tailwindcss` - ユーティリティファーストCSS
- `class-variance-authority (cva)` - バリアント管理
- `tailwind-merge` - クラス名の競合解決
- `lucide-react` - アイコンライブラリ

**状態管理:**
- `zustand` - グローバル状態管理（軽量）
- React Server Components - サーバーサイド状態

**フォーム:**
- `react-hook-form` - フォーム管理
- `zod` - バリデーションスキーマ
- `@hookform/resolvers` - zodとの統合

**データフェッチング:**
- `fetch API` (Next.js拡張版) - サーバーコンポーネント
- `swr` または `@tanstack/react-query` - クライアントサイドキャッシング

**日付処理:**
- `date-fns` - 日付フォーマット・計算

**型生成:**
- `openapi-typescript` - BFF APIの型を自動生成

**テスト:**
- `vitest` - ユニットテスト
- `@testing-library/react` - コンポーネントテスト
- `@testing-library/user-event` - ユーザーインタラクションテスト
- `playwright` - E2Eテスト

**リント・フォーマット:**
- `eslint` - リンター
- `prettier` - フォーマッター
- `typescript-eslint` - TypeScript用ESLint

---

## プロジェクト構造

```
services/frontend/
├── CLAUDE.md                    # このファイル
├── docs/                        # Frontend設計ドキュメント
│   ├── functional-design.md
│   ├── repository-structure.md
│   └── development-guidelines.md
├── .steering/                   # Frontend固有のステアリング
├── src/
│   ├── app/                     # App Router（ページ・レイアウト）
│   │   ├── (auth)/              # 認証グループ
│   │   │   └── login/
│   │   ├── (dashboard)/         # ダッシュボードグループ
│   │   │   ├── merchants/
│   │   │   ├── contracts/
│   │   │   └── services/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/              # UIコンポーネント
│   │   ├── ui/                  # shadcn/uiコンポーネント
│   │   ├── merchants/           # 加盟店関連コンポーネント
│   │   ├── contracts/           # 契約関連コンポーネント
│   │   └── layouts/             # レイアウトコンポーネント
│   ├── lib/                     # ユーティリティ・設定
│   │   ├── api/                 # API クライアント
│   │   ├── utils.ts             # 汎用ユーティリティ
│   │   ├── cn.ts                # クラス名マージ
│   │   └── validations/         # Zodスキーマ
│   ├── hooks/                   # カスタムフック
│   ├── stores/                  # Zustand ストア
│   ├── types/                   # TypeScript型定義
│   │   └── api.ts               # BFF APIの型（自動生成）
│   └── styles/
│       └── globals.css
├── public/                      # 静的ファイル
├── tests/                       # テストファイル
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.js
├── .eslintrc.json
└── .prettierrc
```

---

## 開発原則

### 1. ルートCLAUDE.mdの規則を継承

以下のルート規則を厳守します：

- **用語**: [docs/glossary.md](../../docs/glossary.md)に従う
- **セキュリティ**: [docs/security-guidelines.md](../../docs/security-guidelines.md)に従う
- **API契約**: [contracts/openapi/bff-api.yaml](../../contracts/openapi/bff-api.yaml)を参照

### 2. Next.js App Routerのベストプラクティス

**サーバーコンポーネント優先:**
- デフォルトはServer Components
- クライアント操作が必要な場合のみ `'use client'`

**データフェッチング:**
```typescript
// ✅ Server Component（推奨）
async function MerchantsPage() {
  const merchants = await fetchMerchants(); // キャッシュ可能
  return <MerchantList merchants={merchants} />;
}

// ❌ クライアントサイドフェッチは最小限に
```

**並列データフェッチング:**
```typescript
// ✅ 並列実行
const [merchants, services] = await Promise.all([
  fetchMerchants(),
  fetchServices(),
]);
```

### 3. shadcn/uiの使用規則

**コンポーネントの追加:**
```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add form
npx shadcn-ui@latest add table
```

**カスタマイズ:**
- `components/ui/`内のコンポーネントは直接編集可能
- プロジェクト固有のバリアントを追加

**例:**
```typescript
// components/ui/button.tsx（shadcnが生成）
import { cva } from "class-variance-authority";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground",
        destructive: "bg-destructive text-destructive-foreground",
        // プロジェクト固有バリアント追加可能
      },
    },
  }
);
```

### 4. TypeScript型安全性

**API型の自動生成:**
```bash
# BFF APIのOpenAPI仕様から型を生成
npx openapi-typescript ../../contracts/openapi/bff-api.yaml --output src/types/api.ts
```

**使用例:**
```typescript
import type { paths } from '@/types/api';

type ContractListResponse = paths['/api/v1/contracts']['get']['responses']['200']['content']['application/json'];

async function fetchContracts(): Promise<ContractListResponse> {
  const res = await fetch('/api/v1/contracts');
  return res.json();
}
```

### 5. フォームバリデーション

**Zod + React Hook Formパターン:**
```typescript
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// バリデーションスキーマ
const loginSchema = z.object({
  email: z.string().email('メールアドレスの形式が正しくありません'),
  password: z.string().min(8, 'パスワードは8文字以上必要です'),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    // API呼び出し
  };

  return <form onSubmit={form.handleSubmit(onSubmit)}>...</form>;
}
```

### 6. セキュリティ実装

**CSRF対策（Double Submit Cookie）:**
```typescript
// lib/api/client.ts
async function apiPost(url: string, data: any) {
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('csrf_token='))
    ?.split('=')[1];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || '',
    },
    credentials: 'include', // Cookieを送信
    body: JSON.stringify(data),
  });

  return response;
}
```

**XSS対策:**
- React自動エスケープに依存
- `dangerouslySetInnerHTML`は使用禁止（特別な理由がある場合のみ承認後使用）

### 7. アクセシビリティ

**基本原則:**
- セマンティックHTML使用
- キーボード操作対応
- ARIA属性の適切な使用
- shadcn/uiは標準でアクセシブル

**例:**
```typescript
<Button aria-label="契約を削除">
  <TrashIcon />
</Button>
```

---

## コーディング規約

### 命名規則

**ファイル名:**
- コンポーネント: `PascalCase.tsx` (例: `MerchantList.tsx`)
- ユーティリティ: `kebab-case.ts` (例: `format-date.ts`)
- フック: `use-kebab-case.ts` (例: `use-merchants.ts`)

**変数・関数:**
- `camelCase` (例: `fetchContracts`, `merchantList`)

**コンポーネント:**
- `PascalCase` (例: `MerchantCard`, `ContractTable`)

**定数:**
- `UPPER_SNAKE_CASE` (例: `API_BASE_URL`)

### コンポーネント設計

**単一責任の原則:**
```typescript
// ✅ Good
function MerchantCard({ merchant }: { merchant: Merchant }) {
  return (
    <Card>
      <CardHeader>{merchant.name}</CardHeader>
      <CardContent>{merchant.address}</CardContent>
    </Card>
  );
}

// ❌ Bad - 複数の責任
function MerchantCardWithFetchAndEdit({ id }: { id: string }) {
  const [merchant, setMerchant] = useState();
  const [isEditing, setIsEditing] = useState(false);
  // ... 複雑なロジック
}
```

**Props型定義:**
```typescript
// ✅ 明示的な型定義
interface MerchantCardProps {
  merchant: Merchant;
  onEdit?: (id: string) => void;
  variant?: 'default' | 'compact';
}

function MerchantCard({ merchant, onEdit, variant = 'default' }: MerchantCardProps) {
  // ...
}
```

---

## テスト戦略

### 単体テスト（Vitest）

**コンポーネントテスト:**
```typescript
import { render, screen } from '@testing-library/react';
import { MerchantCard } from './MerchantCard';

describe('MerchantCard', () => {
  it('加盟店名を表示する', () => {
    const merchant = { id: '1', name: 'テスト加盟店', ... };
    render(<MerchantCard merchant={merchant} />);
    expect(screen.getByText('テスト加盟店')).toBeInTheDocument();
  });
});
```

### E2Eテスト（Playwright）

**クリティカルパステスト:**
```typescript
import { test, expect } from '@playwright/test';

test('ログインして契約一覧を表示', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('button[type="submit"]');

  await expect(page).toHaveURL('/dashboard/contracts');
  await expect(page.locator('h1')).toContainText('契約一覧');
});
```

---

## パフォーマンス最適化

### 画像最適化

```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="ロゴ"
  width={200}
  height={100}
  priority // LCP対象の場合
/>
```

### 動的インポート

```typescript
// 重いコンポーネントは遅延ロード
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(() => import('@/components/charts/HeavyChart'), {
  loading: () => <p>読み込み中...</p>,
  ssr: false,
});
```

---

## 環境変数

```bash
# .env.local
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_APP_NAME=契約管理システム
```

**使用例:**
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
```

---

## ビルド・デプロイ

### 開発環境

```bash
npm run dev        # 開発サーバー起動（http://localhost:3000）
npm run build      # プロダクションビルド
npm run start      # プロダクションサーバー起動
npm run lint       # ESLint実行
npm run type-check # TypeScript型チェック
npm test           # テスト実行
```

### プロダクション

**Docker:**
```dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

---

## Agent Teams使用時の注意

Frontend Agentとして作業する場合：

1. **API契約を厳守**
   - `contracts/openapi/bff-api.yaml`の仕様に従う
   - 型を自動生成して使用

2. **用語統一**
   - `docs/glossary.md`の用語を使用

3. **他Agentとの連携**
   - BFF AgentがAPI仕様を更新したら型を再生成
   - 不明点はルートの`.steering/`で確認

---

## 関連ドキュメント

- [ルートCLAUDE.md](../../CLAUDE.md) - 全体ルール
- [docs/product-requirements.md](../../docs/product-requirements.md) - プロダクト要求
- [docs/glossary.md](../../docs/glossary.md) - 用語集
- [docs/security-guidelines.md](../../docs/security-guidelines.md) - セキュリティガイドライン
- [contracts/openapi/bff-api.yaml](../../contracts/openapi/bff-api.yaml) - BFF API仕様
- [services/frontend/docs/functional-design.md](docs/functional-design.md) - Frontend機能設計
- [services/frontend/docs/repository-structure.md](docs/repository-structure.md) - リポジトリ構造詳細
- [services/frontend/docs/development-guidelines.md](docs/development-guidelines.md) - 開発ガイドライン詳細

---

**最終更新日:** 2026-04-05
**作成者:** Claude Code
