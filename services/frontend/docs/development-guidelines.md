# Frontend 開発ガイドライン

## 概要

本ドキュメントは、Frontendサービスの開発ガイドライン・ベストプラクティスを定義します。

**参照ドキュメント:**
- [Frontend CLAUDE.md](../CLAUDE.md)
- [functional-design.md](functional-design.md)
- [repository-structure.md](repository-structure.md)
- [docs/security-guidelines.md](../../../docs/security-guidelines.md)

---

## 開発フロー

### 1. 開発環境のセットアップ

```bash
# リポジトリのクローン
git clone <repository-url>
cd services/frontend

# 依存関係のインストール
npm install

# shadcn/uiの初期化
npx shadcn-ui@latest init

# 環境変数の設定
cp .env.example .env.local
# .env.localを編集

# 開発サーバーの起動
npm run dev
```

### 2. 新機能開発の手順

**Step 1: ブランチ作成**
```bash
git checkout -b feature/merchant-list
```

**Step 2: BFF APIの型生成**
```bash
# OpenAPI仕様からTypeScript型を生成
npm run generate:api-types
```

**Step 3: コンポーネント開発**
1. Server Componentから始める（可能な限り）
2. Client Componentは必要な部分のみ
3. shadcn/uiコンポーネントを活用

**Step 4: テスト作成**
```bash
# ユニットテスト
npm run test

# E2Eテスト
npm run test:e2e
```

**Step 5: リント・型チェック**
```bash
npm run lint
npm run type-check
```

**Step 6: コミット**
```bash
git add .
git commit -m "feat: 加盟店一覧画面を実装"
```

---

## コーディング規約

### TypeScript

#### 型定義

**✅ Good:**
```typescript
// 明示的な型定義
interface MerchantCardProps {
  merchant: Merchant;
  onEdit?: (id: string) => void;
  className?: string;
}

function MerchantCard({ merchant, onEdit, className }: MerchantCardProps) {
  // ...
}

// 型推論が明確な場合は省略可
const totalAmount = merchants.reduce((sum, m) => sum + m.amount, 0);
```

**❌ Bad:**
```typescript
// any型の使用
function processMerchant(data: any) {
  // ...
}

// 型定義なし
function MerchantCard({ merchant, onEdit }) {
  // ...
}
```

#### 非同期処理

**✅ Good:**
```typescript
// async/await
async function fetchMerchants(): Promise<Merchant[]> {
  try {
    const response = await merchantsApi.list();
    return response.merchants;
  } catch (error) {
    console.error('加盟店取得エラー:', error);
    throw error;
  }
}
```

**❌ Bad:**
```typescript
// Promise chain（複雑になりがち）
function fetchMerchants() {
  return merchantsApi.list()
    .then(response => response.merchants)
    .catch(error => {
      console.error(error);
      throw error;
    });
}
```

#### Optional Chaining & Nullish Coalescing

**✅ Good:**
```typescript
// Optional Chaining
const merchantName = merchant?.name ?? '不明';

// Nullish Coalescing
const limit = params.limit ?? 20;
```

**❌ Bad:**
```typescript
// 冗長なチェック
const merchantName = merchant && merchant.name ? merchant.name : '不明';

// || の誤用（0やfalseも置き換わってしまう）
const limit = params.limit || 20;
```

---

### React

#### Server Components vs Client Components

**Server Components（デフォルト）:**
```typescript
// app/(dashboard)/merchants/page.tsx
// 'use client' なし → Server Component
async function MerchantsPage() {
  // サーバーで直接データフェッチ
  const merchants = await fetchMerchants();

  return (
    <div>
      <h1>加盟店一覧</h1>
      <MerchantList merchants={merchants} />
    </div>
  );
}
```

