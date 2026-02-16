const slides = Array.from(document.querySelectorAll('[data-slide]'));
const dotsContainer = document.querySelector('[data-dots]');
const prevButton = document.querySelector('[data-prev]');
const nextButton = document.querySelector('[data-next]');
const addButtons = Array.from(document.querySelectorAll('[data-add]'));
const cartCount = document.querySelector('.cart-count');
const cartDrawer = document.querySelector('[data-cart]');
const cartClose = document.querySelector('[data-cart-close]');
const cartButton = document.querySelector('.cart-button');
const toast = document.querySelector('[data-toast]');
const tabs = Array.from(document.querySelectorAll('.tab'));
const products = Array.from(document.querySelectorAll('.product'));
const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

let currentIndex = 0;
let cartTotal = 0;
let autoPlay = null;

const buildDots = () => {
  dotsContainer.innerHTML = '';
  slides.forEach((_, index) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.addEventListener('click', () => setSlide(index));
    dotsContainer.appendChild(dot);
  });
};

const updateDots = () => {
  const dots = Array.from(dotsContainer.children);
  dots.forEach((dot, index) => {
    dot.classList.toggle('is-active', index === currentIndex);
  });
};

const setSlide = (index) => {
  slides[currentIndex].classList.remove('is-active');
  currentIndex = (index + slides.length) % slides.length;
  slides[currentIndex].classList.add('is-active');
  updateDots();
};

const nextSlide = () => setSlide(currentIndex + 1);
const prevSlide = () => setSlide(currentIndex - 1);

const startAutoPlay = () => {
  stopAutoPlay();
  autoPlay = setInterval(nextSlide, 7000);
};

const stopAutoPlay = () => {
  if (autoPlay) {
    clearInterval(autoPlay);
  }
};

const showToast = (message) => {
  toast.textContent = message;
  toast.classList.add('is-visible');
  setTimeout(() => toast.classList.remove('is-visible'), 2200);
};

const updateCartCount = () => {
  cartCount.textContent = cartTotal;
};

const openCart = () => {
  cartDrawer.classList.add('is-open');
};

const closeCart = () => {
  cartDrawer.classList.remove('is-open');
};

const filterProducts = (filter) => {
  products.forEach((product) => {
    const match = filter === 'all' || product.dataset.category === filter;
    product.style.display = match ? 'grid' : 'none';
  });
};

buildDots();
updateDots();
startAutoPlay();

nextButton.addEventListener('click', () => {
  nextSlide();
  startAutoPlay();
});

prevButton.addEventListener('click', () => {
  prevSlide();
  startAutoPlay();
});

slides.forEach((slide) => {
  slide.addEventListener('mouseenter', stopAutoPlay);
  slide.addEventListener('mouseleave', startAutoPlay);
});

addButtons.forEach((button) => {
  button.addEventListener('click', () => {
    cartTotal += 1;
    updateCartCount();
    openCart();
    showToast('Added to bag');
  });
});

cartButton.addEventListener('click', () => {
  cartDrawer.classList.toggle('is-open');
});

cartClose.addEventListener('click', closeCart);

menuToggle.addEventListener('click', () => {
  navLinks.classList.toggle('is-open');
});

navLinks.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => navLinks.classList.remove('is-open'));
});

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    tabs.forEach((item) => item.classList.remove('is-active'));
    tab.classList.add('is-active');
    filterProducts(tab.dataset.filter);
  });
}

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeCart();
  }
});
