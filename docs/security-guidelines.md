# セキュリティガイドライン

## 概要

本ドキュメントは、加盟店契約管理システムにおけるセキュリティ実装のガイドラインを定義します。
すべてのAgent（Frontend/BFF/Backend）は、このガイドラインに従って実装してください。

---

## セキュリティ設計の原則

### 1. 多層防御（Defense in Depth）
単一の防御策に依存せず、複数の層でセキュリティを確保

### 2. 最小権限の原則（Principle of Least Privilege）
ユーザー・プロセスに必要最小限の権限のみを付与

### 3. セキュア・バイ・デフォルト（Secure by Default）
デフォルト設定で安全な状態を保つ

### 4. 入力の検証、出力のエスケープ
すべての外部入力を検証し、出力時に適切にエスケープ

### 5. 暗号化の徹底
機密情報は転送中・保存時ともに暗号化

---

## 認証（Authentication）

### セッションベース認証

#### セッション管理

**セッショントークン生成:**
```typescript
import { randomBytes } from 'crypto';

// 暗号学的に安全な乱数でトークン生成
const sessionToken = randomBytes(32).toString('hex');  // 64文字の16進数
```

**セッションCookie設定:**
```typescript
res.cookie('session_id', sessionToken, {
  httpOnly: true,     // JavaScriptからアクセス不可（XSS対策）
  secure: true,       // HTTPS通信のみ（本番環境）
  sameSite: 'strict', // CSRF対策
  maxAge: 30 * 60 * 1000,  // 30分
  path: '/'
});
```

**環境別設定:**
```typescript
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',  // 開発環境ではfalse
  sameSite: 'strict',
  maxAge: 30 * 60 * 1000
};
```

#### セッションタイムアウト

- **アイドルタイムアウト:** 30分（最終アクセスから）
- **絶対タイムアウト:** 8時間（ログインから）

**実装例:**
```typescript
// セッション検証時に更新
async function validateSession(sessionToken: string): Promise<Session | null> {
  const session = await prisma.session.findUnique({
    where: { session_token: sessionToken }
  });

  if (!session) return null;

  // 有効期限チェック
  if (session.expires_at < new Date()) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  // アイドルタイムアウトチェック（30分）
  const idleTimeout = 30 * 60 * 1000;
  if (Date.now() - session.last_accessed_at.getTime() > idleTimeout) {
    await prisma.session.delete({ where: { id: session.id } });
    return null;
  }

  // 最終アクセス日時を更新
  await prisma.session.update({
    where: { id: session.id },
    data: { last_accessed_at: new Date() }
  });

  return session;
}
```

#### セッション無効化

以下の場合、セッションを即座に無効化：
- ログアウト時
- パスワード変更時
- ロール変更時
- 不正アクセス検知時

**実装サービス:** BFF

---

### パスワード管理

#### パスワードハッシュ化

**bcryptを使用（推奨）:**
```typescript
import bcrypt from 'bcrypt';

// ユーザー登録時
const saltRounds = 12;  // コスト係数（高いほど安全だが遅い）
const passwordHash = await bcrypt.hash(password, saltRounds);

await prisma.user.create({
  data: {
    email,
    password_hash: passwordHash,
    name
  }
});
```

**ログイン時の検証:**
```typescript
const user = await prisma.user.findUnique({ where: { email } });
if (!user) {
  // ユーザーが存在しない場合も同じエラーメッセージ（列挙攻撃対策）
  throw new Error('メールアドレスまたはパスワードが正しくありません');
}

const isValid = await bcrypt.compare(password, user.password_hash);
if (!isValid) {
  throw new Error('メールアドレスまたはパスワードが正しくありません');
}
```

#### パスワードポリシー

**最小要件:**
- 最低8文字
- 英大文字・英小文字・数字・記号をそれぞれ1文字以上含む

**検証実装:**
```typescript
function validatePassword(password: string): { valid: boolean; message?: string } {
  if (password.length < 8) {
    return { valid: false, message: 'パスワードは8文字以上である必要があります' };
  }

  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'パスワードには英大文字を含める必要があります' };
  }

  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'パスワードには英小文字を含める必要があります' };
  }

  if (!/[0-9]/.test(password)) {
    return { valid: false, message: 'パスワードには数字を含める必要があります' };
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return { valid: false, message: 'パスワードには記号を含める必要があります' };
  }

  return { valid: true };
}
```

