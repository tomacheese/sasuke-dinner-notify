import { ConfigFramework } from '@book000/node-utils'

export interface Configuration {
  twitter: {
    username: string
    password: string
    otpSecret?: string
    emailAddress?: string
  }
  discord: {
    token: string
    channelId: string
  }
}
export class SDNConfiguration extends ConfigFramework<Configuration> {
  protected validates(): Record<string, (config: Configuration) => boolean> {
    return {
      'config is defined': (config) => !!config,
      'twitter is defined': (config) => !!config.twitter,
      'twitter.username is defined': (config) => !!config.twitter.username,
      'twitter.username is string': (config) =>
        typeof config.twitter.username === 'string',
      'twitter.username is not empty': (config) =>
        config.twitter.username.trim() !== '',
      'twitter.password is defined': (config) => !!config.twitter.password,
      'twitter.password is string': (config) =>
        typeof config.twitter.password === 'string',
      'twitter.password is not empty': (config) =>
        config.twitter.password.trim() !== '',
      'discord is defined': (config) => !!config.discord,
      'discord.token is defined': (config) => !!config.discord.token,
      'discord.token is string': (config) =>
        typeof config.discord.token === 'string',
      'discord.token is not empty': (config) =>
        config.discord.token.trim() !== '',
      'discord.channelId is defined': (config) => !!config.discord.channelId,
      'discord.channelId is string': (config) =>
        typeof config.discord.channelId === 'string',
      'discord.channelId is not empty': (config) =>
        config.discord.channelId.trim() !== '',
    }
  }
}
