import fs from 'node:fs'

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

export interface Config {
  twitter: {
    consumerKey: string
    consumerSecret: string
    targetUserId: string
  }
  discord: {
    token: string
    channelId: string
  }
  proxy?: ProxyConfig
}

const isConfig = (config: any): config is Config => {
  return (
    config &&
    config.twitter &&
    config.twitter.consumerKey &&
    config.twitter.consumerSecret &&
    config.twitter.targetUserId &&
    config.discord &&
    config.discord.token &&
    config.discord.channelId
  )
}

export function getConfig(): Config {
  if (!fs.existsSync(PATH.config)) {
    throw new Error('Config file not found')
  }
  const config = JSON.parse(fs.readFileSync(PATH.config, 'utf8'))
  if (!isConfig(config)) {
    throw new Error('Invalid config')
  }
  return config
}
