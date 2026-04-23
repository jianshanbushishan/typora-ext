const PANEL_SELECTOR = [
  '.md-diagram-panel-preview',
  '.md-diagram-panel',
  '.md-diagram',
  '.md-fences',
  '.mermaid',
  '[lang="mermaid"]',
  '[data-lang="mermaid"]',
  '[mdtype="fences"]',
].join(',')

const STARTUP_SCAN_DELAYS = [0, 250, 1000, 2500]
const ACTIVATION_SCAN_DELAYS = [0, 300, 1200]

export default class MermaidZoomPlugin {
  constructor() {
    this.observer = undefined
    this.activeClose = undefined
    this.scanFrame = 0
    this.pendingScanRoots = new Set()
    this.delayedScanTimers = new Set()
    this.handlePointerScan = (event) => this.queueScan(this.getEventScanRoot(event))
    this.handleActivationScan = (event) => {
      const root = this.getEventScanRoot(event)
      ACTIVATION_SCAN_DELAYS.forEach((delay) => this.scheduleScan(root, delay))
    }
  }

  load() {
    this.onload()
  }

  unload() {
    this.onunload()
  }

  onload() {
    console.info('[Mermaid Zoom] loaded')
    STARTUP_SCAN_DELAYS.forEach((delay) => this.scheduleScan(document.body, delay))
    document.addEventListener('mouseover', this.handlePointerScan, true)
    document.addEventListener('focusin', this.handleActivationScan, true)
    document.addEventListener('click', this.handleActivationScan, true)

    this.observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of Array.from(mutation.addedNodes)) {
          if (node instanceof Element) {
            this.queueScan(node)
          }
        }
      }
    })

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    })
  }

  onunload() {
    this.observer?.disconnect()
    this.activeClose?.()
    this.activeClose = undefined
    this.delayedScanTimers.forEach((timer) => clearTimeout(timer))
    this.delayedScanTimers.clear()
    this.pendingScanRoots.clear()
    if (this.scanFrame) {
      cancelAnimationFrame(this.scanFrame)
      this.scanFrame = 0
    }

    document.removeEventListener('mouseover', this.handlePointerScan, true)
    document.removeEventListener('focusin', this.handleActivationScan, true)
    document.removeEventListener('click', this.handleActivationScan, true)

    document.querySelectorAll('.mermaid-zoom-btn').forEach((button) => {
      button.remove()
    })

    document.querySelectorAll('[data-mermaid-zoom-bound="1"]').forEach((panel) => {
      panel.removeAttribute('data-mermaid-zoom-bound')
      panel.classList.remove('mermaid-zoom-host')
    })
  }

  getEventScanRoot(event) {
    const target = event.target
    if (!(target instanceof Element)) {
      return document.body
    }

    return target.closest('#write') ?? target
  }

  scheduleScan(root, delay) {
    if (!delay) {
      this.queueScan(root)
      return
    }

    const timer = setTimeout(() => {
      this.delayedScanTimers.delete(timer)
      this.queueScan(root)
    }, delay)
    this.delayedScanTimers.add(timer)
  }

  queueScan(root) {
    if (!root) {
      return
    }

    this.pendingScanRoots.add(root)
    if (this.scanFrame) {
      return
    }

    this.scanFrame = requestAnimationFrame(() => {
      const roots = Array.from(this.pendingScanRoots)
      this.pendingScanRoots.clear()
      this.scanFrame = 0
      roots.forEach((scanRoot) => this.scan(scanRoot))
    })
  }

  scan(root) {
    const candidates = new Set()

    if (root instanceof Element && root.matches(PANEL_SELECTOR)) {
      candidates.add(root)
    }

    root.querySelectorAll?.(PANEL_SELECTOR).forEach((candidate) => {
      candidates.add(candidate)
    })

    const svgRoot = root instanceof SVGSVGElement ? [root] : []
    const svgCandidates = [
      ...svgRoot,
      ...Array.from(root.querySelectorAll?.('svg') ?? []),
    ]

    for (const svg of svgCandidates) {
      if (this.isMermaidSvg(svg)) {
        const host = this.findHostForSvg(svg)
        if (host) {
          candidates.add(host)
        }
      }
    }

    for (const candidate of candidates) {
      if (candidate instanceof HTMLElement) {
        this.bindPanel(candidate)
      }
    }
  }

  isMermaidSvg(svg) {
    if (svg.closest('.mermaid-zoom-overlay')) {
      return false
    }

    const id = svg.getAttribute('id') ?? ''
    const label = svg.getAttribute('aria-roledescription') ?? ''
    const parent = svg.closest(PANEL_SELECTOR)

    return Boolean(
      parent
        || id.toLowerCase().includes('mermaid')
        || label.toLowerCase().includes('mermaid')
        || svg.querySelector('.node, .edgePath, .cluster, .flowchart-link, .messageText, .actor, .loopLine, .er, .pieTitle'),
    )
  }

  findHostForSvg(svg) {
    const knownHost = svg.closest(PANEL_SELECTOR)
    if (knownHost instanceof HTMLElement) {
      return knownHost
    }

    return svg.parentElement
  }

  bindPanel(panel) {
    if (panel.dataset.mermaidZoomBound === '1' || panel.closest('.mermaid-zoom-overlay')) {
      return
    }

    const svg = panel.querySelector('svg')
    if (!svg) {
      return
    }

    panel.dataset.mermaidZoomBound = '1'
    panel.classList.add('mermaid-zoom-host')

    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'mermaid-zoom-btn'
    button.dataset.tooltip = '放大查看 Mermaid 图'
    button.setAttribute('aria-label', '放大查看 Mermaid 图')
    button.innerHTML = '<span aria-hidden="true">⤢</span>'
    button.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()

      const latestSvg = panel.querySelector('svg')
      if (latestSvg) {
        this.openLightbox(latestSvg)
      }
    })

    panel.appendChild(button)
  }

  openLightbox(sourceSvg) {
    this.activeClose?.()

    const overlay = document.createElement('div')
    overlay.className = 'mermaid-zoom-overlay'

    const dialog = document.createElement('div')
    dialog.className = 'mermaid-zoom-dialog'
    dialog.setAttribute('role', 'dialog')
    dialog.setAttribute('aria-modal', 'true')
    dialog.setAttribute('aria-label', 'Mermaid 放大预览')

    const toolbar = document.createElement('div')
    toolbar.className = 'mermaid-zoom-toolbar'

    const hint = document.createElement('div')
    hint.className = 'mermaid-zoom-hint'
    hint.textContent = '滚轮缩放，拖拽移动，Esc 关闭'

    const resetButton = document.createElement('button')
    resetButton.type = 'button'
    resetButton.className = 'mermaid-zoom-toolbar-btn'
    resetButton.dataset.tooltip = '重置'
    resetButton.setAttribute('aria-label', '重置')
    resetButton.innerHTML = '<span aria-hidden="true">↺</span>'

    const closeButton = document.createElement('button')
    closeButton.type = 'button'
    closeButton.className = 'mermaid-zoom-toolbar-btn'
    closeButton.dataset.tooltip = '关闭'
    closeButton.setAttribute('aria-label', '关闭')
    closeButton.innerHTML = '<span aria-hidden="true">×</span>'

    const viewport = document.createElement('div')
    viewport.className = 'mermaid-zoom-viewport'

    const content = document.createElement('div')
    content.className = 'mermaid-zoom-content'

    const clonedSvg = sourceSvg.cloneNode(true)
    clonedSvg.removeAttribute('style')
    clonedSvg.classList.add('mermaid-zoom-svg')

    const sourceRect = sourceSvg.getBoundingClientRect()
    const sourceWidth = readSvgLength(sourceSvg, 'width')
    const sourceHeight = readSvgLength(sourceSvg, 'height')
    const baseWidth = Math.max(sourceRect.width, sourceWidth, 1)
    const baseHeight = Math.max(sourceRect.height, sourceHeight, 1)

    if (!clonedSvg.getAttribute('viewBox')) {
      clonedSvg.setAttribute('viewBox', `0 0 ${baseWidth} ${baseHeight}`)
    }

    let scale = 1
    let x = 0
    let y = 0
    let isDragging = false
    let lastX = 0
    let lastY = 0

    const render = () => {
      clonedSvg.style.width = `${Math.max(1, baseWidth * scale)}px`
      clonedSvg.style.height = `${Math.max(1, baseHeight * scale)}px`
      content.style.left = `${x}px`
      content.style.top = `${y}px`
    }

    const resetView = () => {
      const fitScale = Math.min(
        1,
        Math.max(0.1, (viewport.clientWidth - 64) / (baseWidth + 48)),
        Math.max(0.1, (viewport.clientHeight - 64) / (baseHeight + 48)),
      )

      scale = fitScale
      x = Math.max(24, (viewport.clientWidth - (baseWidth * scale + 48)) / 2)
      y = Math.max(24, (viewport.clientHeight - (baseHeight * scale + 48)) / 2)
      render()
    }

    const close = () => {
      window.removeEventListener('keydown', onKeydown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      overlay.remove()
      if (this.activeClose === close) {
        this.activeClose = undefined
      }
    }

    const onKeydown = (event) => {
      if (event.key === 'Escape') {
        close()
      }
    }

    const onPointerMove = (event) => {
      if (!isDragging) {
        return
      }

      x += event.clientX - lastX
      y += event.clientY - lastY
      lastX = event.clientX
      lastY = event.clientY
      render()
    }

    const onPointerUp = () => {
      isDragging = false
      viewport.classList.remove('is-dragging')
    }

    viewport.addEventListener('wheel', (event) => {
      event.preventDefault()

      const rect = viewport.getBoundingClientRect()
      const localX = event.clientX - rect.left
      const localY = event.clientY - rect.top
      const beforeX = (localX - x - 24) / scale
      const beforeY = (localY - y - 24) / scale
      const nextScale = clamp(scale * (event.deltaY < 0 ? 1.12 : 0.88), 0.1, 8)

      scale = nextScale
      x = localX - 24 - beforeX * scale
      y = localY - 24 - beforeY * scale
      render()
    }, { passive: false })

    viewport.addEventListener('pointerdown', (event) => {
      isDragging = true
      lastX = event.clientX
      lastY = event.clientY
      viewport.classList.add('is-dragging')
      viewport.setPointerCapture(event.pointerId)
    })

    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) {
        close()
      }
    })

    closeButton.addEventListener('click', close)
    resetButton.addEventListener('click', resetView)
    window.addEventListener('keydown', onKeydown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    content.appendChild(clonedSvg)
    viewport.appendChild(content)
    toolbar.append(hint, resetButton, closeButton)
    dialog.append(toolbar, viewport)
    overlay.appendChild(dialog)
    document.body.appendChild(overlay)

    this.activeClose = close
    requestAnimationFrame(resetView)
  }
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function readSvgLength(svg, name) {
  const value = svg.getAttribute(name)
  if (!value) {
    return 0
  }

  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}
