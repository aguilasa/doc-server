// MermaidViewer - Modal para visualização de diagramas
class MermaidViewer {
  constructor() {
    this.overlay = null
    this.container = null
    this.content = null
    this.svgWrapper = null
    this.zoomIndicator = null
    this.currentSvg = null
    
    this.scale = 1
    this.minScale = 0.1
    this.maxScale = 10
    this.translateX = 0
    this.translateY = 0
    
    this.isDragging = false
    this.startX = 0
    this.startY = 0
    this.lastTranslateX = 0
    this.lastTranslateY = 0
    
    this.isResizing = false
    this.resizeDirection = null
    this.isMovingModal = false
    this.modalStartX = 0
    this.modalStartY = 0
    this.modalStartLeft = 0
    this.modalStartTop = 0
    
    this.init()
  }
  
  init() {
    this.createOverlay()
    this.setupEventListeners()
    this.setupKeyboardShortcuts()
  }
  
  createOverlay() {
    // Criar overlay
    this.overlay = document.createElement('div')
    this.overlay.className = 'mermaid-viewer-overlay'
    
    // Criar container
    this.container = document.createElement('div')
    this.container.className = 'mermaid-viewer-container'
    
    // Criar header
    const header = document.createElement('div')
    header.className = 'mermaid-viewer-header'
    
    const title = document.createElement('div')
    title.className = 'mermaid-viewer-title'
    title.textContent = 'Diagrama Mermaid'
    
    const controls = document.createElement('div')
    controls.className = 'mermaid-viewer-controls'
    
    // Botões de controle
    const zoomInBtn = document.createElement('button')
    zoomInBtn.className = 'mermaid-viewer-btn'
    zoomInBtn.textContent = 'Zoom +'
    zoomInBtn.addEventListener('click', () => this.zoomIn())
    
    const zoomOutBtn = document.createElement('button')
    zoomOutBtn.className = 'mermaid-viewer-btn'
    zoomOutBtn.textContent = 'Zoom -'
    zoomOutBtn.addEventListener('click', () => this.zoomOut())
    
    const resetBtn = document.createElement('button')
    resetBtn.className = 'mermaid-viewer-btn'
    resetBtn.textContent = 'Resetar'
    resetBtn.addEventListener('click', () => this.resetView())
    
    const closeBtn = document.createElement('button')
    closeBtn.className = 'mermaid-viewer-close'
    closeBtn.textContent = 'Fechar'
    closeBtn.addEventListener('click', () => this.close())
    
    controls.appendChild(zoomInBtn)
    controls.appendChild(zoomOutBtn)
    controls.appendChild(resetBtn)
    controls.appendChild(closeBtn)
    
    header.appendChild(title)
    header.appendChild(controls)
    
    // Criar content
    this.content = document.createElement('div')
    this.content.className = 'mermaid-viewer-content'
    
    // Criar SVG wrapper
    this.svgWrapper = document.createElement('div')
    this.svgWrapper.className = 'mermaid-viewer-svg-wrapper'
    this.content.appendChild(this.svgWrapper)
    
    // Criar zoom indicator
    this.zoomIndicator = document.createElement('div')
    this.zoomIndicator.className = 'mermaid-viewer-zoom-indicator'
    this.zoomIndicator.textContent = '100%'
    this.content.appendChild(this.zoomIndicator)
    
    // Criar resize handles
    this.createResizeHandles()
    
    // Criar move handle
    const moveHandle = document.createElement('div')
    moveHandle.className = 'mermaid-viewer-move-handle'
    this.container.appendChild(moveHandle)
    
    // Montar estrutura
    this.container.appendChild(header)
    this.container.appendChild(this.content)
    this.overlay.appendChild(this.container)
    document.body.appendChild(this.overlay)
  }
  
  createResizeHandles() {
    const directions = ['nw', 'ne', 'sw', 'se']
    
    directions.forEach(direction => {
      const handle = document.createElement('div')
      handle.className = `mermaid-viewer-resize-handle ${direction}`
      handle.addEventListener('mousedown', (e) => this.startResize(e, direction))
      this.container.appendChild(handle)
    })
  }
  
