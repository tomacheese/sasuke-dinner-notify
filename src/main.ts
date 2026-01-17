import fs from 'node:fs'
import { Discord, DiscordEmbed, Logger } from '@book000/node-utils'
import { Scraper } from '@the-convocation/twitter-scraper'
import { cycleTLSExit } from '@the-convocation/twitter-scraper/cycletls'
import initCycleTLS, { CycleTLSClient } from 'cycletls'
import { Headers } from 'headers-polyfill'
import { TwitterOpenApi } from 'twitter-openapi-typescript'
import { SDNConfiguration } from './config'
import { Notified } from './notified'

const logger = Logger.configure('main')

// Cookie キャッシュファイルのパス
const COOKIE_CACHE_FILE =
  process.env.COOKIE_CACHE_PATH ?? './data/twitter-cookies.json'
const COOKIE_EXPIRY_DAYS = 7

interface CachedCookies {
  auth_token: string
  ct0: string
  savedAt: number
}

// CycleTLS インスタンス（プロキシサポート付き）
// Promise ベースのシングルトンパターンで並行初期化を防止
let cycleTLSInstancePromise: Promise<CycleTLSClient> | null = null

async function initCycleTLSWithProxy(): Promise<CycleTLSClient> {
  cycleTLSInstancePromise ??= initCycleTLS()
  return cycleTLSInstancePromise
}

/**
 * Headers ライクなオブジェクトのインターフェース
 * undici の _Headers クラスや標準の Headers クラスに対応
 */
interface HeadersLike {
  entries?: () => IterableIterator<[string, string]>
  [Symbol.iterator]?: () => Iterator<[string, string]>
}

/**
 * プロキシサポート付きの CycleTLS fetch 関数
 */
async function cycleTLSFetchWithProxy(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const instance = await initCycleTLSWithProxy()
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.toString()
        : input.url

  const method = (init?.method ?? 'GET').toUpperCase()

  // ヘッダーを抽出（_Headers クラス対応）
  const headers: Record<string, string> = {}
  if (init?.headers) {
    const h = init.headers as HeadersLike
    if (h.entries && typeof h.entries === 'function') {
      // entries() メソッドを使用（_Headers クラス対応）
      for (const [key, value] of h.entries()) {
        headers[key] = value
      }
    } else if (Array.isArray(init.headers)) {
      // 配列形式
      for (const [key, value] of init.headers) {
        headers[key] = value
      }
    } else if (h[Symbol.iterator] && typeof h[Symbol.iterator] === 'function') {
      // イテラブル
      for (const [key, value] of init.headers as unknown as Iterable<
        [string, string]
      >) {
        headers[key] = value
      }
    } else {
      // プレーンオブジェクト
      Object.assign(headers, init.headers as Record<string, string>)
    }
  }

  // ボディの処理
  let body: string | undefined
  if (init?.body) {
    if (typeof init.body === 'string') {
      body = init.body
    } else if (init.body instanceof URLSearchParams) {
      body = init.body.toString()
    } else {
      body = JSON.stringify(init.body)
    }
  }

  // プロキシ設定を構築
  let proxy: string | undefined
  const proxyServer = process.env.PROXY_SERVER
  if (proxyServer) {
    // プロトコルがない場合は http:// を追加
    const normalizedProxyServer =
      proxyServer.startsWith('http://') || proxyServer.startsWith('https://')
        ? proxyServer
        : `http://${proxyServer}`

    const proxyUsername = process.env.PROXY_USERNAME
    const proxyPassword = process.env.PROXY_PASSWORD
    if (proxyUsername && proxyPassword) {
      try {
        const proxyUrl = new URL(normalizedProxyServer)
        proxyUrl.username = proxyUsername
        proxyUrl.password = proxyPassword
        proxy = proxyUrl.toString()
      } catch {
        throw new Error(
          `Invalid PROXY_SERVER URL: ${proxyServer}. Expected format: host:port, http://host:port or https://host:port`
        )
      }
    } else {
      proxy = normalizedProxyServer
    }
  }

  // CycleTLS オプションを構築
  const options: Record<string, unknown> = {
    body,
    headers,
    // JA3 フィンガープリント: Chrome 120 on Windows 10
    ja3: '771,4865-4866-4867-49195-49199-49196-49200-52393-52392-49171-49172-156-157-47-53,0-23-65281-10-11-35-16-5-13-18-51-45-43-27-17513,29-23-24,0',
    // UserAgent: Chrome 135
    userAgent:
      headers['user-agent'] ||
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
  }
  if (proxy) {
    options.proxy = proxy
  }

  const response = await instance(
    url,
    options,
    method.toLowerCase() as
      | 'head'
      | 'get'
      | 'post'
      | 'put'
      | 'delete'
      | 'trace'
      | 'options'
      | 'connect'
      | 'patch'
  )

  // レスポンスヘッダーを構築
  const responseHeaders = new Headers()
  for (const [key, value] of Object.entries(response.headers)) {
    if (Array.isArray(value)) {
      for (const v of value) {
        responseHeaders.append(key, v)
      }
    } else if (typeof value === 'string') {
      responseHeaders.set(key, value)
    }
  }

  // レスポンスボディを取得
  let responseBody: string
  if (response.data !== undefined && response.data !== null) {
    responseBody =
      typeof response.data === 'string'
        ? response.data
        : JSON.stringify(response.data)
  } else {
    responseBody = ''
  }

  return new Response(responseBody, {
    status: response.status,
    statusText: '',
    headers: responseHeaders,
  })
}

