import { Discord, DiscordEmbed, Logger } from '@book000/node-utils'
import { SDNConfiguration } from './config'
import { Notified } from './notified'
import { FullUser } from 'twitter-d'
import { Twitter } from '@book000/twitterts'

function isFullUser(user: any): user is FullUser {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return user.id_str !== undefined
}

async function main() {
  const logger = Logger.configure('main')
  logger.info('✨ main()')
  const config = new SDNConfiguration()
  config.load()
  if (!config.validate()) {
    logger.error('❌ Config is invalid')
    for (const failure of config.getValidateFailures()) {
      logger.error('- ' + failure)
    }
    return
  }
  logger.info('✅ Config is valid. Login to Twitter...')

  const twitter = await Twitter.login({
    username: config.get('twitter').username,
    password: config.get('twitter').password,
    otpSecret: config.get('twitter').otpSecret,
    puppeteerOptions: {
      executablePath: process.env.CHROMIUM_PATH,
      userDataDirectory: process.env.USER_DATA_DIRECTORY ?? './data/userdata',
    },
    debugOptions: {
      outputResponse: {
        enable: true,
      },
    },
  })
  try {
    const discordConfig = config.get('discord')
    const discord = new Discord({
      token: discordConfig.token,
      channelId: discordConfig.channelId,
    })

    // 1. Get the latest 200 tweets of a specific user using the `statuses/user_timeline` API.
    logger.info('🔍 Fetching tweets...')
    const tweets = await twitter.getUserTweets({
      screenName: 'ekusas55000',
      limit: 200,
    })
    logger.info(`🔍 Fetched ${tweets.length} tweets`)

    const notified = new Notified(
      process.env.NOTIFIED_PATH ?? './data/notified.json'
    )

    // 2. When operating for the first time (= initialize mode), save the tweet ID of the acquired tweets as notified.
    const initializeMode = notified.isFirst()
    if (initializeMode) {
      logger.info('💾 Initialize mode. Save all tweets to file')
      for (const tweet of tweets) {
        notified.add(tweet.id_str)
      }

      logger.info('🚀 Closing browser...')
      await twitter.close()
      return
    }

    // 3. From the retrieved tweets, filter only "tweets that have not yet been notified" and "tweets that contain specific words".
    const notifyTweets = tweets.filter((tweet) => {
      return (
        !notified.isNotified(tweet.id_str) &&
        tweet.full_text.includes('サスケ・ディナー') &&
        !tweet.full_text.startsWith('RT @')
      )
    })
    logger.info(`🔔 Notify ${notifyTweets.length} tweets`)

    // 4. Post filtered tweets to Discord. The tweet ID of the posted tweets will be saved as notified.
    for (const tweet of notifyTweets.toReversed()) {
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
      await discord.sendMessage({
        content: '',
        embeds: [embed],
      })
      notified.add(tweet.id_str)

      // wait 1 second (Discord API rate limit)
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  } catch (error) {
    logger.error("Error: Couldn't fetch tweets", error as Error)
  }

  logger.info('🚀 Closing browser...')
  await twitter.close()
}

;(async () => {
  await main().catch((error: unknown) => {
    Logger.configure('main').error('❌ Error', error as Error)
    // eslint-disable-next-line unicorn/no-process-exit
    process.exit(1)
  })
})()
