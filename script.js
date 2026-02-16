const slides = Array.from(document.querySelectorAll("[data-slide]"));
const dotsContainer = document.querySelector("[data-dots]");
const prevButton = document.querySelector("[data-prev]");
const nextButton = document.querySelector("[data-next]");
const addButtons = Array.from(document.querySelectorAll("[data-add]"));
const cartCount = document.querySelector(".cart-count");
const cartDrawer = document.querySelector("[data-cart]");
const cartClose = document.querySelector("[data-cart-close]");
const cartButton = document.querySelector(".cart-button");
const toast = document.querySelector("[data-toast]");
const tabs = Array.from(document.querySelectorAll(".tab"));
const products = Array.from(document.querySelectorAll(".product"));
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const cartItemsContainer = document.querySelector("[data-cart-items]");
const cartSubtotal = document.querySelector("[data-cart-subtotal]");
const openCheckoutButton = document.querySelector("[data-open-checkout]");
const checkoutModal = document.querySelector("[data-checkout-modal]");
const checkoutClose = document.querySelector("[data-checkout-close]");
const checkoutForm = document.querySelector("[data-checkout-form]");
const checkoutStatus = document.querySelector("[data-checkout-status]");
const placeOrderButton = document.querySelector("[data-place-order]");
const checkoutSummaryItems = document.querySelector("[data-checkout-summary-items]");
const checkoutSummarySubtotal = document.querySelector("[data-checkout-summary-subtotal]");
const fulfillmentMethodSelect = document.querySelector("[data-fulfillment-method]");
const paymentMethodSelect = document.querySelector("[data-payment-method]");
const addressFields = document.querySelector("[data-address-fields]");
const addressInput = checkoutForm?.querySelector('input[name="address_line"]');
const cityInput = checkoutForm?.querySelector('input[name="city"]');
const pickupNote = document.querySelector("[data-pickup-note]");
const showGcashButton = document.querySelector("[data-show-gcash]");
const gcashModal = document.querySelector("[data-gcash-modal]");
const gcashCloseButton = document.querySelector("[data-gcash-close]");
const gcashQr = document.querySelector("[data-gcash-qr]");

const variantModal = document.querySelector("[data-variant-modal]");
const variantClose = document.querySelector("[data-variant-close]");
const variantForm = document.querySelector("[data-variant-form]");
const variantStatus = document.querySelector("[data-variant-status]");
const variantTitle = document.querySelector("[data-variant-title]");
const apparelOptions = document.querySelector("[data-apparel-options]");
const jewelryOptions = document.querySelector("[data-jewelry-options]");

const supabaseUrl = window.GGK_CONFIG?.supabaseUrl || "";
const supabaseAnonKey = window.GGK_CONFIG?.supabaseAnonKey || "";
const gcashQrUrl = window.GGK_CONFIG?.gcashQrUrl || "";
const supabaseClient =
  window.supabase && supabaseUrl && supabaseAnonKey
    ? window.supabase.createClient(supabaseUrl, supabaseAnonKey)
    : null;

if (gcashQrUrl && gcashQr) {
  gcashQr.src = gcashQrUrl;
}

let currentIndex = 0;
let autoPlay = null;
const cart = new Map();
let pendingProductButton = null;

const formatPHP = (value) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(value);

const buildDots = () => {
  dotsContainer.innerHTML = "";
  slides.forEach((_, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.addEventListener("click", () => setSlide(index));
    dotsContainer.appendChild(dot);
  });
};

const updateDots = () => {
  const dots = Array.from(dotsContainer.children);
  dots.forEach((dot, index) => {
    dot.classList.toggle("is-active", index === currentIndex);
  });
};

const setSlide = (index) => {
  slides[currentIndex].classList.remove("is-active");
  currentIndex = (index + slides.length) % slides.length;
  slides[currentIndex].classList.add("is-active");
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
  toast.classList.add("is-visible");
  setTimeout(() => toast.classList.remove("is-visible"), 2200);
};

const openCart = () => {
  cartDrawer.classList.add("is-open");
};

const closeCart = () => {
  cartDrawer.classList.remove("is-open");
};

const openVariantModal = (button) => {
  pendingProductButton = button;
  variantStatus.textContent = "";
  const productKind = button.dataset.productKind || "apparel";

  if (productKind === "jewelry") {
    variantTitle.textContent = "Select Jewelry Type";
    apparelOptions.hidden = true;
    jewelryOptions.hidden = false;
  } else {
    variantTitle.textContent = "Select Shirt Options";
    apparelOptions.hidden = false;
    jewelryOptions.hidden = true;
  }

  variantModal.classList.add("is-open");
  variantModal.setAttribute("aria-hidden", "false");
};

