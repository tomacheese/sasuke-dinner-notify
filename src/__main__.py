from pprint import pprint

import tweepy
from tweepy.cursor import ItemIterator

from src import add_notified_id, config, load_notified_ids, send_discord_message


def get_search(ck: str,
               cs: str,
               at: str,
               ats: str) -> ItemIterator:
    auth = tweepy.OAuthHandler(ck, cs)
    auth.set_access_token(at, ats)
    api = tweepy.API(auth)

    tweets = tweepy.Cursor(api.search_tweets, q="サスケ・ディナー from:ekusas55000", tweet_mode="extended", result_type="mixed",
                           include_entities=True).items(20)
    return tweets


def main():
    notified_ids = load_notified_ids()
    isFirst = len(notified_ids) == 0

    tweets = get_search(config.TWITTER_CONSUMER_KEY,
                        config.TWITTER_CONSUMER_SECRET,
                        config.TWITTER_ACCESS_TOKEN,
                        config.TWITTER_ACCESS_TOKEN_SECRET)

    for tweet in tweets:
        tweet_id = tweet.id
        url = "https://twitter.com/ekusas55000/status/" + str(tweet_id)
        if "media" not in tweet.entities:
            continue

        if tweet_id in notified_ids:
            continue

        pprint(tweet)
        image_url = tweet.entities["media"][0]["media_url_https"]

        if not isFirst:
            send_discord_message(config.DISCORD_TOKEN, config.DISCORD_CHANNEL_ID, "", {
                "title": "サスケ・ディナー",
                "description": url,
                "image": {
                    "url": image_url
                },
                "color": 0x00ff00,
                "timestamp": tweet.created_at.isoformat(timespec="seconds")
            })

        add_notified_id(tweet_id)


if __name__ == "__main__":
    main()