function isValidCachedCookies(data: unknown): data is CachedCookies {
  if (typeof data !== 'object' || data === null) {
    return false
  }
  const obj = data as Record<string, unknown>
  return (
    typeof obj.auth_token === 'string' &&
    typeof obj.ct0 === 'string' &&
    typeof obj.savedAt === 'number'
  )
}

function loadCachedCookies(): CachedCookies | null {
  try {
    if (!fs.existsSync(COOKIE_CACHE_FILE)) {
      return null
    }
    const data: unknown = JSON.parse(fs.readFileSync(COOKIE_CACHE_FILE, 'utf8'))
    if (!isValidCachedCookies(data)) {
      logger.warn('⚠️ Cookie キャッシュの構造が不正です')
      return null
    }
    const expiryMs = COOKIE_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    if (Date.now() - data.savedAt > expiryMs) {
      logger.info('⏰ Cookie キャッシュの有効期限が切れています')
      return null
    }
    return data
  } catch (error) {
    logger.warn(
      '⚠️ キャッシュされた Cookie の読み込みに失敗しました',
      error as Error
    )
    return null
  }
}

function saveCookies(authToken: string, ct0: string): void {
  const dir = COOKIE_CACHE_FILE.slice(
    0,
    Math.max(0, COOKIE_CACHE_FILE.lastIndexOf('/'))
  )
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  const data: CachedCookies = {
    auth_token: authToken,
    ct0,
    savedAt: Date.now(),
  }
  fs.writeFileSync(COOKIE_CACHE_FILE, JSON.stringify(data, null, 2))
}

/**
 * 指数バックオフを使用した汎用リトライ関数
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number
    baseDelayMs?: number
    maxDelayMs?: number
    operationName?: string
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    baseDelayMs = 1000,
    maxDelayMs = 30_000,
    operationName = 'operation',
  } = options

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error: unknown) {
      const isLastAttempt = attempt >= maxRetries

      if (isLastAttempt) {
        throw error
      }

      const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs)
      logger.warn(
        `⚠️ ${operationName} に失敗しました (${attempt}/${maxRetries} 回目)、${delay / 1000} 秒後にリトライします...`
      )
      await new Promise((resolve) => setTimeout(resolve, delay))
    }
  }

  throw new Error(
    `${operationName} が ${maxRetries} 回のリトライ後に失敗しました`
  )
}

/**
 * 503 エラーに対応したリトライ付きログイン処理
 */