const closeVariantModal = () => {
  variantModal.classList.remove("is-open");
  variantModal.setAttribute("aria-hidden", "true");
  pendingProductButton = null;
};

const openCheckout = () => {
  renderCheckoutSummary();
  checkoutModal.classList.add("is-open");
  checkoutModal.setAttribute("aria-hidden", "false");
};

const closeCheckout = () => {
  checkoutModal.classList.remove("is-open");
  checkoutModal.setAttribute("aria-hidden", "true");
  checkoutStatus.textContent = "";
};

const openGcash = () => {
  gcashModal.classList.add("is-open");
  gcashModal.setAttribute("aria-hidden", "false");
};

const closeGcash = () => {
  gcashModal.classList.remove("is-open");
  gcashModal.setAttribute("aria-hidden", "true");
};

const getCartSummary = () => {
  let itemCount = 0;
  let subtotal = 0;
  for (const item of cart.values()) {
    itemCount += item.quantity;
    subtotal += item.price * item.quantity;
  }
  return { itemCount, subtotal };
};

const renderCart = () => {
  cartItemsContainer.innerHTML = "";
  const items = Array.from(cart.values());

  if (items.length === 0) {
    cartItemsContainer.innerHTML =
      '<p class="cart-empty">Items will appear here. Add something to start building your fit.</p>';
  } else {
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "cart-item";
      row.innerHTML = `
        <div>
          <div class="cart-item-name">${item.name}</div>
          <div class="cart-item-meta">${item.optionLabel}</div>
          <div class="cart-item-meta">${formatPHP(item.price)} x ${item.quantity}</div>
        </div>
        <div class="cart-item-actions">
          <button type="button" data-decrease="${item.key}" aria-label="Decrease quantity">-</button>
          <span>${item.quantity}</span>
          <button type="button" data-increase="${item.key}" aria-label="Increase quantity">+</button>
        </div>
      `;
      cartItemsContainer.appendChild(row);
    });
  }

  const { itemCount, subtotal } = getCartSummary();
  cartCount.textContent = itemCount;
  cartSubtotal.textContent = formatPHP(subtotal);
  openCheckoutButton.disabled = itemCount === 0;
  renderCheckoutSummary();
};

const renderCheckoutSummary = () => {
  if (!checkoutSummaryItems || !checkoutSummarySubtotal) {
    return;
  }

  checkoutSummaryItems.innerHTML = "";
  const items = Array.from(cart.values());

  if (items.length === 0) {
    checkoutSummaryItems.innerHTML = '<p class="checkout-summary-empty">No items yet.</p>';
  } else {
    items.forEach((item) => {
      const row = document.createElement("div");
      row.className = "checkout-summary-item";
      row.innerHTML = `
        <div>
          <div>${item.name}</div>
          <div class="checkout-summary-meta">${item.optionLabel} x ${item.quantity}</div>
        </div>
        <strong>${formatPHP(item.price * item.quantity)}</strong>
      `;
      checkoutSummaryItems.appendChild(row);
    });
  }

  const { subtotal } = getCartSummary();
  checkoutSummarySubtotal.textContent = formatPHP(subtotal);
};

const addVariantToCart = (button, shirtColor, shirtSize) => {
  const productId = button.dataset.productId;
  const productName = button.dataset.productName;
  const productPrice = Number(button.dataset.productPrice || "0");

  if (!productId || !productName || productPrice <= 0) {
    showToast("Product data is incomplete.");
    return;
  }

  const variantKey = `${productId}::${shirtColor}::${shirtSize}`;
  const existing = cart.get(variantKey);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.set(variantKey, {
      key: variantKey,
      id: productId,
      name: productName,
      shirtColor,
      shirtSize,
      itemType: null,
      optionLabel: `${shirtColor} / ${shirtSize}`,
      price: productPrice,
      quantity: 1,
    });
  }

  renderCart();
  openCart();
  showToast(`Added ${shirtColor} / ${shirtSize}`);
};

