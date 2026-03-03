// biome-ignore-all lint/style/useConsistentMemberAccessibility: x
// biome-ignore-all lint/performance/useTopLevelRegex: x
import type { Locator } from '@playwright/test'

import BasePage from './base-page'

abstract class BaseChatPage extends BasePage {
  protected abstract readonly basePath: string
  protected abstract readonly urlPattern: RegExp

  public getCurrentUrl(): string {
    return this.page.url()
  }

  public getDeleteButtons(): Locator {
    return this.$$('delete-thread-button')
  }

  public getEmptyState(): Locator {
    return this.$('empty-state')
  }

  public getInput(): Locator {
    return this.page.locator('[data-testid="chat-input"]:visible').first()
  }

  public getMessageByStatus(status: string): Locator {
    return this.page.locator(`[data-testid="message"][data-status="${status}"]`)
  }

  public getMessages(): Locator {
    return this.$$('message')
  }

  public getNewChatButton(): Locator {
    return this.$('new-chat-button')
  }

  public getSendButton(): Locator {
    return this.page.locator('[data-testid="send-button"]:visible').first()
  }

  public getStopButton(): Locator {
    return this.page.locator('[data-testid="stop-button"]:visible').first()
  }

  public getThreadItems(): Locator {
    return this.$$('thread-item')
  }

  public getThreadList(): Locator {
    return this.$$('thread-list')
  }

  public async goto(): Promise<void> {
    await this.page.goto(this.basePath)
    await this.waitForInputReady()
  }

  public async sendMessage(): Promise<void> {
    await this.getSendButton().click()
  }

  public async sendUserMessage(message: string): Promise<void> {
    await this.typeMessage(message)
    await this.sendMessage()
    await this.page.waitForURL(this.urlPattern, { timeout: 60_000 })
  }

  public async typeMessage(message: string): Promise<void> {
    const input = this.getInput()
    await input.waitFor({ state: 'attached' })
    await input.fill(message)
  }

  public async waitForResponse(timeout = 30_000): Promise<void> {
    const assistantMessage = this.page.locator('[data-testid="message"].is-assistant').last()
    await assistantMessage.waitFor({ timeout })
    const stopButton = this.page.locator('[data-testid="stop-button"]').first()
    try {
      await stopButton.waitFor({ state: 'detached', timeout: 2000 })
    } catch {
      await this.page.locator('[data-testid="send-button"]').first().waitFor({ timeout })
    }
  }

  public async waitForStreamingToStart(timeout = 5000): Promise<void> {
    await this.page.locator('[data-testid="stop-button"]').waitFor({ timeout })
  }

  protected async waitForInputReady(): Promise<void> {
    const input = this.getInput()
    await input.waitFor({ state: 'visible', timeout: 10_000 })
  }
}

export default BaseChatPage
