import axios, { AxiosInstance } from 'axios'
import { TwitterApi } from 'twitter-api-v2'
import { Configuration } from './config'
import { StatusesUserTimelineResponse } from './models/twitter'

export class TwApi {
  private twitterApi: TwitterApi | undefined
  private twApiAxios: AxiosInstance | undefined
  private targetUserId: string | undefined

  constructor(config: Configuration) {
    if (config.twitter) {
      this.twitterApi = new TwitterApi({
        appKey: config.twitter.consumerKey,
        appSecret: config.twitter.consumerSecret,
      })
      this.targetUserId = config.twitter.targetUserId
    }
    if (config.twapi) {
      this.twApiAxios = axios.create({
        baseURL: config.twapi.baseUrl,
        auth: {
          username: config.twapi.basicUsername,
          password: config.twapi.basicPassword,
        },
      })
      this.targetUserId = config.twapi.targetUserId
    }

    if (!this.twitterApi && !this.twApiAxios) {
      throw new Error('API is not initialized')
    }
  }

  public async getUserTweets(): Promise<StatusesUserTimelineResponse> {
    if (this.twitterApi) {
      return await this.getUserTweetsFromTwitterApi()
    }
    if (this.twApiAxios) {
      return await this.getUserTweetsFromTwApi()
    }
    throw new Error('API is not initialized')
  }

  private async getUserTweetsFromTwitterApi() {
    if (!this.twitterApi) {
      throw new Error('TwitterAPI is not initialized')
    }
    return await this.twitterApi.v1.get<StatusesUserTimelineResponse>(
      'statuses/user_timeline.json',
      {
        user_id: this.targetUserId,
        count: 200,
        exclude_replies: true,
        include_rts: false,
        tweet_mode: 'extended',
      }
    )
  }

  private async getUserTweetsFromTwApi() {
    if (!this.twApiAxios) {
      throw new Error('TwAPI is not initialized')
    }
    const { data } = await this.twApiAxios.get<StatusesUserTimelineResponse>(
      '/users/tweets',
      {
        params: {
          user_id: this.targetUserId,
          limit: 200,
        },
      }
    )
    return data
  }
}
