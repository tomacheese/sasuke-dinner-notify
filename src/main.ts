import { SDNConfiguration } from './config'
import { DiscordEmbed, Logger } from '@book000/node-utils'
import { Twitter } from './twitter'
import { SDNBrowser } from './browser'
import { DiscordApi } from './discord'
import { Notified } from './notified'
import { FullUser, User } from 'twitter-d'

function isFullUser(user: User): user is FullUser {
  return 'screen_name' in user
}

async function main() {
  const logger = Logger.configure('main')
  logger.info('✨ main()')
  const config = new SDNConfiguration()
  config.load()
  if (!config.validate()) {
    logger.error(
      `❌ Configuration validation failed: ${config
        .getValidateFailures()
        .join(', ')}`
    )
    return
  }

  const browser = await SDNBrowser.init(config.get('twitter'))
  const twitter = new Twitter(browser)
  const screenName = await twitter.getUserScreenName(
    config.get('twitter').targetUserId
  )

  // 1. Get the latest 200 tweets of a specific user using the `statuses/user_timeline` API.
  const tweets = await twitter.getUserTweets(screenName, 200)
  logger.info(`Got ${tweets.length} tweets`)
  await browser.close()

  // DiscordApi
  const discordApi = new DiscordApi(
    config.get('discord').token,
    config.get('discord').channelId
  )

  // 2. When operating for the first time (= initialize mode), save the tweet ID of the acquired tweets as notified.
  const initializeMode = Notified.isFirst()
  if (initializeMode) {
    logger.info('Initialize mode. Save all tweets to file')
    for (const tweet of tweets) {
      Notified.addNotified(tweet.id_str)
    }
    return
  }

  // 3. From the retrieved tweets, filter only "tweets that have not yet been notified" and "tweets that contain specific words".
  const notifyTweets = tweets.filter((tweet) => {
    return (
      !Notified.isNotified(tweet.id_str) &&
      tweet.full_text &&
      tweet.full_text.includes('サスケ・ディナー')
    )
  })
  logger.info(`Notify ${notifyTweets.length} tweets`)

  // 4. Post filtered tweets to Discord. The tweet ID of the posted tweets will be saved as notified.
  for (const tweet of notifyTweets) {
    if (!isFullUser(tweet.user)) {
      continue
    }
    if (!tweet.entities.media) {
      continue
    }

    const tweetUrl = `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`
    const imageUrl = tweet.entities.media[0].media_url_https

    logger.info(`Send message to Discord: ${tweetUrl}`)
    const embed: DiscordEmbed = {
      title: 'サスケ・ディナー',
      description: tweetUrl,
      image: {
        url: imageUrl,
      },
      color: 0x00_ff_00,
      timestamp: new Date(tweet.created_at).toISOString(),
    }
    await discordApi.sendMessage('', embed)
    Notified.addNotified(tweet.id_str)

    // wait 1 second (Discord API rate limit)
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
}

;(async () => {
  await main()
})()