**Client Components（必要な場合のみ）:**
```typescript
// components/merchants/MerchantSearchBar.tsx
'use client';

import { useState } from 'react';

export function MerchantSearchBar({ onSearch }: Props) {
  const [query, setQuery] = useState('');

  // インタラクティブな機能が必要
  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

**使い分けの基準:**

| 条件 | Component Type |
|------|----------------|
| データフェッチのみ | Server Component |
| 静的表示のみ | Server Component |
| useState/useEffectが必要 | Client Component |
| イベントハンドラが必要 | Client Component |
| ブラウザAPIが必要 | Client Component |

#### フック使用のルール

**✅ Good:**
```typescript
function MerchantList() {
  // フックはコンポーネントのトップレベルで呼ぶ
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    loadMerchants();
  }, []);

  return <div>...</div>;
}
```

**❌ Bad:**
```typescript
function MerchantList() {
  if (someCondition) {
    // 条件付きでフックを呼ぶのはNG
    const [merchants, setMerchants] = useState<Merchant[]>([]);
  }

  // ループ内でフックを呼ぶのもNG
  merchants.forEach(() => {
    const value = useMemo(() => calculate(), []);
  });
}
```

#### Props の命名

**✅ Good:**
```typescript
interface MerchantCardProps {
  merchant: Merchant;
  onEdit?: (id: string) => void;  // イベントハンドラは on〜
  onDelete?: (id: string) => void;
  isLoading?: boolean;             // 真偽値は is〜/has〜
  showActions?: boolean;
}
```

**❌ Bad:**
```typescript
interface MerchantCardProps {
  merchant: Merchant;
  editHandler?: (id: string) => void;  // NG
  loading?: boolean;                    // NG: isLoadingの方が明確
  actions?: boolean;                    // NG: showActionsの方が明確
}
```

#### コンポーネントの分割

**✅ Good - 単一責任:**
```typescript
// MerchantCard.tsx - カード表示のみ
export function MerchantCard({ merchant }: Props) {
  return (
    <Card>
      <CardHeader>{merchant.name}</CardHeader>
      <CardContent>{merchant.address}</CardContent>
    </Card>
  );
}

// MerchantList.tsx - 一覧表示
export function MerchantList({ merchants }: Props) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {merchants.map(m => (
        <MerchantCard key={m.id} merchant={m} />
      ))}
    </div>
  );
}

// app/merchants/page.tsx - データフェッチとページ構成
async function MerchantsPage() {
  const merchants = await fetchMerchants();
  return <MerchantList merchants={merchants} />;
}
```

**❌ Bad - 責任が多すぎる:**
```typescript
// MerchantCardWithEverything.tsx
export function MerchantCardWithEverything({ id }: Props) {
  // データフェッチ
  const [merchant, setMerchant] = useState();
  useEffect(() => { /* fetch */ }, []);

  // 編集状態
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState();

  // 削除処理
  const handleDelete = () => { /* ... */ };

  // 100行以上のコード...
  return <div>...</div>;
}
```

---

### CSS / Tailwind CSS

#### クラス名の記述

**✅ Good:**
```typescript
import { cn } from '@/lib/utils';

export function MerchantCard({ merchant, className }: Props) {
  return (
    <Card className={cn(
      'p-4 hover:shadow-lg transition-shadow',
      merchant.is_active ? 'border-green-500' : 'border-gray-300',
      className
    )}>
      {/* ... */}
    </Card>
  );
}
```

**❌ Bad:**
```typescript
// 文字列連結（競合の可能性）
<Card className={`p-4 hover:shadow-lg ${merchant.is_active ? 'border-green-500' : 'border-gray-300'} ${className}`}>
```

#### レスポンシブデザイン

**✅ Good:**
```typescript
<div className="
  grid
  grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4
  gap-4
  p-4 sm:p-6 md:p-8
">
  {/* ... */}
</div>
```

**Tailwindブレークポイント:**
- `sm`: 640px以上
- `md`: 768px以上
- `lg`: 1024px以上
- `xl`: 1280px以上
- `2xl`: 1536px以上

#### カスタムスタイル

**✅ Good - Tailwind設定で拡張:**
```typescript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        brand: {
          primary: '#0066cc',
          secondary: '#00cc66',
        },
      },
    },
  },
};

