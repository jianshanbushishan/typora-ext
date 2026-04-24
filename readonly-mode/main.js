const STORAGE_KEY = 'typora-readonly-mode:enabled'
const BODY_CLASS = 'typora-readonly-mode-on'

const EDITOR_SELECTOR = [
  '#write',
  '#typora-source',
  '.typora-sourceview',
  '.CodeMirror',
  '[contenteditable="true"]',
].join(',')

const PASS_THROUGH_SELECTOR = [
  '.typora-readonly-toggle',
  '.typora-readonly-toast',
  '.typora-document-nav',
  '.typora-document-nav-btn',
  '.mermaid-zoom-btn',
  '.mermaid-zoom-overlay',
].join(',')

const POINTER_EVENTS = [
  'pointerdown',
  'pointerup',
  'mousedown',
  'mouseup',
  'click',
  'dblclick',
  'auxclick',
  'contextmenu',
  'dragstart',
  'drop',
  'selectstart',
]

const INPUT_EVENTS = [
  'beforeinput',
  'input',
  'paste',
  'cut',
  'compositionstart',
  'compositionupdate',
  'compositionend',
]

const ALLOWED_READONLY_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'Escape',
])

const ALLOWED_MODIFIED_KEYS = new Set([
  '0',
  '=',
  '+',
  '-',
  'a',
  'c',
  'f',
  'p',
  's',
])

const READONLY_ICON = [
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
  '<path d="M7 10V8a5 5 0 0 1 10 0v2h1.2c.9 0 1.6.7 1.6 1.6v7.8c0 .9-.7 1.6-1.6 1.6H5.8c-.9 0-1.6-.7-1.6-1.6v-7.8c0-.9.7-1.6 1.6-1.6H7Zm2 0h6V8a3 3 0 0 0-6 0v2Zm3 3.1a1.4 1.4 0 0 0-.7 2.6v1.7h1.4v-1.7a1.4 1.4 0 0 0-.7-2.6Z"/>',
  '</svg>',
].join('')

const EDIT_ICON = [
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">',
  '<path d="M5 17.8 5.8 14 15.9 3.9a2.1 2.1 0 0 1 3 0l1.2 1.2a2.1 2.1 0 0 1 0 3L10 18.2 6.2 19a1 1 0 0 1-1.2-1.2Zm3.9-1.4 9.8-9.8-1.3-1.3-9.8 9.8-.3 1.6 1.6-.3ZM4 21h16v-2H4v2Z"/>',
  '</svg>',
].join('')

export default class ReadonlyModePlugin {
  constructor() {
    this.enabled = true
    this.toggleButton = undefined
    this.toggleIcon = undefined
    this.toggleText = undefined
    this.renderedToggleState = undefined
    this.toast = undefined
    this.toastTimer = 0
    this.handlePointerEvent = (event) => this.blockPointerEvent(event)
    this.handleInputEvent = (event) => this.blockEditorEvent(event)
    this.handleKeydown = (event) => this.blockKeydown(event)
    this.handleFocusIn = (event) => this.handleEditorFocus(event)
    this.handleToggleClick = (event) => {
      event.preventDefault()
      event.stopPropagation()
      this.setEnabled(!this.enabled, true)
    }
  }

  load() {
    this.onload()
  }

  unload() {
    this.onunload()
  }

  onload() {
    this.enabled = this.readStoredEnabled()
    this.createToggle()
    this.applyState(false)
    this.bindEvents()
    console.info('[Read-only Mode] loaded')
  }

  onunload() {
    this.unbindEvents()
    this.removeToggle()
    this.removeToast()
    document.body?.classList.remove(BODY_CLASS)
    console.info('[Read-only Mode] unloaded')
  }

