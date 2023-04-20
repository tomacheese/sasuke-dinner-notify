import { Page } from 'puppeteer-core'
import { GraphQLResponse } from './graphql-response'
import { Status } from 'twitter-d'
import { SDNBrowser } from './browser'
import { GraphQLUserTweetsResponse } from './models/user-tweets'
import { CustomGraphQLUserTweet } from './models/custom-graphql-user-tweet'

export class Twitter {
  private readonly browser: SDNBrowser

  constructor(browser: SDNBrowser) {
    this.browser = browser
  }

  public async getUserScreenName(userId: string): Promise<string> {
    const url = `https://twitter.com/i/user/${userId}`
    const page = await this.browser.newPage()

    await page.goto(url)

    await new Promise<void>((resolve) => {
      const interval = setInterval(async () => {
        const href = await page.evaluate(() => {
          return document.location.href
        })
        if (href !== url) {
          clearInterval(interval)
          resolve()
        }
      }, 1000)
      setTimeout(() => {
        clearInterval(interval)
        resolve()
      }, 10_000)
    })

    const screenName = await page.evaluate(() => {
      return document.location.href.split('/').pop()
    })
    await page.close()

    if (!screenName || screenName === userId) {
      throw new Error('Failed to get screen name.')
    }
    if (screenName === '404') {
      throw new Error('User not found.')
    }

    return screenName
  }

  public async getUserTweets(screenName: string, limit: number) {
    const page = await this.browser.newPage()

    const graphqlResponse = new GraphQLResponse(page, 'UserTweets')
    await page.goto(`https://twitter.com/${screenName}`, {
      waitUntil: 'networkidle2',
    })

    const scrollInterval = setInterval(async () => {
      await this.pageScroll(page)
    }, 1000)

    const tweets = []
    while (tweets.length < limit) {
      try {
        tweets.push(...(await this.waitTweet(graphqlResponse)))
      } catch {
        break
      }
    }

    clearInterval(scrollInterval)
    await page.close()

    return tweets
  }

  waitTweet(graphqlResponse: GraphQLResponse<'UserTweets'>): Promise<Status[]> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(new Error('TIMEOUT'))
      }, 10_000)
      const interval = setInterval(async () => {
        const response = graphqlResponse.shiftResponse()
        if (!response) {
          return
        }

        const tweets = this.getTweet(response)
        if (tweets.length > 0) {
          clearInterval(interval)
          resolve(tweets)
        }
      }, 1000)
    })
  }

  getTweet(response: GraphQLUserTweetsResponse): Status[] {
    const result = response.data.user.result.timeline_v2.timeline.instructions
    return (
      this.filterUndefined(
        this.filterUndefined(
          result
            .filter((instruction) => instruction.type === 'TimelineAddEntries')
            .flatMap((instruction) => instruction.entries)
        )
          .filter((entry) => entry.entryId.startsWith('tweet-'))
          .flatMap((entry) => entry.content.itemContent?.tweet_results.result)
      ) as CustomGraphQLUserTweet[]
    ).map((tweet) => {
      return this.createStatusObject(tweet)
    })
  }

  private createStatusObject(tweet: any): Status {
    const legacy = tweet.legacy ?? tweet.tweet?.legacy ?? undefined
    const userResult =
      tweet.core?.user_results.result ??
      tweet.tweet?.core.user_results.result ??
      undefined
    if (!legacy) {
      throw new Error('Failed to get legacy')
    }
    return {
      id: Number(legacy.id_str),
      source: tweet.source ?? 'NULL',
      truncated: false,
      user: {
        id: Number(userResult?.rest_id),
        id_str: userResult?.rest_id ?? 'NULL',
        ...userResult?.legacy,
      },
      ...legacy,
      display_text_range: legacy.display_text_range
        ? [legacy.display_text_range[0], legacy.display_text_range[1]]
        : undefined,
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      entities: legacy.entities,
    }
  }

  private async pageScroll(page: Page) {
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })
    })
  }

  private filterUndefined<T>(array: (T | undefined)[]): T[] {
    return array.filter((value) => value !== undefined) as T[]
  }
}