// 使用
<Button className="bg-brand-primary">保存</Button>
```

**❌ Bad - インラインスタイル:**
```typescript
// 避けるべき（Tailwindの利点を失う）
<Button style={{ backgroundColor: '#0066cc' }}>保存</Button>
```

---

## データフェッチング

### Server Componentsでのフェッチ

**✅ Good:**
```typescript
// app/(dashboard)/merchants/page.tsx
async function MerchantsPage() {
  // サーバーで実行されるため、直接APIを呼べる
  const merchants = await fetchMerchantsFromBFF();

  return <MerchantList merchants={merchants} />;
}

// 並列フェッチ
async function DashboardPage() {
  const [merchants, contracts, services] = await Promise.all([
    fetchMerchants(),
    fetchContracts(),
    fetchServices(),
  ]);

  return (
    <div>
      <MerchantSummary merchants={merchants} />
      <ContractSummary contracts={contracts} />
      <ServiceSummary services={services} />
    </div>
  );
}
```

### Client Componentsでのフェッチ

**✅ Good - SWR使用:**
```typescript
'use client';

import useSWR from 'swr';
import { merchantsApi } from '@/lib/api/merchants';

export function MerchantList() {
  const { data, error, isLoading } = useSWR(
    '/api/v1/merchants',
    () => merchantsApi.list()
  );

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      {data.merchants.map(m => (
        <MerchantCard key={m.id} merchant={m} />
      ))}
    </div>
  );
}
```

**✅ Good - React Query使用:**
```typescript
'use client';

import { useQuery } from '@tanstack/react-query';

export function MerchantList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['merchants'],
    queryFn: () => merchantsApi.list(),
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{/* ... */}</div>;
}
```

---

## フォーム処理

### React Hook Form + Zod

**✅ Good:**
```typescript
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { merchantSchema, type MerchantFormData } from '@/lib/validations/merchant';

