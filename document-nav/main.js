const CONTAINER_CLASS = 'typora-document-nav'
const BUTTON_CLASS = 'typora-document-nav-btn'
const TOP_BUTTON_CLASS = 'typora-document-nav-btn-top'
const BOTTOM_BUTTON_CLASS = 'typora-document-nav-btn-bottom'
const HIDDEN_CLASS = 'is-hidden'

const ICON_UP = [
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
  '<path d="M5 4h14v2H5V4Zm7 3.4-7.4 7.4L6 16.2l5-5V20h2v-8.8l5 5 1.4-1.4L12 7.4Z"/>',
  '</svg>',
].join('')

const ICON_DOWN = [
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
  '<path d="M5 18h14v2H5v-2Zm7-1.4 7.4-7.4L18 7.8l-5 5V4h-2v8.8l-5-5-1.4 1.4 7.4 7.4Z"/>',
  '</svg>',
].join('')

export default class DocumentNavPlugin {
  constructor() {
    this.container = undefined
    this.topButton = undefined
    this.bottomButton = undefined
    this.scrollTarget = undefined
    this.observer = undefined
    this.updateFrame = 0
    this.handleJumpTop = (event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      this.scrollToTop()
    }
    this.handleJumpBottom = (event) => {
      event.preventDefault()
      event.stopImmediatePropagation()
      this.scrollToBottom()
    }
    this.handleScroll = () => this.queueStateUpdate()
    this.handleResize = () => this.refreshScrollTarget()
  }

  load() {
    this.onload()
  }

  unload() {
    this.onunload()
  }

  onload() {
    this.createButtons()
    this.refreshScrollTarget()
    this.observeDocument()
    console.info('[Document Nav] loaded')
  }

  onunload() {
    this.stopObservingDocument()
    this.unbindScrollTarget()
    this.cancelStateUpdate()
    this.removeButtons()
    console.info('[Document Nav] unloaded')
  }

  createButtons() {
    if (this.container) {
      return
    }

    document.querySelectorAll(`.${CONTAINER_CLASS}`).forEach((node) => node.remove())

    const container = document.createElement('div')
    container.className = CONTAINER_CLASS

    const topButton = this.createButton('跳到文档顶部', '顶部', ICON_UP, TOP_BUTTON_CLASS, this.handleJumpTop)
    const bottomButton = this.createButton('跳到文档末尾', '末尾', ICON_DOWN, BOTTOM_BUTTON_CLASS, this.handleJumpBottom)

    container.append(topButton, bottomButton)
    document.body.appendChild(container)
    this.container = container
    this.topButton = topButton
    this.bottomButton = bottomButton
  }

  createButton(label, tooltip, icon, extraClass, handler) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = `${BUTTON_CLASS} ${extraClass}`
    button.setAttribute('aria-label', label)
    button.setAttribute('title', label)
    button.dataset.tooltip = tooltip
    button.innerHTML = icon
    button.addEventListener('click', handler)
    return button
  }

  removeButtons() {
    if (!this.container) {
      return
    }

    this.topButton?.removeEventListener('click', this.handleJumpTop)
    this.bottomButton?.removeEventListener('click', this.handleJumpBottom)

    this.container.remove()
    this.container = undefined
    this.topButton = undefined
    this.bottomButton = undefined
  }

  observeDocument() {
    window.addEventListener('resize', this.handleResize)

    this.observer = new MutationObserver(() => this.refreshScrollTarget())
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  stopObservingDocument() {
    window.removeEventListener('resize', this.handleResize)
    this.observer?.disconnect()
    this.observer = undefined
  }

  refreshScrollTarget() {
    const nextTarget = this.getScrollTarget()

    if (this.scrollTarget !== nextTarget) {
      this.unbindScrollTarget()
      this.scrollTarget = nextTarget
      this.scrollTarget?.addEventListener('scroll', this.handleScroll, { passive: true })
    }

    this.queueStateUpdate()
  }

  unbindScrollTarget() {
    this.scrollTarget?.removeEventListener('scroll', this.handleScroll)
    this.scrollTarget = undefined
  }

  queueStateUpdate() {
    if (this.updateFrame) {
      return
    }

    this.updateFrame = requestAnimationFrame(() => {
      this.updateFrame = 0
      this.updateButtonState()
    })
  }

  cancelStateUpdate() {
    if (!this.updateFrame) {
      return
    }

    cancelAnimationFrame(this.updateFrame)
    this.updateFrame = 0
  }

  updateButtonState() {
    if (!this.container || !this.topButton || !this.bottomButton || !this.scrollTarget) {
      return
    }

    const maxTop = this.getMaxScrollTop(this.scrollTarget)
    const top = this.scrollTarget.scrollTop
    const canScroll = maxTop > 1

    this.container.classList.toggle(HIDDEN_CLASS, !canScroll)
    this.setButtonDisabled(this.topButton, !canScroll || top <= 1)
    this.setButtonDisabled(this.bottomButton, !canScroll || top >= maxTop - 1)
  }

  setButtonDisabled(button, disabled) {
    button.disabled = disabled
    button.setAttribute('aria-disabled', String(disabled))
  }

  getScrollTarget() {
    const candidates = [
      document.querySelector('#write')?.parentElement,
      document.querySelector('.typora-sourceview'),
      document.querySelector('.CodeMirror-scroll'),
      document.querySelector('content'),
      document.scrollingElement,
      document.documentElement,
      document.body,
    ]

    for (const candidate of candidates) {
      if (candidate instanceof HTMLElement && candidate.scrollHeight > candidate.clientHeight) {
        return candidate
      }
    }

    return document.scrollingElement ?? document.documentElement ?? document.body
  }

  scrollToTop() {
    this.refreshScrollTarget()
    this.scrollTo(0)
  }

  scrollToBottom() {
    this.refreshScrollTarget()
    const target = this.scrollTarget ?? this.getScrollTarget()
    const maxTop = this.getMaxScrollTop(target)
    this.scrollTo(maxTop)
  }

  scrollTo(top) {
    const target = this.scrollTarget ?? this.getScrollTarget()

    if (typeof target.scrollTo === 'function') {
      target.scrollTo({ top, behavior: 'auto' })
      this.queueStateUpdate()
      return
    }

    target.scrollTop = top
    this.queueStateUpdate()
  }

  getMaxScrollTop(target) {
    return Math.max(0, target.scrollHeight - target.clientHeight)
  }
}