async function loginWithRetry(
  scraper: Scraper,
  username: string,
  password: string,
  email?: string,
  twoFactorSecret?: string,
  maxRetries = 5
): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`🔐 ログイン試行中 (${attempt}/${maxRetries}回目)...`)
      await scraper.login(username, password, email, twoFactorSecret)
      return
    } catch (error: unknown) {
      const is503 =
        error instanceof Error &&
        (error.message.includes('503') ||
          error.message.includes('Service Unavailable'))

      if (is503 && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30_000)
        logger.warn(`⚠️ 503 エラー、${delay / 1000} 秒後にリトライします...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      } else {
        throw error
      }
    }
  }
}

/**
 * Cookie キャッシュとログイン処理を統合した関数
 */
async function getAuthCookies(config: SDNConfiguration): Promise<{
  authToken: string
  ct0: string
}> {
  // キャッシュされた Cookie があれば使用
  const cached = loadCachedCookies()
  if (cached) {
    logger.info('🍪 キャッシュされた Cookie を使用します')
    return { authToken: cached.auth_token, ct0: cached.ct0 }
  }

  // 設定から認証情報を取得
  const twitterConfig = config.get('twitter')
  const username = twitterConfig.username
  const password = twitterConfig.password

  logger.info('🔐 twitter-scraper + CycleTLS でログイン中...')
  // カスタム fetch 関数を使用（プロキシサポート付き）
  const scraper = new Scraper({
    fetch: cycleTLSFetchWithProxy,
  })

  await loginWithRetry(
    scraper,
    username,
    password,
    twitterConfig.emailAddress,
    twitterConfig.otpSecret
  )

  if (!(await scraper.isLoggedIn())) {
    throw new Error('ログインに失敗しました')
  }

  // Cookie を取得
  const cookies = await scraper.getCookies()
  const authToken = cookies.find((c) => c.key === 'auth_token')?.value
  const ct0 = cookies.find((c) => c.key === 'ct0')?.value

  if (!authToken || !ct0) {
    throw new Error('Cookie から auth_token または ct0 を取得できませんでした')
  }

  // Cookie をキャッシュに保存
  saveCookies(authToken, ct0)
  logger.info('✅ ログイン成功、Cookie を保存しました')

  return { authToken, ct0 }
}

/**
 * クリーンアップ処理
 */
async function cleanup(): Promise<void> {
  // CycleTLS インスタンスのクリーンアップ（初期化されている場合のみ）
  if (cycleTLSInstancePromise) {
    try {
      const instance = await cycleTLSInstancePromise
      await instance.exit()
    } catch {
      // インスタンスの終了に失敗しても無視
    }
  }
  // twitter-scraper の内部 CycleTLS インスタンスも終了
  try {
    cycleTLSExit()
  } catch {
    // 初期化されていない場合のエラーを無視
  }
}

async function main() {
  logger.info('✨ main()')
  const config = new SDNConfiguration()
  config.load()
  if (!config.validate()) {
    logger.error('❌ 設定が無効です')
    for (const failure of config.getValidateFailures()) {
      logger.error('- ' + failure)
    }
    return
  }
  logger.info('✅ 設定が有効です。Twitter にログインします...')

  // 認証 Cookie を取得
  const { authToken, ct0 } = await getAuthCookies(config)

  // Twitter API クライアントを作成
  const api = new TwitterOpenApi()
  const client = await api.getClientFromCookies({
    ct0,
    auth_token: authToken,
  })

  const discordConfig = config.get('discord')
  const discord = new Discord({
    token: discordConfig.token,
    channelId: discordConfig.channelId,
  })

  // 1. ユーザー ID を取得
  logger.info('🔍 ユーザー情報を取得中...')
  const userResponse = await withRetry(
    () =>
      client.getUserApi().getUserByScreenName({ screenName: 'ekusas55000' }),
    {
      maxRetries: 3,
      baseDelayMs: 2000,
      operationName: 'ユーザー情報取得',
    }
  )
  const userData = userResponse.data.user
  if (!userData) {
    throw new Error('ユーザーデータの取得に失敗しました')
  }
  const userId = userData.restId
  logger.info(`✅ ユーザー ID: ${userId}`)

  // 2. ユーザーのツイートを取得
  logger.info('🔍 ツイートを取得中...')
  const tweetsResponse = await withRetry(
    () =>
      client.getTweetApi().getUserTweets({
        userId,
        count: 200,
      }),
    {
      maxRetries: 3,
      baseDelayMs: 2000,
      operationName: 'ユーザーツイート取得',
    }
  )

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- API レスポンスが null の可能性があるため
  const tweets = tweetsResponse.data.data ?? []
  logger.info(`🔍 ${tweets.length} 件のツイートを取得しました`)

  const notified = new Notified(
    process.env.NOTIFIED_PATH ?? './data/notified.json'
  )

  // 3. 初回実行時（= 初期化モード）は、取得したツイートの ID を通知済みとして保存
  const initializeMode = notified.isFirst()
  if (initializeMode) {
    logger.info('💾 初期化モード。すべてのツイートをファイルに保存します')
    for (const tweetResult of tweets) {
      const idStr = tweetResult.tweet.legacy?.idStr ?? tweetResult.tweet.restId
      if (idStr) {
        notified.add(idStr)
      }
    }
    return
  }

  // 4. 取得したツイートから「未通知」かつ「特定のワードを含む」ツイートのみをフィルタリング
  const notifyTweets = tweets.filter((tweetResult) => {
    const tweet = tweetResult.tweet
    const legacy = tweet.legacy
    const idStr = legacy?.idStr ?? tweet.restId
    const fullText = legacy?.fullText ?? ''

    return (
      idStr &&
      !notified.isNotified(idStr) &&
      fullText.includes('サスケ・ディナー') &&
      !fullText.startsWith('RT @')
    )
  })
  logger.info(`🔔 ${notifyTweets.length} 件のツイートを通知します`)

  // 5. フィルタ済みツイートを Discord に投稿。投稿したツイートの ID は通知済みとして保存
  for (const tweetResult of notifyTweets.toReversed()) {
    const tweet = tweetResult.tweet
    const user = tweetResult.user
    const legacy = tweet.legacy
    const idStr = legacy?.idStr ?? tweet.restId
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- API レスポンスが null の可能性があるため
    const screenName = user?.legacy?.screenName ?? 'unknown'

    // メディア URL の取得
    const extendedEntities = legacy?.extendedEntities
    if (!extendedEntities?.media || extendedEntities.media.length === 0) {
      continue
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- API レスポンスが null の可能性があるため
    const imageUrl = extendedEntities.media[0].mediaUrlHttps ?? ''
    if (!imageUrl) {
      continue
    }

    const tweetUrl = `https://twitter.com/${screenName}/status/${idStr}`
    const createdAt = legacy?.createdAt ?? ''

    logger.info(`Discord にメッセージを送信: ${tweetUrl}`)
    const embed: DiscordEmbed = {
      title: 'サスケ・ディナー',
      description: tweetUrl,
      image: {
        url: imageUrl,
      },
      color: 0x00_ff_00,
      timestamp: createdAt ? new Date(createdAt).toISOString() : undefined,
    }
    await discord.sendMessage({
      content: '',
      embeds: [embed],
    })
    if (idStr) {
      notified.add(idStr)
    }

    // 1秒待機（Discord API のレート制限対策）
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

;(async () => {
  let exitCode = 0
  try {
    await main()
  } catch (error: unknown) {
    Logger.configure('main').error('❌ Error', error as Error)
    exitCode = 1
  } finally {
    await cleanup()
  }

  // eslint-disable-next-line unicorn/no-process-exit
  process.exit(exitCode)
})()