export function MerchantForm({ onSubmit }: Props) {
  const form = useForm<MerchantFormData>({
    resolver: zodResolver(merchantSchema),
    defaultValues: {
      merchant_code: '',
      name: '',
      address: '',
      contact_person: '',
      contact_phone: '',
      contact_email: '',
    },
  });

  const handleSubmit = async (data: MerchantFormData) => {
    try {
      await merchantsApi.create(data);
      toast({ title: '保存しました' });
      onSubmit();
    } catch (error) {
      toast({ title: 'エラー', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>店舗名</FormLabel>
              <FormControl>
                <Input placeholder="ABC商店" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {/* 他のフィールド */}
        <Button type="submit">保存</Button>
      </form>
    </Form>
  );
}
```

---

## エラーハンドリング

### エラー境界

**✅ Good:**
```typescript
// app/(dashboard)/layout.tsx
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

export default function DashboardLayout({ children }: Props) {
  return (
    <ErrorBoundary>
      <DashboardLayout>
        {children}
      </DashboardLayout>
    </ErrorBoundary>
  );
}
```

### APIエラーのハンドリング

**✅ Good:**
```typescript
async function handleSave(data: MerchantFormData) {
  try {
    await merchantsApi.create(data);
    toast({
      title: '保存しました',
      description: '加盟店情報が正常に保存されました',
    });
    router.push('/dashboard/merchants');
  } catch (error) {
    if (error instanceof ApiError) {
      // API固有のエラー
      toast({
        title: 'エラー',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // 予期しないエラー
      toast({
        title: 'エラー',
        description: '予期しないエラーが発生しました',
        variant: 'destructive',
      });
      console.error('Unexpected error:', error);
    }
  }
}
```

---

## セキュリティ

### XSS対策

**✅ Good:**
```typescript
// Reactの自動エスケープに依存
<div>{merchant.name}</div>

// サニタイズが必要な場合
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
```

**❌ Bad:**
```typescript
// dangerouslySetInnerHTMLを無防備に使用
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```

### CSRF対策

**✅ Good:**
```typescript
// lib/api/client.ts
async function request(url: string, options: RequestInit) {
  const csrfToken = getCsrfTokenFromCookie();

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken || '',
      ...options.headers,
    },
    credentials: 'include', // Cookieを送信
  });

  return response;
}
```

### 認証チェック

**✅ Good - Middleware:**
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session_id');

  // 未認証の場合はログインページへリダイレクト
  if (!sessionCookie && !request.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*'],
};
```

---

## パフォーマンス最適化

### 画像最適化

**✅ Good:**
```typescript
import Image from 'next/image';

<Image
  src="/logo.png"
  alt="ロゴ"
  width={200}
  height={100}
  priority // LCP対象の場合
/>

// 外部画像
<Image
  src="https://example.com/image.jpg"
  alt="説明"
  width={400}
  height={300}
  loading="lazy"
/>
```

### コード分割

**✅ Good:**
```typescript
import dynamic from 'next/dynamic';

// 重いコンポーネントは動的インポート
const HeavyChart = dynamic(() => import('@/components/reports/HeavyChart'), {
  loading: () => <Skeleton className="h-64" />,
  ssr: false, // クライアントのみでレンダリング
});
```

### React.memo

**✅ Good:**
```typescript
// 頻繁に再レンダリングされるが、propsが変わらないコンポーネント
export const MerchantCard = React.memo(function MerchantCard({ merchant }: Props) {
  return (
    <Card>
      <CardHeader>{merchant.name}</CardHeader>
      <CardContent>{merchant.address}</CardContent>
    </Card>
  );
});
```

**❌ Bad - 過度な使用:**
```typescript
// 小さいコンポーネントや頻繁にpropsが変わるものには不要
export const Label = React.memo(function Label({ text }: Props) {
  return <span>{text}</span>;
});
```

---

## テスト

### ユニットテスト

**コンポーネントテスト:**
```typescript
// tests/unit/components/merchants/MerchantCard.test.tsx
import { render, screen } from '@testing-library/react';
import { MerchantCard } from '@/components/merchants/MerchantCard';

describe('MerchantCard', () => {
  const mockMerchant = {
    id: '1',
    merchant_code: 'M-001',
    name: 'テスト加盟店',
    address: '東京都渋谷区',
    contact_person: '山田太郎',
    contact_email: 'test@example.com',
    contact_phone: '03-1234-5678',
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  it('加盟店情報を正しく表示する', () => {
    render(<MerchantCard merchant={mockMerchant} />);

    expect(screen.getByText('テスト加盟店')).toBeInTheDocument();
    expect(screen.getByText('M-001')).toBeInTheDocument();
    expect(screen.getByText('東京都渋谷区')).toBeInTheDocument();
  });

  it('非アクティブな加盟店は灰色で表示される', () => {
    const inactiveMerchant = { ...mockMerchant, is_active: false };
    render(<MerchantCard merchant={inactiveMerchant} />);

    const card = screen.getByRole('article');
    expect(card).toHaveClass('opacity-50');
  });
});
```

**フックテスト:**
```typescript
// tests/unit/hooks/use-pagination.test.ts
import { renderHook, act } from '@testing-library/react';
import { usePagination } from '@/hooks/use-pagination';

describe('usePagination', () => {
  it('正しく初期化される', () => {
    const { result } = renderHook(() => usePagination(100, 20));

    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(5);
  });

  it('次のページに進める', () => {
    const { result } = renderHook(() => usePagination(100, 20));

    act(() => {
      result.current.nextPage();
    });

    expect(result.current.currentPage).toBe(2);
  });

  it('最終ページを超えて進めない', () => {
    const { result } = renderHook(() => usePagination(100, 20));

    act(() => {
      result.current.goToPage(10); // 5ページしかない
    });

    expect(result.current.currentPage).toBe(5);
  });
});
```

### E2Eテスト

**注意:** E2Eテストはルートの`e2e/`ディレクトリで一元管理されています。

Frontend側ではユニットテストと統合テストに集中し、E2Eテストは全サービス統合テストとして実施します。

**E2Eテストの詳細は [../../e2e/README.md](../../e2e/README.md) を参照してください。**

---

## アクセシビリティ

### セマンティックHTML

**✅ Good:**
```typescript
<article>
  <header>
    <h1>加盟店一覧</h1>
  </header>
  <main>
    <section>
      <h2>検索結果</h2>
      <ul>
        {merchants.map(m => (
          <li key={m.id}>{m.name}</li>
        ))}
      </ul>
    </section>
  </main>
</article>
```

**❌ Bad:**
```typescript
<div>
  <div>
    <div>加盟店一覧</div>
  </div>
  <div>
    <div>
      <div>検索結果</div>
      <div>
        {merchants.map(m => (
          <div key={m.id}>{m.name}</div>
        ))}
      </div>
    </div>
  </div>
</div>
```

### ARIA属性

**✅ Good:**
```typescript
<Button
  aria-label="加盟店を削除"
  onClick={handleDelete}
>
  <TrashIcon />
</Button>

<input
  type="text"
  aria-describedby="name-help"
  aria-invalid={!!errors.name}
/>
<span id="name-help">店舗名を入力してください</span>
```

### キーボード操作

**✅ Good:**
```typescript
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  クリック可能な要素
</div>
```

---

## Git コミットメッセージ

### フォーマット

```
<type>: <subject>

<body>

<footer>
```

### Type

- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `style`: コードスタイル（フォーマット等）
- `test`: テスト追加・修正
- `docs`: ドキュメント
- `chore`: ビルドプロセス、ツール設定等

### 例

```
feat: 加盟店一覧画面を実装

- 加盟店一覧表示（ページネーション対応）
- 検索機能（店舗名・加盟店ID）
- 並び替え機能

Closes #123
```

---

## コードレビューチェックリスト

### 機能

- [ ] 要件を満たしているか
- [ ] エッジケースを考慮しているか
- [ ] エラーハンドリングが適切か

### コード品質

- [ ] TypeScript型定義が適切か
- [ ] 命名規則に従っているか
- [ ] コンポーネントが適切に分割されているか
- [ ] 不要なコメントやconsole.logがないか

### パフォーマンス

- [ ] 不要な再レンダリングがないか
- [ ] 重い処理が適切に最適化されているか
- [ ] 画像が最適化されているか

### セキュリティ

- [ ] XSS対策が施されているか
- [ ] CSRF対策が施されているか
- [ ] 機密情報がハードコードされていないか

### テスト

- [ ] ユニットテストが書かれているか
- [ ] E2Eテストが必要なケースでは書かれているか
- [ ] テストがパスしているか

### アクセシビリティ

- [ ] セマンティックHTMLが使われているか
- [ ] キーボード操作が可能か
- [ ] ARIA属性が適切に設定されているか

---

## トラブルシューティング

### よくある問題

#### 1. APIの型が生成されない

**原因:** OpenAPI仕様ファイルが最新でない

**解決策:**
```bash
npm run generate:api-types
```

#### 2. shadcn/uiコンポーネントが見つからない

**原因:** コンポーネントが追加されていない

**解決策:**
```bash
npx shadcn-ui@latest add button
```

#### 3. CSRF Tokenエラー

**原因:** Cookieが送信されていない

**解決策:**
```typescript
// credentials: 'include'を追加
fetch(url, {
  credentials: 'include',
  // ...
});
```

#### 4. 画像が表示されない

**原因:** next.config.jsで外部ドメインが許可されていない

**解決策:**
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['example.com'],
  },
};
```

---

## 参考リンク

### 公式ドキュメント

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)

### ライブラリ

- [React Hook Form](https://react-hook-form.com/)
- [Zod](https://zod.dev/)
- [SWR](https://swr.vercel.app/)
- [TanStack Query](https://tanstack.com/query/latest)
- [date-fns](https://date-fns.org/)

### テスト

- [Vitest](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Playwright](https://playwright.dev/)

---

## 関連ドキュメント

- [Frontend CLAUDE.md](../CLAUDE.md) - 開発ルール
- [functional-design.md](functional-design.md) - 機能設計
- [repository-structure.md](repository-structure.md) - リポジトリ構造
- [docs/security-guidelines.md](../../../docs/security-guidelines.md) - セキュリティガイドライン
- [docs/glossary.md](../../../docs/glossary.md) - 用語集

---

**最終更新日:** 2026-04-05
**作成者:** Claude Code