  readStoredEnabled() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      return stored === null ? true : stored === '1'
    } catch {
      return true
    }
  }

  setEnabled(enabled, notify = false) {
    if (this.enabled === enabled) {
      return
    }

    this.enabled = enabled
    this.writeStoredEnabled(enabled)
    this.applyState(notify)
  }

  writeStoredEnabled(enabled) {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
    } catch {
      // Storage can be unavailable in restricted WebViews; read-only mode still works in-memory.
    }
  }

  applyState(notify) {
    document.body?.classList.toggle(BODY_CLASS, this.enabled)
    this.updateToggle()

    if (this.enabled) {
      this.blurEditor()
    }

    if (notify) {
      this.showToast(this.enabled ? '只读模式已开启' : '只读模式已关闭')
    }
  }

  bindEvents() {
    POINTER_EVENTS.forEach((type) => {
      document.addEventListener(type, this.handlePointerEvent, true)
    })

    INPUT_EVENTS.forEach((type) => {
      document.addEventListener(type, this.handleInputEvent, true)
    })

    document.addEventListener('keydown', this.handleKeydown, true)
    document.addEventListener('focusin', this.handleFocusIn, true)
  }

  unbindEvents() {
    POINTER_EVENTS.forEach((type) => {
      document.removeEventListener(type, this.handlePointerEvent, true)
    })

    INPUT_EVENTS.forEach((type) => {
      document.removeEventListener(type, this.handleInputEvent, true)
    })

    document.removeEventListener('keydown', this.handleKeydown, true)
    document.removeEventListener('focusin', this.handleFocusIn, true)
  }

  blockPointerEvent(event) {
    if (!this.shouldBlockEditorEvent(event)) {
      return
    }

    this.blockEvent(event)
    this.blurEditor()
  }

  blockEditorEvent(event) {
    if (!this.shouldBlockEditorEvent(event)) {
      return
    }

    this.blockEvent(event)
  }

  blockKeydown(event) {
    if (this.isToggleShortcut(event)) {
      this.blockEvent(event)
      this.setEnabled(!this.enabled, true)
      return
    }

    if (!this.shouldBlockEditorEvent(event) || this.isAllowedReadonlyKey(event)) {
      return
    }

    this.blockEvent(event)
  }

  handleEditorFocus(event) {
    if (!this.shouldBlockEditorEvent(event)) {
      return
    }

    requestAnimationFrame(() => this.blurEditor())
  }

  shouldBlockEditorEvent(event) {
    if (!this.enabled) {
      return false
    }

    const target = this.getTargetElement(event)
    if (!target) {
      return false
    }

    if (target.closest(PASS_THROUGH_SELECTOR)) {
      return false
    }

    return Boolean(target.closest(EDITOR_SELECTOR))
  }

  blockEvent(event) {
    event.preventDefault()
    event.stopImmediatePropagation()
  }

  getTargetElement(event) {
    const target = event.target
    if (target instanceof Element) {
      return target
    }

    if (target instanceof Node) {
      return target.parentElement
    }

    return undefined
  }

  isAllowedReadonlyKey(event) {
    if (ALLOWED_READONLY_KEYS.has(event.key)) {
      return true
    }

    const hasModifier = event.ctrlKey || event.metaKey
    if (!hasModifier || event.altKey) {
      return false
    }

    return ALLOWED_MODIFIED_KEYS.has(event.key.toLowerCase())
  }

  isToggleShortcut(event) {
    return (event.ctrlKey || event.metaKey) && event.altKey && event.key.toLowerCase() === 'r'
  }

  blurEditor() {
    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement && activeElement.closest(EDITOR_SELECTOR)) {
      activeElement.blur()
    }
  }

  createToggle() {
    if (this.toggleButton) {
      return
    }

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'typora-readonly-toggle'
    button.title = '切换只读模式 (Ctrl+Alt+R)'
    button.addEventListener('click', this.handleToggleClick)

    const icon = document.createElement('span')
    icon.className = 'typora-readonly-toggle-icon'

    const text = document.createElement('span')
    text.className = 'typora-readonly-toggle-text'

    button.append(icon, text)

    document.body.appendChild(button)
    this.toggleButton = button
    this.toggleIcon = icon
    this.toggleText = text
    this.updateToggle()
  }

  updateToggle() {
    if (!this.toggleButton || !this.toggleIcon || !this.toggleText) {
      return
    }

    this.toggleButton.classList.toggle('is-on', this.enabled)
    this.toggleButton.setAttribute('aria-pressed', String(this.enabled))
    this.toggleButton.setAttribute('aria-label', this.enabled ? '只读模式已开启' : '只读模式已关闭')

    if (this.renderedToggleState === this.enabled) {
      return
    }

    this.toggleIcon.innerHTML = this.enabled ? READONLY_ICON : EDIT_ICON
    this.toggleText.textContent = this.enabled ? '只读' : '编辑'
    this.renderedToggleState = this.enabled
  }

  removeToggle() {
    if (!this.toggleButton) {
      return
    }

    this.toggleButton.removeEventListener('click', this.handleToggleClick)
    this.toggleButton.remove()
    this.toggleButton = undefined
    this.toggleIcon = undefined
    this.toggleText = undefined
    this.renderedToggleState = undefined
  }

  showToast(message) {
    this.removeToast()

    const toast = document.createElement('div')
    toast.className = 'typora-readonly-toast'
    toast.textContent = message
    document.body.appendChild(toast)
    this.toast = toast

    requestAnimationFrame(() => {
      toast.classList.add('is-visible')
    })

    this.toastTimer = window.setTimeout(() => {
      this.removeToast()
    }, 1600)
  }

  removeToast() {
    if (this.toastTimer) {
      window.clearTimeout(this.toastTimer)
      this.toastTimer = 0
    }

    this.toast?.remove()
    this.toast = undefined
  }
}
