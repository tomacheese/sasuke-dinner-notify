import fs from 'fs'
import { PATH } from './config'

export class Notified {
  public static isFirst(): boolean {
    const path = PATH.notified
    return !fs.existsSync(path)
  }

  public static isNotified(tweetId: string): boolean {
    const path = PATH.notified
    const json = fs.existsSync(path)
      ? JSON.parse(fs.readFileSync(path, 'utf8'))
      : []
    return json.includes(tweetId)
  }

  public static addNotified(tweetId: string): void {
    const path = PATH.notified
    const json = fs.existsSync(path)
      ? JSON.parse(fs.readFileSync(path, 'utf8'))
      : []
    json.push(tweetId)
    fs.writeFileSync(path, JSON.stringify(json))
  }
}
