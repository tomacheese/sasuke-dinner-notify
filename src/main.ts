import { getConfig } from './config'
import { TwitterApi } from 'twitter-api-v2'
import { DiscordApi, DiscordEmbed } from './discord'
import { StatusesUserTimelineResponse } from './models/twitter'
import { Notified } from './notified'

async function getUserTweets(api: TwitterApi, userId: string) {
  const response = await api.v1.get<StatusesUserTimelineResponse>(
    'statuses/user_timeline.json',
    {
      user_id: userId,
      count: 200,
      exclude_replies: true,
      include_rts: false,
      tweet_mode: 'extended',
    }
  )
  return response
}

async function main() {
  const config = getConfig()

  // TwitterApi
  const twitterApi = new TwitterApi({
    appKey: config.twitter.consumerKey,
    appSecret: config.twitter.consumerSecret,
  })

  // DiscordApi
  const discordApi = new DiscordApi(
    config.discord.token,
    config.discord.channelId
  )

  // 1. Get the latest 200 tweets of a specific user using the `statuses/user_timeline` API.
  const tweets = await getUserTweets(twitterApi, config.twitter.targetUserId)

  // 2. When operating for the first time (= initialize mode), save the tweet ID of the acquired tweets as notified.
  const initializeMode = Notified.isFirst()
  if (initializeMode) {
    console.log('Initialize mode. Save all tweets to file')
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

  // 4. Post filtered tweets to Discord. The tweet ID of the posted tweets will be saved as notified.
  for (const tweet of notifyTweets) {
    if (!tweet.entities.media) {
      continue
    }

    const tweetUrl = `https://twitter.com/${tweet.user.screen_name}/status/${tweet.id_str}`
    const imageUrl = tweet.entities.media[0].media_url_https

    console.log(`Send message to Discord: ${tweetUrl}`)
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
  }
}

;(async () => {
  await main()
})()
