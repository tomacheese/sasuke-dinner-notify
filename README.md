# sasuke-dinner-notify

Fetch [@ekusas55000](https://twitter.com/ekusas55000)'s "sasuke-dinner" and notify a specific channel on the Discord server.

## Mechanism

1. Get the latest 200 tweets of a specific user using the `statuses/user_timeline` API.
2. When operating for the first time (= initialize mode), save the tweet ID of the acquired tweets as notified.
3. From the retrieved tweets, filter only "tweets that have not yet been notified" and "tweets that contain specific words".
4. Post filtered tweets to Discord. The tweet ID of the posted tweets will be saved as notified.

- Why not use the search API?
  - because the target account is shadow-banned💢

## Configuration

File: `config.json`

```json
{
  "twitter": {
    "consumerKey": "XXXXXXXXXXXXXXXXXXXX",
    "consumerSecret": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "targetUserId": "1234567890"
  },
  "discord": {
    "token": "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "channelId": "1234567890"
  }
}
```