const addJewelryToCart = (button, jewelryType) => {
  const productId = button.dataset.productId;
  const productName = button.dataset.productName;
  const productPrice = jewelryType === "Necklace" ? 120 : 80;
  const variantKey = `${productId}::${jewelryType}`;

  if (!productId || !productName) {
    showToast("Product data is incomplete.");
    return;
  }

  const existing = cart.get(variantKey);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.set(variantKey, {
      key: variantKey,
      id: productId,
      name: productName,
      shirtColor: null,
      shirtSize: null,
      itemType: jewelryType,
      optionLabel: jewelryType,
      price: productPrice,
      quantity: 1,
    });
  }

  renderCart();
  openCart();
  showToast(`Added ${jewelryType}`);
};

const updateCartItemQuantity = (itemKey, change) => {
  const item = cart.get(itemKey);
  if (!item) {
    return;
  }
  item.quantity += change;
  if (item.quantity <= 0) {
    cart.delete(itemKey);
  }
  renderCart();
};

const setSubmittingState = (submitting) => {
  placeOrderButton.disabled = submitting;
  placeOrderButton.textContent = submitting ? "Placing Order..." : "Place Order";
};

const generateOrderId = () => {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  if (window.crypto && typeof window.crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  return `ggk-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
};

const setPaymentOptions = () => {
  const method = fulfillmentMethodSelect.value;
  const previous = paymentMethodSelect.value;

  paymentMethodSelect.innerHTML = "";

  if (method === "pickup") {
    paymentMethodSelect.add(new Option("Cash (Pickup Only)", "cash"));
    paymentMethodSelect.add(new Option("GCash", "gcash"));
    addressFields.hidden = true;
    pickupNote.hidden = false;
    addressInput.required = false;
    cityInput.required = false;
  } else {
    paymentMethodSelect.add(new Option("GCash", "gcash"));
    addressFields.hidden = false;
    pickupNote.hidden = true;
    addressInput.required = true;
    cityInput.required = true;
  }

  const hasPrev = Array.from(paymentMethodSelect.options).some((o) => o.value === previous);
  paymentMethodSelect.value = hasPrev ? previous : paymentMethodSelect.options[0].value;
  showGcashButton.hidden = paymentMethodSelect.value !== "gcash";

  if (method === "courier" && paymentMethodSelect.value === "gcash") {
    openGcash();
  }
};

const onPaymentChange = () => {
  const isGcash = paymentMethodSelect.value === "gcash";
  showGcashButton.hidden = !isGcash;
  if (isGcash) {
    openGcash();
  }
};

const placeOrder = async (event) => {
  event.preventDefault();

  if (!supabaseClient) {
    checkoutStatus.textContent = "Supabase is not configured. Update supabase.config.js first.";
    return;
  }

  const items = Array.from(cart.values());
  if (items.length === 0) {
    checkoutStatus.textContent = "Your cart is empty.";
    return;
  }

  const formData = new FormData(checkoutForm);
  const customerName = String(formData.get("customer_name") || "").trim();
  const customerEmail = String(formData.get("customer_email") || "").trim();
  const customerPhone = String(formData.get("customer_phone") || "").trim();
  const fulfillmentMethod = String(formData.get("fulfillment_method") || "").trim();
  const paymentMethod = String(formData.get("payment_method") || "").trim();
  const addressLine = String(formData.get("address_line") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const notes = String(formData.get("notes") || "").trim();

  if (!customerName || !customerEmail || !customerPhone || !fulfillmentMethod || !paymentMethod) {
    checkoutStatus.textContent = "Please complete all required fields.";
    return;
  }

  if (fulfillmentMethod === "courier" && (!addressLine || !city)) {
    checkoutStatus.textContent = "Address and city are required for courier delivery.";
    return;
  }

  const { subtotal } = getCartSummary();
  setSubmittingState(true);
  checkoutStatus.textContent = "Submitting order...";
  const orderId = generateOrderId();

  try {
    const { error: orderError } = await supabaseClient
      .from("orders")
      .insert({
        id: orderId,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        delivery_method: fulfillmentMethod,
        payment_method: paymentMethod,
        pickup_location:
          fulfillmentMethod === "pickup"
            ? "De La Salle University, 2401 Taft Ave, Malate, Manila"
            : null,
        address_line: fulfillmentMethod === "courier" ? addressLine : null,
        city: fulfillmentMethod === "courier" ? city : null,
        notes: notes || null,
        total_amount: subtotal,
        currency: "PHP",
        status: "pending",
      });

    if (orderError) {
      throw orderError;
    }

    const orderItemsPayload = items.map((item) => ({
      order_id: orderId,
      product_id: item.id,
      product_name: item.name,
      shirt_color: item.shirtColor,
      shirt_size: item.shirtSize,
      item_type: item.itemType,
      unit_price: item.price,
      quantity: item.quantity,
      line_total: item.price * item.quantity,
    }));

    const { error: orderItemsError } = await supabaseClient
      .from("order_items")
      .insert(orderItemsPayload);

    if (orderItemsError) {
      throw orderItemsError;
    }

    checkoutStatus.textContent = `Order placed. Reference: ${orderId}`;
    cart.clear();
    renderCart();
    checkoutForm.reset();
    setPaymentOptions();
    showToast("Order placed successfully");
    setTimeout(() => {
      closeCheckout();
      closeGcash();
    }, 1200);
  } catch (error) {
    checkoutStatus.textContent = error?.message || "Unable to place order. Please try again.";
  } finally {
    setSubmittingState(false);
  }
};

const filterProducts = (filter) => {
  products.forEach((product) => {
    const match = filter === "all" || product.dataset.category === filter;
    product.style.display = match ? "grid" : "none";
  });
};

buildDots();
updateDots();
startAutoPlay();
renderCart();
setPaymentOptions();

nextButton.addEventListener("click", () => {
  nextSlide();
  startAutoPlay();
});

prevButton.addEventListener("click", () => {
  prevSlide();
  startAutoPlay();
});

slides.forEach((slide) => {
  slide.addEventListener("mouseenter", stopAutoPlay);
  slide.addEventListener("mouseleave", startAutoPlay);
});

addButtons.forEach((button) => {
  button.addEventListener("click", () => openVariantModal(button));
});

variantForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!pendingProductButton) {
    variantStatus.textContent = "No product selected.";
    return;
  }

  const formData = new FormData(variantForm);
  const productKind = pendingProductButton.dataset.productKind || "apparel";

  if (productKind === "jewelry") {
    const jewelryType = String(formData.get("jewelry_type") || "").trim();
    if (!jewelryType) {
      variantStatus.textContent = "Please choose necklace or bracelet.";
      return;
    }
    addJewelryToCart(pendingProductButton, jewelryType);
  } else {
    const shirtColor = String(formData.get("shirt_color") || "").trim();
    const shirtSize = String(formData.get("shirt_size") || "").trim();
    if (!shirtColor || !shirtSize) {
      variantStatus.textContent = "Please choose color and size.";
      return;
    }
    addVariantToCart(pendingProductButton, shirtColor, shirtSize);
  }

  closeVariantModal();
});

variantClose.addEventListener("click", closeVariantModal);

cartItemsContainer.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) {
    return;
  }

  const increaseKey = target.dataset.increase;
  const decreaseKey = target.dataset.decrease;

  if (increaseKey) {
    updateCartItemQuantity(increaseKey, 1);
  }
  if (decreaseKey) {
    updateCartItemQuantity(decreaseKey, -1);
  }
});

cartButton.addEventListener("click", () => {
  cartDrawer.classList.toggle("is-open");
});

cartClose.addEventListener("click", closeCart);
openCheckoutButton.addEventListener("click", openCheckout);
checkoutClose.addEventListener("click", closeCheckout);
checkoutForm.addEventListener("submit", placeOrder);
fulfillmentMethodSelect.addEventListener("change", setPaymentOptions);
paymentMethodSelect.addEventListener("change", onPaymentChange);
showGcashButton.addEventListener("click", openGcash);
gcashCloseButton.addEventListener("click", closeGcash);

checkoutModal.addEventListener("click", (event) => {
  if (event.target === checkoutModal) {
    closeCheckout();
  }
});

variantModal.addEventListener("click", (event) => {
  if (event.target === variantModal) {
    closeVariantModal();
  }
});

gcashModal.addEventListener("click", (event) => {
  if (event.target === gcashModal) {
    closeGcash();
  }
});

menuToggle.addEventListener("click", () => {
  navLinks.classList.toggle("is-open");
});

navLinks.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => navLinks.classList.remove("is-open"));
});

for (const tab of tabs) {
  tab.addEventListener("click", () => {
    tabs.forEach((item) => item.classList.remove("is-active"));
    tab.classList.add("is-active");
    filterProducts(tab.dataset.filter);
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeCart();
    closeCheckout();
    closeVariantModal();
    closeGcash();
  }
});