#### アカウントロック

**認証失敗時のロック:**
- 5回連続失敗でアカウントロック
- ロック時間: 30分
- ロック解除: 時間経過 or システム管理者による手動解除

**実装例:**
```typescript
// usersテーブルに追加カラム
// - failed_login_attempts: INTEGER DEFAULT 0
// - locked_until: TIMESTAMP

async function handleFailedLogin(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  const attempts = (user.failed_login_attempts || 0) + 1;

  if (attempts >= 5) {
    // 30分ロック
    const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
    await prisma.user.update({
      where: { id: userId },
      data: {
        failed_login_attempts: attempts,
        locked_until: lockedUntil
      }
    });
    throw new Error('アカウントがロックされました。30分後に再試行してください。');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { failed_login_attempts: attempts }
  });
}

async function handleSuccessfulLogin(userId: string) {
  // 認証成功時はカウンターをリセット
  await prisma.user.update({
    where: { id: userId },
    data: {
      failed_login_attempts: 0,
      locked_until: null
    }
  });
}
```

**実装サービス:** BFF

---

## 認可（Authorization）

### 権限ベースアクセス制御

**実装方針:**
- すべてのAPIエンドポイントに権限チェックを実装
- ロール名ではなく権限名でチェック
- DBから動的に権限を取得

**ミドルウェア実装:**
```typescript
// ミドルウェア: 権限チェック
function requirePermission(permissionName: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasPermission = await checkUserPermission(req.user.id, permissionName);
    if (!hasPermission) {
      // 監査ログに記録
      await logAuditEvent({
        user_id: req.user.id,
        action: 'PERMISSION_DENIED',
        resource_type: permissionName.split(':')[0],
        request_path: req.path,
        response_status: 403
      });

      return res.status(403).json({
        error: 'Permission denied',
        required_permission: permissionName
      });
    }

    next();
  };
}

// 権限チェック関数
async function checkUserPermission(userId: string, permissionName: string): Promise<boolean> {
  const result = await prisma.$queryRaw<[{ has_permission: boolean }]>`
    SELECT EXISTS(
      SELECT 1
      FROM user_roles ur
      JOIN role_permissions rp ON ur.role_id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.permission_id
      WHERE ur.user_id = ${userId}
        AND p.permission_name = ${permissionName}
    ) as has_permission
  `;

  return result[0]?.has_permission || false;
}
```

**使用例:**
```typescript
app.get('/api/contracts',
  authenticate,
  requirePermission('contracts:read'),
  getContracts
);

app.post('/api/contracts/:id/approve',
  authenticate,
  requirePermission('contracts:approve'),
  approveContract
);
```

**実装サービス:** BFF

---

## CSRF（Cross-Site Request Forgery）対策

### Double Submit Cookie方式

**実装手順:**

1. **CSRFトークンの生成と送信:**
```typescript
import { randomBytes } from 'crypto';

// ログイン成功時にCSRFトークンを発行
const csrfToken = randomBytes(32).toString('hex');

// Cookieに設定
res.cookie('csrf_token', csrfToken, {
  httpOnly: false,  // JavaScriptから読める必要がある
  secure: true,
  sameSite: 'strict',
  maxAge: 8 * 60 * 60 * 1000  // 8時間
});

// レスポンスボディにも含める（Frontendが取得）
res.json({
  success: true,
  csrfToken
});
```

2. **Frontendでのトークン送信:**
```typescript
// Next.jsでの実装例
async function apiRequest(url: string, options: RequestInit = {}) {
  // Cookieから取得（または初回ログイン時に保存したトークン）
  const csrfToken = getCookie('csrf_token');

  const headers = {
    ...options.headers,
    'X-CSRF-Token': csrfToken,  // カスタムヘッダーで送信
  };

  return fetch(url, { ...options, headers, credentials: 'include' });
}
```

3. **BFFでの検証:**
```typescript
function csrfProtection(req: Request, res: Response, next: NextFunction) {
  // GETリクエストは検証不要
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
    return next();
  }

  const cookieToken = req.cookies.csrf_token;
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'CSRF token validation failed' });
  }

  next();
}

// 全ルートに適用
app.use(csrfProtection);
```

