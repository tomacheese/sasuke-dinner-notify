import fs from 'node:fs'
import { Logger } from './logger'

export const PATH = {
  config: process.env.CONFIG_PATH || './config.json',
  notified: process.env.NOTIFIED_PATH || './notified.json',
}

export interface ProxyConfig {
  host: string
  port: number
  username?: string
  password?: string
  protocol?: string
}

export interface Configuration {
  twitter?: {
    consumerKey: string
    consumerSecret: string
    targetUserId: string
  }
  twapi?: {
    baseUrl: string
    basicUsername: string
    basicPassword: string
    targetUserId: string
  }
  discord: {
    token: string
    channelId: string
  }
  proxy?: ProxyConfig
}

const isConfig = (config: any): config is Configuration => {
  const logger = Logger.configure('isConfig')
  const checks: {
    [key: string]: boolean
  } = {
    'config is defined': !!config,
    'twitter or twapi is defined': !!config.twitter || !!config.twapi,
    'discord is defined': !!config.discord,
    'discord.token is defined': !!config.discord.token,
    'discord.token is string': typeof config.discord.token === 'string',
    'discord.token is not empty': config.discord.token.trim() !== '',
    'discord.channelId is defined': !!config.discord.channelId,
    'discord.channelId is string': typeof config.discord.channelId === 'string',
    'discord.channelId is not empty': config.discord.channelId.trim() !== '',
  }
  if (config.twitter) {
    checks['twitter.consumerKey is defined'] = !!config.twitter.consumerKey
    checks['twitter.consumerKey is string'] =
      typeof config.twitter.consumerKey === 'string'
    checks['twitter.consumerKey is not empty'] =
      config.twitter.consumerKey.trim() !== ''

    checks['twitter.consumerSecret is defined'] =
      !!config.twitter.consumerSecret
    checks['twitter.consumerSecret is string'] =
      typeof config.twitter.consumerSecret === 'string'
    checks['twitter.consumerSecret is not empty'] =
      config.twitter.consumerSecret.trim() !== ''

    checks['twitter.targetUserId is defined'] = !!config.twitter.targetUserId
    checks['twitter.targetUserId is string'] =
      typeof config.twitter.targetUserId === 'string'
    checks['twitter.targetUserId is not empty'] =
      config.twitter.targetUserId.trim() !== ''
  }
  if (config.twapi) {
    checks['twapi.baseUrl is defined'] = !!config.twapi.baseUrl
    checks['twapi.baseUrl is string'] = typeof config.twapi.baseUrl === 'string'
    checks['twapi.baseUrl is not empty'] = config.twapi.baseUrl.trim() !== ''

    checks['twapi.basicUsername is defined'] = !!config.twapi.basicUsername
    checks['twapi.basicUsername is string'] =
      typeof config.twapi.basicUsername === 'string'

    checks['twapi.basicPassword is defined'] = !!config.twapi.basicPassword
    checks['twapi.basicPassword is string'] =
      typeof config.twapi.basicPassword === 'string'

    checks['twapi.targetUserId is defined'] = !!config.twapi.targetUserId
    checks['twapi.targetUserId is string'] =
      typeof config.twapi.targetUserId === 'string'
    checks['twapi.targetUserId is not empty'] =
      config.twapi.targetUserId.trim() !== ''
  }
  const result = Object.values(checks).every(Boolean)
  if (!result) {
    logger.error('Invalid config. Missing check(s):')
    for (const [key, value] of Object.entries(checks)) {
      if (!value) {
        logger.error(`- ${key}`)
      }
    }
  }
  return result
}

export function getConfig(): Configuration {
  if (!fs.existsSync(PATH.config)) {
    throw new Error('Config file not found')
  }
  const config = JSON.parse(fs.readFileSync(PATH.config, 'utf8'))
  if (!isConfig(config)) {
    throw new Error('Invalid config')
  }
  return config
}
