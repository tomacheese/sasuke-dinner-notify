# GitHub Copilot 指示書

このプロジェクトにおける GitHub Copilot の動作指針とコミュニケーション規則を定義します。

## プロジェクト概要

sasuke-dinner-notify は、特定の Twitter ユーザー（@ekusas55000）の「sasuke-dinner」関連ツイートを取得し、Discord サーバーの指定チャンネルに通知する Node.js / TypeScript アプリケーションです。

## 必須要件

### 言語規則

**すべてのコミュニケーションは日本語で行ってください。**

- Issue タイトル・本文: 日本語で記述
- PR タイトル・本文: 日本語で記述（Conventional Commits の仕様に従う）
- コミットメッセージ: 日本語で記述（Conventional Commits の仕様に従う）
- レビューコメント: 日本語で記述
- コード内コメント: 日本語で記述

### Conventional Commits 仕様（日本語版）

コミットメッセージとプルリクエストのタイトルは以下の形式に従ってください：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

#### Type の種類

- `feat`: 新機能追加
- `fix`: バグ修正
- `docs`: ドキュメント変更
- `style`: コードフォーマット変更
- `refactor`: リファクタリング
- `test`: テスト追加・修正
- `chore`: その他の変更

#### 記述規則

- `<description>` は日本語で簡潔に記述してください
- `[optional body]` は変更の詳細な説明を日本語で記述します
- `[optional scope]` はファイル名やモジュール名など、変更範囲を示します

#### 例

```
feat(discord): Discord 通知機能にメンション機能を追加

特定のキーワードが含まれるツイートの場合、
指定されたユーザーにメンションを送信する機能を実装しました。

Closes #123
```

### フォーマット規則

#### 見出しと本文の間隔

すべての見出し（Heading）とその本文の間には、空白行を入れてください。

**正しい例:**

```markdown
## 見出し

本文がここに入ります。
```

**間違った例:**

```markdown
## 見出し

本文がここに入ります。
```

#### 英数字と日本語の間隔

英数字と日本語の間には、半角スペースを入れてください。

**正しい例:**

- `Node.js アプリケーション`
- `Discord サーバー`
- `Twitter API を使用`
- `v3.0.0 をリリース`

**間違った例:**

- `Node.jsアプリケーション`
- `Discordサーバー`
- `Twitter APIを使用`
- `v3.0.0をリリース`

## プロジェクト固有のガイドライン

### コード構造

- **src/main.ts**: メインのアプリケーションロジック
- **src/config.ts**: 設定ファイルの管理
- **src/notified.ts**: 通知済みツイートの管理

### 依存関係

- **@book000/node-utils**: Discord 通知やロガー機能
- **@book000/twitterts**: Twitter API クライアント
- **twitter-d**: Twitter の型定義

### 開発ルール

#### コメント記述

すべてのコメントは日本語で記述してください：

```typescript
// Twitter からユーザーのタイムラインを取得
const timeline = await twitter.getUserTimeline(userId)

// 未通知のツイートをフィルタリング
const unnotifiedTweets = timeline.filter(
  (tweet) => !notified.isNotified(tweet.id)
)
```

#### エラーハンドリング

エラーメッセージとログは日本語で記述してください：

```typescript
try {
  // 処理
} catch (error) {
  logger.error('Twitter API の呼び出しに失敗しました', error)
  throw new Error('ツイート取得エラー')
}
```

#### Issue と PR のテンプレート

##### Issue 作成時

- タイトル: 簡潔で分かりやすい日本語
- 説明: 問題の詳細を日本語で記述
- 再現手順がある場合は番号付きリストで記載

##### PR 作成時

- タイトル: Conventional Commits 仕様に従った日本語
- 説明: 変更内容の要約と詳細を日本語で記述
- 関連 Issue がある場合は `Fixes #番号` または `Closes #番号` を記載

### 技術仕様

#### Twitter 機能

- プライベート API を使用してタイムラインを取得
- シャドウバンされたアカウントに対応
- 特定キーワードでのフィルタリング

#### Discord 機能

- 指定チャンネルへの自動通知
- Embed 形式でのツイート表示
- 重複通知の防止

#### 設定管理

設定ファイル `config.json` の形式：

```json
{
  "twitter": {
    "username": "Twitter ユーザー名",
    "password": "Twitter パスワード",
    "targetUserId": "監視対象ユーザー ID"
  },
  "discord": {
    "token": "Discord ボットトークン",
    "channelId": "通知先チャンネル ID"
  }
}
```

## 禁止事項

以下の内容は記載・実装しないでください：

- 認証情報やトークンなどの機密情報をコードに直接記述
- 英語でのコメントやメッセージ
- Conventional Commits 仕様に従わないコミットメッセージ
- 日本語と英数字の間にスペースを入れない記述

## 推奨事項

### コードレビュー

- セキュリティ上の問題がないか確認
- パフォーマンスに影響がないか検証
- コードの可読性と保守性を重視
- テストカバレッジの確保

### ドキュメント更新

コードの変更に伴い、以下のドキュメントも適切に更新してください：

- README.md
- 設定ファイルの例
- API 仕様書（該当する場合）

これらのガイドラインに従って、高品質で保守しやすいコードの作成にご協力ください。
