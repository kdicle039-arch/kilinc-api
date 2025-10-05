import './style.css'

// Use production backend by default; allow override via Vite env
const API_BASE = import.meta.env.VITE_API_BASE || 'https://kilinc-api-backend.onrender.com'

function formatUSD(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
}

function StarRating({ rating }) {
  const stars = Array.from({ length: 5 }, (_, i) => i + 1)
  return `<div class="stars" aria-label="Rating ${rating} out of 5">${stars.map(s => (s <= Math.round(rating) ? '★' : '☆')).join('')}</div>`
}

function ProductCard(item, color, setColor) {
  const img = (item.images && item.images[color]) || item.image
  const materialLabel = color === 'yellow' ? 'Yellow Gold' : (color === 'white' ? 'White Gold' : 'Rose Gold')
  return `
    <div class="card" role="group" aria-label="${item.name}">
      <img class="card-img" src="${img}" alt="${item.name} - ${color} gold" />
      <div class="card-title">${item.name}</div>
      <div class="card-price">${formatUSD(item.priceUSD)}</div>
      <div class="material"><span class="badge" aria-label="${materialLabel}"><span class="badge-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" focusable="false"><path d="M12 17.27L18.18 21 16.54 13.97 22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg></span><span class="badge-text">${materialLabel}</span></span></div>
      <div class="colors" aria-label="Choose gold color" tabindex="0">
        <button class="color-dot color-yellow ${color === 'yellow' ? 'selected' : ''}" aria-label="Yellow Gold" data-color="yellow" ${color === 'yellow' ? 'aria-current="true"' : ''}></button>
        <button class="color-dot color-white ${color === 'white' ? 'selected' : ''}" aria-label="White Gold" data-color="white" ${color === 'white' ? 'aria-current="true"' : ''}></button>
        <button class="color-dot color-rose ${color === 'rose' ? 'selected' : ''}" aria-label="Rose Gold" data-color="rose" ${color === 'rose' ? 'aria-current="true"' : ''}></button>
      </div>
      ${StarRating({ rating: item.rating })}
    </div>
  `
}

