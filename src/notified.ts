import fs from 'node:fs'

export class Notified {
  private path: string
  private notified: string[] = []

  constructor(path: string) {
    this.path = path

    if (fs.existsSync(path)) {
      this.load()
    }
  }

  public isNotified(id: string): boolean {
    return this.notified.includes(id)
  }

  public add(id: string): void {
    this.notified.push(id)
    this.save()
  }

  public isFirst(): boolean {
    return !fs.existsSync(this.path)
  }

  public load(): void {
    this.notified = JSON.parse(fs.readFileSync(this.path, 'utf8'))
  }

  public save(): void {
    // eslint-disable-next-line unicorn/no-null
    fs.writeFileSync(this.path, JSON.stringify(this.notified, null, 2))
  }

  public get length(): number {
    return this.notified.length
  }
}