**実装サービス:** BFF, Frontend

---

## XSS（Cross-Site Scripting）対策

### Content Security Policy（CSP）

**Next.jsでの設定:**
```typescript
// next.config.js
const nextConfig = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",  // 本番では'unsafe-eval'を削除
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self'",
              "connect-src 'self'",
              "frame-ancestors 'none'",
            ].join('; ')
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          }
        ]
      }
    ];
  }
};
```

### 自動エスケープ

**Reactの自動エスケープを利用:**
```tsx
// ✅ 安全（Reactが自動エスケープ）
<div>{userInput}</div>

// ❌ 危険（XSS脆弱性）
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ HTMLを表示する必要がある場合はサニタイズ
import DOMPurify from 'isomorphic-dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

**BFFでのエスケープ:**
```typescript
import validator from 'validator';

// HTMLタグを除去
const sanitized = validator.escape(userInput);
```

**実装サービス:** Frontend, BFF

---

## SQLインジェクション対策

### Prisma ORMの使用（推奨）

**✅ 安全な実装（パラメータ化クエリ）:**
```typescript
// Prismaは自動的にパラメータ化
const merchants = await prisma.merchant.findMany({
  where: {
    name: {
      contains: searchQuery  // 安全
    }
  }
});
```

**❌ 危険な実装（避ける）:**
```typescript
// 生SQLでユーザー入力を直接埋め込むのは禁止
const result = await prisma.$queryRawUnsafe(
  `SELECT * FROM merchants WHERE name = '${searchQuery}'`  // SQLインジェクション脆弱性
);
```

**✅ 生SQLが必要な場合はプレースホルダーを使用:**
```typescript
const result = await prisma.$queryRaw`
  SELECT * FROM merchants WHERE name LIKE ${`%${searchQuery}%`}
`;
```

**実装サービス:** BFF, Backend

---

## 入力検証（Input Validation）

### バリデーションライブラリの使用

**Zodを使用（推奨）:**
```typescript
import { z } from 'zod';

// スキーマ定義
const CreateContractSchema = z.object({
  merchant_id: z.string().uuid(),
  service_id: z.string().uuid(),
  monthly_fee: z.number().min(0).max(10000000),
  initial_fee: z.number().min(0).max(10000000).optional(),
  start_date: z.string().datetime(),
  notes: z.string().max(1000).optional()
});

// バリデーション実行
app.post('/api/contracts', authenticate, requirePermission('contracts:create'), async (req, res) => {
  try {
    const validatedData = CreateContractSchema.parse(req.body);
    // バリデーション成功、処理続行
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    throw error;
  }
});
```

### クライアント側・サーバー側の両方で検証

**重要:** クライアント側のバリデーションは補助、サーバー側が最終防衛線

**Frontend（React Hook Form + Zod）:**
```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(CreateContractSchema)
});
```

**実装サービス:** Frontend（補助）, BFF（必須）, Backend（必須）

---

## 暗号化（Encryption）

### 転送中の暗号化

#### HTTPS/TLS

**本番環境:**
- TLS 1.3使用（TLS 1.2も許可）
- TLS 1.1以下は禁止
- 強力な暗号スイートのみ許可

**証明書管理:**
- Let's Encryptまたは有料証明書
- 自動更新設定

**実装サービス:** インフラ（ALB/nginx）

#### gRPC通信の暗号化（将来）

現在は平文通信（コンテナ内ネットワーク）だが、将来的にmTLS導入を検討

---

### 保存時の暗号化

#### データベース暗号化

**Amazon RDS暗号化:**
- AES-256暗号化を有効化
- KMS（Key Management Service）で鍵管理

#### アプリケーションレベルの暗号化（将来）

機密性の高いフィールドは個別に暗号化（将来実装）

**例: 個人情報の暗号化:**
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32バイト
const ALGORITHM = 'aes-256-gcm';

function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');

  const decipher = createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY, 'hex'),
    Buffer.from(ivHex, 'hex')
  );

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

**実装サービス:** BFF, Backend

---

## ログ・監査

### 監査ログの記録

**記録対象:**
- すべてのAPI呼び出し
- 認証成功・失敗
- 権限チェック成功・失敗
- データ変更操作

**機密情報のマスキング:**
```typescript
function maskSensitiveFields(data: any): any {
  const sensitiveFields = ['password', 'token', 'session_id', 'credit_card'];

  if (typeof data !== 'object') return data;

  const masked = { ...data };
  for (const key of Object.keys(masked)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      masked[key] = '***MASKED***';
    }
  }
  return masked;
}
```

**詳細:** `docs/jsox-compliance.md` 参照

---

## エラーハンドリング

### エラーメッセージの安全性

**❌ 詳細すぎるエラー（攻撃者に情報を与える）:**
```typescript
throw new Error('User with email john@example.com not found');
throw new Error('Database connection failed: PostgreSQL server at 10.0.0.5:5432');
```

**✅ 適切なエラーメッセージ:**
```typescript
// ユーザー向け（一般的なメッセージ）
throw new Error('メールアドレスまたはパスワードが正しくありません');