function SkeletonGrid(count = 4) {
  return `
    <div class="carousel">
      <div class="carousel-viewport">
        <div class="carousel-track">
          ${Array.from({ length: count }).map(() => `
            <div class="slide skeleton">
              <div class="card">
                <div class="skel-block skel-img"></div>
                <div class="skel-block skel-title"></div>
                <div class="skel-block skel-price"></div>
                <div class="skel-dots">
                  <div class="skel-block skel-dot"></div>
                  <div class="skel-block skel-dot"></div>
                  <div class="skel-block skel-dot"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `
}

async function fetchProductsWithParams(params) {
  const query = new URLSearchParams(params)
  const res = await fetch(`${API_BASE}/api/products?${query.toString()}`)
  if (!res.ok) throw new Error('Failed to fetch products')
  const data = await res.json()
  return data.items
}

function render(items, color, params = {}) {
  const container = document.querySelector('#app')
  const currentParams = { color, ...params }

  container.innerHTML = `
    <div class="page">
      <h1 class="page-title">Product List</h1>
      <div class="sr-live sr-only" aria-live="polite" aria-atomic="true"></div>

      <div class="controls">
        <div class="control">
          <label>Min Price</label>
          <input type="number" step="0.01" name="minPrice" placeholder="e.g. 100" />
        </div>
        <div class="control">
          <label>Max Price</label>
          <input type="number" step="0.01" name="maxPrice" placeholder="e.g. 2000" />
        </div>
        <div class="control">
          <label>Min Popularity</label>
          <input type="number" step="0.1" max="1" min="0" name="minPopularity" placeholder="0-1" />
        </div>
        <div class="control">
          <label>Max Popularity</label>
          <input type="number" step="0.1" max="1" min="0" name="maxPopularity" placeholder="0-1" />
        </div>
        <div class="control">
          <label>Sort</label>
          <select name="sort">
            <option value="">None</option>
            <option value="price">Price</option>
            <option value="popularity">Popularity</option>
            <option value="weight">Weight</option>
            <option value="name">Name</option>
          </select>
        </div>
        <div class="control">
          <label>Order</label>
          <select name="order">
            <option value="asc">Asc</option>
            <option value="desc">Desc</option>
          </select>
        </div>
        <button class="apply-btn">Apply</button>
      </div>

      <div class="carousel">
        <button class="autoplay-toggle" aria-pressed="true" aria-label="Toggle autoplay">Autoplay</button>
        <button class="arrow left" aria-label="Previous">‹</button>
        <div class="carousel-viewport" tabindex="0" aria-roledescription="carousel">
          <div class="carousel-track">
            ${items.map(item => `<div class="slide">${ProductCard(item, color)}</div>`).join('')}
          </div>
        </div>
        <button class="arrow right" aria-label="Next">›</button>
      </div>
    </div>
  `

  // initialize controls with current params
  const formVals = ['minPrice','maxPrice','minPopularity','maxPopularity','sort','order']
  formVals.forEach(k => {
    const el = container.querySelector(`[name="${k}"]`)
    if (!el) return
    const v = currentParams[k]
    if (v !== undefined && v !== null && v !== '') {
      el.value = v
    }
  })

  // apply filters
  container.querySelector('.apply-btn').addEventListener('click', async () => {
    // show skeleton during refetch
    const viewport = container.querySelector('.carousel-viewport')
    viewport.innerHTML = SkeletonGrid(4)

    const params = {}
    formVals.forEach(k => {
      const el = container.querySelector(`[name="${k}"]`)
      if (!el) return
      const val = el.value
      if (val !== '') params[k] = val
    })

    try {
      const items = await fetchProductsWithParams({ color, ...params })
      render(items, color, params)
    } catch (e) {
      viewport.innerHTML = '<div class="error-banner">Failed to load products.</div>'
      console.error(e)
    }
  })

  // bind color change
  container.querySelectorAll('.color-dot').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const newColor = e.currentTarget.getAttribute('data-color')
      const viewport = container.querySelector('.carousel-viewport')
      viewport.innerHTML = SkeletonGrid(4)
      try {
        const items = await fetchProductsWithParams({ ...currentParams, color: newColor })
        render(items, newColor, currentParams)
      } catch (err) {
        viewport.innerHTML = '<div class="error-banner">Failed to load products.</div>'
        console.error(err)
      }
    })
  })

  // keyboard navigation for color dots
  container.querySelectorAll('.colors').forEach(group => {
    const dots = Array.from(group.querySelectorAll('.color-dot'))
    group.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault()
        let idx = dots.indexOf(document.activeElement)
        if (idx < 0) idx = 0
        const next = e.key === 'ArrowRight' ? Math.min(idx + 1, dots.length - 1) : Math.max(idx - 1, 0)
        dots[next].focus()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        const el = document.activeElement
        if (el && el.classList.contains('color-dot')) el.click()
      }
    })
  })

  // Carousel behaviors
  const viewport = container.querySelector('.carousel-viewport')
  const track = container.querySelector('.carousel-track')
  const slides = Array.from(container.querySelectorAll('.slide'))
  const btnPrev = container.querySelector('.arrow.left')
  const btnNext = container.querySelector('.arrow.right')
  const srLive = container.querySelector('.sr-live')
  const btnAutoplay = container.querySelector('.autoplay-toggle')
  let autoplayEnabled = true
  let autoplayId = null
  let autoplayPauseTimeout = null

  function slidesPerView() {
    const w = viewport.clientWidth
    if (w >= 1024) return 4
    if (w >= 640) return 2
    return 1
  }
  function updateArrowState() {
    const maxScroll = track.scrollWidth - viewport.clientWidth
    const x = viewport.scrollLeft
    btnPrev.classList.toggle('disabled', x <= 0)
    btnNext.classList.toggle('disabled', x >= maxScroll - 1)
    const spv = slidesPerView()
    const oneSlideWidth = track.scrollWidth / slides.length
    const totalGroups = Math.max(1, Math.ceil(slides.length / spv))
    const currentGroup = Math.min(Math.max(1, Math.round(x / (oneSlideWidth * spv)) + 1), totalGroups)
    if (srLive) {
      srLive.textContent = `Showing group ${currentGroup} of ${totalGroups}`
    }
  }
  function scrollBySlides(delta) {
    const spv = slidesPerView()
    const oneSlideWidth = track.scrollWidth / slides.length
    const amount = oneSlideWidth * spv
    viewport.scrollBy({ left: delta * amount, behavior: 'smooth' })
  }
  // Autoplay helpers
  function startAutoplay() {
    if (!autoplayEnabled || autoplayId) return
    autoplayId = setInterval(() => {
      const maxScroll = track.scrollWidth - viewport.clientWidth
      const x = viewport.scrollLeft
      const spv = slidesPerView()
      const oneSlideWidth = track.scrollWidth / slides.length
      if (x >= maxScroll - 1) {
        viewport.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        viewport.scrollBy({ left: oneSlideWidth * spv, behavior: 'smooth' })
      }
    }, 3000)
  }
  function stopAutoplay() {
    if (autoplayId) { clearInterval(autoplayId); autoplayId = null }
  }
  function scheduleResume() {
    stopAutoplay()
    if (autoplayPauseTimeout) clearTimeout(autoplayPauseTimeout)
    if (autoplayEnabled) {
      autoplayPauseTimeout = setTimeout(() => startAutoplay(), 6000)
    }
  }
  btnPrev.addEventListener('click', () => { scrollBySlides(-1); scheduleResume() })
  btnNext.addEventListener('click', () => { scrollBySlides(1); scheduleResume() })
  viewport.addEventListener('scroll', updateArrowState, { passive: true })
  window.addEventListener('resize', updateArrowState)
  updateArrowState()
  if (srLive) { srLive.textContent = `${slides.length} products loaded.` }

  // Keyboard support
  viewport.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); scrollBySlides(-1) }
    if (e.key === 'ArrowRight') { e.preventDefault(); scrollBySlides(1) }
    scheduleResume()
  })

  // Swipe support
  let startX = 0, currentX = 0, isDown = false
  const threshold = 40
  const onStart = (x) => { isDown = true; startX = x; currentX = x; scheduleResume() }
  const onMove = (x) => { if (!isDown) return; currentX = x }
  const onEnd = () => {
    if (!isDown) return
    const diff = currentX - startX
    if (Math.abs(diff) > threshold) {
      diff < 0 ? scrollBySlides(1) : scrollBySlides(-1)
    }
    isDown = false
  }
  viewport.addEventListener('mousedown', (e) => onStart(e.clientX))
  viewport.addEventListener('mousemove', (e) => onMove(e.clientX))
  window.addEventListener('mouseup', onEnd)
  viewport.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true })
  viewport.addEventListener('touchmove', (e) => onMove(e.touches[0].clientX), { passive: true })
  viewport.addEventListener('touchend', onEnd)

  // Pause on hover/focus, resume on leave
  viewport.addEventListener('mouseenter', stopAutoplay)
  viewport.addEventListener('mouseleave', () => { if (autoplayEnabled) startAutoplay() })

  // Autoplay toggle button
  if (btnAutoplay) {
    btnAutoplay.addEventListener('click', () => {
      autoplayEnabled = !autoplayEnabled
      btnAutoplay.setAttribute('aria-pressed', String(autoplayEnabled))
      if (autoplayEnabled) startAutoplay(); else stopAutoplay()
    })
  }

  // Start autoplay initially
  startAutoplay()
}

async function bootstrap() {
  try {
    const container = document.querySelector('#app')
    container.innerHTML = `<div class="page"><h1 class="page-title">Product List</h1>${SkeletonGrid(4)}</div>`
    const items = await fetchProductsWithParams({ color: 'yellow' })
    render(items, 'yellow')
  } catch (e) {
    document.querySelector('#app').innerHTML = `<div class="page"><div class="error-banner">Failed to load products.</div></div>`
    console.error(e)
  }
}

bootstrap()