  setupEventListeners() {
    // Eventos do overlay
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close()
      }
    })
    
    // Eventos do SVG wrapper
    this.svgWrapper.addEventListener('wheel', (e) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      this.zoom(delta)
    })
    
    this.svgWrapper.addEventListener('mousedown', (e) => {
      if (e.target === this.svgWrapper || e.target.tagName === 'svg') {
        this.startDrag(e)
      }
    })
    
    document.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        this.drag(e)
      } else if (this.isResizing) {
        this.resize(e)
      } else if (this.isMovingModal) {
        this.moveModal(e)
      }
    })
    
    document.addEventListener('mouseup', () => {
      this.isDragging = false
      this.isResizing = false
      this.isMovingModal = false
      this.svgWrapper.classList.remove('dragging')
    })
    
    // Eventos do move handle
    const moveHandle = this.container.querySelector('.mermaid-viewer-move-handle')
    moveHandle.addEventListener('mousedown', (e) => {
      this.startMoveModal(e)
    })
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (this.overlay.classList.contains('active')) {
        switch (e.key) {
          case 'Escape':
            this.close()
            break
          case '+':
          case '=':
            this.zoomIn()
            break
          case '-':
          case '_':
            this.zoomOut()
            break
          case '0':
            this.resetView()
            break
        }
      }
    })
  }
  
  open(svgElement, title = 'Diagrama Mermaid') {
    this.currentSvg = svgElement.cloneNode(true)
    this.svgWrapper.innerHTML = ''
    this.svgWrapper.appendChild(this.currentSvg)
    
    const titleElement = this.container.querySelector('.mermaid-viewer-title')
    titleElement.textContent = title
    
    this.resetView()
    this.overlay.classList.add('active')
  }
  
  close() {
    this.overlay.classList.remove('active')
  }
  
  zoom(delta) {
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale + delta))
    this.scale = newScale
    this.updateTransform()
  }
  
  zoomIn() {
    this.zoom(0.2)
  }
  
  zoomOut() {
    this.zoom(-0.2)
  }
  
  resetView() {
    this.scale = 1
    this.translateX = 0
    this.translateY = 0
    this.updateTransform()
    this.centerSvg()
  }
  
  startDrag(e) {
    this.isDragging = true
    this.startX = e.clientX
    this.startY = e.clientY
    this.lastTranslateX = this.translateX
    this.lastTranslateY = this.translateY
    this.svgWrapper.classList.add('dragging')
  }
  
  drag(e) {
    if (!this.isDragging) return
    
    const deltaX = e.clientX - this.startX
    const deltaY = e.clientY - this.startY
    
    this.translateX = this.lastTranslateX + deltaX
    this.translateY = this.lastTranslateY + deltaY
    
    this.updateTransform()
  }
  
  startResize(e, direction) {
    this.isResizing = true
    this.resizeDirection = direction
    this.startX = e.clientX
    this.startY = e.clientY
    this.startWidth = this.container.offsetWidth
    this.startHeight = this.container.offsetHeight
    this.startLeft = this.container.offsetLeft
    this.startTop = this.container.offsetTop
    e.preventDefault()
  }
  
  resize(e) {
    if (!this.isResizing) return
    
    const deltaX = e.clientX - this.startX
    const deltaY = e.clientY - this.startY
    
    let newWidth = this.startWidth
    let newHeight = this.startHeight
    let newLeft = this.startLeft
    let newTop = this.startTop
    
    switch (this.resizeDirection) {
      case 'nw':
        newWidth = this.startWidth - deltaX
        newHeight = this.startHeight - deltaY
        newLeft = this.startLeft + deltaX
        newTop = this.startTop + deltaY
        break
      case 'ne':
        newWidth = this.startWidth + deltaX
        newHeight = this.startHeight - deltaY
        newTop = this.startTop + deltaY
        break
      case 'sw':
        newWidth = this.startWidth - deltaX
        newHeight = this.startHeight + deltaY
        newLeft = this.startLeft + deltaX
        break
      case 'se':
        newWidth = this.startWidth + deltaX
        newHeight = this.startHeight + deltaY
        break
    }
    
    // Aplicar limites mínimos
    newWidth = Math.max(400, newWidth)
    newHeight = Math.max(300, newHeight)
    
    // Aplicar mudanças
    this.container.style.width = newWidth + 'px'
    this.container.style.height = newHeight + 'px'
    this.container.style.left = newLeft + 'px'
    this.container.style.top = newTop + 'px'
  }
  
  startMoveModal(e) {
    this.isMovingModal = true
    this.modalStartX = e.clientX
    this.modalStartY = e.clientY
    this.modalStartLeft = this.container.offsetLeft
    this.modalStartTop = this.container.offsetTop
    e.preventDefault()
  }
  
  moveModal(e) {
    if (!this.isMovingModal) return
    
    const deltaX = e.clientX - this.modalStartX
    const deltaY = e.clientY - this.modalStartY
    
    const newLeft = this.modalStartLeft + deltaX
    const newTop = this.modalStartTop + deltaY
    
    this.container.style.left = newLeft + 'px'
    this.container.style.top = newTop + 'px'
  }
  
  updateTransform() {
    if (this.currentSvg) {
      this.currentSvg.style.transform = `translate(${this.translateX}px, ${this.translateY}px) scale(${this.scale})`
      this.zoomIndicator.textContent = Math.round(this.scale * 100) + '%'
    }
  }
  
  centerSvg() {
    if (!this.currentSvg) return
    
    setTimeout(() => {
      const svgRect = this.currentSvg.getBoundingClientRect()
      const wrapperRect = this.svgWrapper.getBoundingClientRect()
      
      const centerX = (wrapperRect.width - svgRect.width) / 2
      const centerY = (wrapperRect.height - svgRect.height) / 2
      
      this.translateX = centerX
      this.translateY = centerY
      
      this.updateTransform()
    }, 100)
  }
  
  addViewerButton(svgElement) {
    // O botão é anexado ao container .mermaid (ancestral do <svg>), nunca ao
    // próprio svg — por isso a guarda tem que marcar o container. Guardar pelo
    // svg fazia a checagem nunca casar, e cada passagem empilhava mais um
    // botão e mais três listeners no mesmo diagrama.
    let container = svgElement.parentElement
    while (container && !container.classList.contains('mermaid')) {
      container = container.parentElement
    }
    if (!container || container.dataset.viewerButton === '1') return
    container.dataset.viewerButton = '1'

    const button = document.createElement('button')
    // Classe própria: '.mermaid-viewer-btn' é dos botões do header do modal.
    button.className = 'mermaid-viewer-open-btn'
    button.textContent = '🔍 Visualizar'
    button.style.cssText = `
      position: absolute;
      top: 10px;
      right: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      border-radius: 4px;
      padding: 6px 12px;
      font-size: 12px;
      cursor: pointer;
      z-index: 1000;
      opacity: 0;
      transition: opacity 0.2s;
    `
    
    container.style.position = 'relative'
    container.appendChild(button)

    // Mostrar botão no hover
    container.addEventListener('mouseenter', () => {
      button.style.opacity = '1'
    })

    container.addEventListener('mouseleave', () => {
      button.style.opacity = '0'
    })

    // Evento de clique
    button.addEventListener('click', () => {
      const title = document.querySelector('h1, h2, h3')
      const titleText = title ? title.textContent.trim() : 'Diagrama Mermaid'
      this.open(svgElement, titleText)
    })
  }
}

// Inicializar o viewer quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', () => {
  window.mermaidViewer = new MermaidViewer()

  function attachAll() {
    try {
      document.querySelectorAll('.mermaid svg').forEach(svg => {
        window.mermaidViewer.addViewerButton(svg)
      })
    } catch (err) {
      console.warn('[doc-server:mermaid-viewer]', err)
    }
  }

  // O mermaid renderiza os SVGs de forma assíncrona e o Docsify troca o
  // conteúdo a cada navegação — não existe um instante único em que dê para
  // varrer uma vez só. Um observer estrangulado cobre os dois casos, e como
  // addViewerButton é idempotente, repassar por diagramas já tratados é livre.
  let pending = null
  const observer = new MutationObserver(() => {
    if (pending) return
    pending = setTimeout(() => {
      pending = null
      attachAll()
    }, 100)
  })
  observer.observe(document.body, { childList: true, subtree: true })

  attachAll()
})
