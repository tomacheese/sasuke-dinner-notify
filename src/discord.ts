import axios from 'axios'
import { ProxyConfig } from './config'

export interface DiscordEmbedFooter {
  text: string
  icon_url?: string
  proxy_icon_url?: string
}

export interface DiscordEmbedImage {
  url?: string
  proxy_url?: string
  height?: number
  width?: number
}

export interface DiscordEmbedThumbnail {
  url?: string
  proxy_url?: string
  height?: number
  width?: number
}

export interface DiscordEmbedVideo {
  url?: string
  proxy_url?: string
  height?: number
  width?: number
}

export interface DiscordEmbedProvider {
  name?: string
  url?: string
}

export interface DiscordEmbedAuthor {
  name?: string
  url?: string
  icon_url?: string
  proxy_icon_url?: string
}

export interface DiscordEmbedField {
  name: string
  value: string
  inline?: boolean
}

export interface DiscordEmbed {
  title?: string
  type?: 'rich' | 'image' | 'video' | 'gifv' | 'article' | 'link'
  description?: string
  url?: string
  timestamp?: string
  color?: number
  footer?: DiscordEmbedFooter
  image?: DiscordEmbedImage
  thumbnail?: DiscordEmbedThumbnail
  video?: DiscordEmbedVideo
  provider?: DiscordEmbedProvider
  author?: DiscordEmbedAuthor
  fields?: DiscordEmbedField[]
}

export class DiscordApi {
  private token: string
  private channelId: string
  private proxy?: ProxyConfig

  constructor(token: string, channelId: string, proxy?: ProxyConfig) {
    this.token = token
    this.channelId = channelId
    this.proxy = proxy
  }

  async sendMessage(message: string, embed?: DiscordEmbed) {
    const url = `https://discord.com/api/channels/${this.channelId}/messages`

    const response = await axios.post(
      url,
      {
        content: message,
        embed,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bot ${this.token}`,
        },
        proxy: this.proxy
          ? {
              host: this.proxy.host,
              port: this.proxy.port,
              auth:
                this.proxy.username && this.proxy.password
                  ? {
                      username: this.proxy.username,
                      password: this.proxy.password,
                    }
                  : undefined,
            }
          : false,
      }
    )
    if (response.status !== 200) {
      throw new Error(`Failed to send message to Discord: ${response.status}`)
    }
  }
}