// ログには詳細を記録
logger.error('Login failed for email: john@example.com', { error });
```

### エラーレスポンスの統一

```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// 例
res.status(400).json({
  error: {
    code: 'VALIDATION_ERROR',
    message: '入力内容に誤りがあります',
    details: validationErrors,
    timestamp: new Date().toISOString()
  }
});
```

**実装サービス:** BFF, Backend

---

## 依存関係のセキュリティ

### 脆弱性スキャン

**npm audit定期実行:**
```bash
npm audit
npm audit fix
```

**Dependabotの有効化（GitHub）:**
- 自動的に脆弱性を検知
- 修正PRを自動作成

### 依存関係の最小化

- 不要なパッケージは削除
- 信頼できるパッケージのみ使用
- ライセンスも確認

---

## セキュリティテスト

### 実施すべきテスト

1. **認証・認可テスト**
   - 未認証でのアクセス拒否
   - 権限不足でのアクセス拒否

2. **入力検証テスト**
   - SQLインジェクション
   - XSS
   - 境界値テスト

3. **セッション管理テスト**
   - セッションタイムアウト
   - セッション固定攻撃対策

4. **CSRF対策テスト**
   - トークン検証

**テストツール:**
- Jest（ユニットテスト）
- OWASP ZAP（脆弱性スキャン）

---

## セキュリティチェックリスト（Agent別）

### Frontend Agent

- [ ] CSPヘッダーを設定
- [ ] 自動エスケープを活用（dangerouslySetInnerHTML禁止）
- [ ] CSRFトークンを全POST/PUT/DELETEリクエストに含める
- [ ] 機密情報をlocalStorage/sessionStorageに保存しない
- [ ] HTTPS通信のみ

### BFF Agent

- [ ] すべてのAPIに認証チェック実装
- [ ] すべてのAPIに権限チェック実装
- [ ] 入力検証を実装（Zod等）
- [ ] セッション管理を適切に実装
- [ ] CSRF対策を実装
- [ ] 監査ログを記録
- [ ] エラーメッセージで機密情報を漏らさない
- [ ] パスワードをbcryptでハッシュ化
- [ ] SQLインジェクション対策（Prisma使用）

### Backend Agent

- [ ] 入力検証を実装
- [ ] SQLインジェクション対策
- [ ] ビジネスロジックレベルでの権限チェック
- [ ] データ変更履歴を記録（J-SOX）
- [ ] トランザクション境界を適切に設定

---

## まとめ

本システムのセキュリティは以下の要素で構成されます：

1. **認証:** セッションベース、bcryptパスワードハッシュ、アカウントロック
2. **認可:** 権限ベースアクセス制御（DBから動的取得）
3. **CSRF対策:** Double Submit Cookie
4. **XSS対策:** CSP、自動エスケープ
5. **SQLインジェクション対策:** Prisma ORM
6. **入力検証:** Zod（クライアント・サーバー両方）
7. **暗号化:** HTTPS/TLS、RDS暗号化、bcrypt
8. **監査:** すべてのAPI呼び出しを記録

すべてのAgentは、このガイドラインに従って実装してください。

---

**関連ドキュメント:**
- [jsox-compliance.md](jsox-compliance.md) - J-SOX対応設計（監査証跡、職務分掌）
- [system-architecture.md](system-architecture.md) - 認証・認可アーキテクチャ
- [glossary.md](glossary.md) - セキュリティ用語定義
