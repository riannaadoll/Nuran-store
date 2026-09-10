// IndexedDB bazasini va 'cart' jadvalini yaratamiz (faqat savat uchun, qurilmada lokal)
const db = new Dexie("NuranStoreDB");

db.version(1).stores({
  cart: 'id, productId, name, price, image, size, color, qty' // 'id' bu yerda asosiy kalit
});

// FIREBASE: umumiy (barcha qurilmalarda ko'rinadigan) ma'lumotlar bazasi va admin login
const firestoreDB = firebase.firestore();
const auth = firebase.auth();

const STORAGE_KEYS = {
  THEME: 'nuran_theme',
  CUSTOMER_PROFILE: 'nuran_customer_profile'
};

const defaultCategories = ["Ro'mollar", "Kiyimlar", "Aksessuarlar"];

// BTS POCHTA PUNKT LARI BAZASI
const BTS_DATA = {
  "Toshkent shahri": [
    { name: "BTS Bosh Ofis (Yakkasaroy)", address: "Shota Rustaveli ko'chasi, 53B", lat: 41.2858, lng: 69.2562 },
    { name: "BTS Chilonzor filiali", address: "Chilonzor kvartal 9, 15", lat: 41.2780, lng: 69.2050 },
    { name: "BTS Yunusobod filiali", address: "Yunusobod 11-dahshat, 22", lat: 41.3650, lng: 69.2880 },
    { name: "BTS Sergeli filiali", address: "Sergeli 4, 12", lat: 41.2220, lng: 69.2210 }
  ],
  "Toshkent viloyati": [
    { name: "BTS Chirchiq filiali", address: "Chirchiq sh., Navoiy ko'chasi 10", lat: 41.4688, lng: 69.5822 },
    { name: "BTSOlmaliq filiali", address: "Olmaliq sh., M.Ulug'bek ko'chasi 4", lat: 40.8441, lng: 69.5986 },
    { name: "BTS Angren filiali", address: "Angren sh., Tinchlik k., 5", lat: 41.0167, lng: 70.1436 }
  ],
  "Samarqand viloyati": [
    { name: "BTS Samarqand Markaz", address: "Samarqand sh., Dagbitskaya 34", lat: 39.6542, lng: 66.9597 },
    { name: "BTS Kattaqo'rg'on filiali", address: "Kattaqo'rg'on sh., A.Navoiy 12", lat: 39.8981, lng: 66.2583 }
  ],
  "Farg'ona viloyati": [
    { name: "BTS Farg'ona Markaz", address: "Farg'ona sh., Al-Farg'oniy 88", lat: 40.3842, lng: 71.7843 },
    { name: "BTS Qo'qon filiali", address: "Qo'qon sh., Istiklol 45", lat: 40.5372, lng: 70.9333 },
    { name: "BTS Marg'ilon filiali", address: "Marg'ilon sh., B.Marg'iloniy 12", lat: 40.4722, lng: 71.7142 }
  ],
  "Andijon viloyati": [
    { name: "BTS Andijon Markaz", address: "Andijon sh., Amir Temur ko'chasi 20", lat: 40.7821, lng: 72.3442 },
    { name: "BTS Asaka filiali", address: "Asaka sh., Toshkent ko'chasi 5", lat: 40.6415, lng: 72.2381 }
  ],
  "Namangan viloyati": [
    { name: "BTS Namangan Markaz", address: "Namangan sh., Kosonsoy ko'chasi 14", lat: 41.0011, lng: 71.6683 }
  ],
  "Buxoro viloyati": [
    { name: "BTS Buxoro Markaz", address: "Buxoro sh., M.Iqbol 11", lat: 39.7681, lng: 64.4556 }
  ],
  "Xorazm viloyati": [
    { name: "BTS Urganch Markaz", address: "Urganch sh., Al-Xorazmiy 50", lat: 41.5503, lng: 60.6315 }
  ],
  "Qashqadaryo viloyati": [
    { name: "BTS Qarshi Markaz", address: "Qarshi sh., Islom Karimov 77", lat: 38.8358, lng: 65.7894 }
  ],
  "Surxondaryo viloyati": [
    { name: "BTS Termiz Markaz", address: "Termiz sh., At-Termiziy 19", lat: 37.2242, lng: 67.2783 }
  ],
  "Navoiy viloyati": [
    { name: "BTS Navoiy Markaz", address: "Navoiy sh., Mezar 8", lat: 40.1031, lng: 65.3688 }
  ],
  "Jizzax viloyati": [
    { name: "BTS Jizzax Markaz", address: "Jizzax sh., Sh.Rashidov 42", lat: 40.1158, lng: 67.8422 }
  ],
  "Sirdaryo viloyati": [
    { name: "BTS Guliston Markaz", address: "Guliston sh., O'zbekiston k. 15", lat: 40.4897, lng: 68.7842 }
  ],
  "Qoraqalpog'iston Resp.": [
    { name: "BTS Nukus Markaz", address: "Nukus sh., A.Dosnazarov 33", lat: 42.4611, lng: 59.6166 }
  ]
};

const initialProducts = [
  {
    id: 1,
    name: "Ipak Ro'mol",
    category: "Ro'mollar",
    price: 180000,
    stock: 15,
    sizes: ["Standart"],
    colors: ["Oq", "Qora"],
    images: ["images/logo.jpg"],
    description: "Yumshoq va yuqori sifatli ipak matodan tayyorlangan milliy va zamonaviy ro'mol."
  }
];

let categories = [...defaultCategories];
let products = [];
let orders = [];
let reviews = [];
let customerProfile = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOMER_PROFILE)) || { name: '', phone: '', photo: '' };
let cardDetails = {
  number: "8600 0000 0000 0000",
  holder: "YUSUPOVA MUHLISA",
  bank: "KAPITAL BANK"
};

let isAdmin = false;
let currentCategory = "all";
let selectedProductForModal = null;
let selectedSize = null;
let selectedColor = null;

let btsMap = null;
let mapMarkers = [];
let tempSelectedPoint = null;
let categoriesSeeded = false;

// Har bir qurilma/brauzer uchun bir martalik, tasodifiy ID — mijoz faqat
// O'ZI shu qurilmadan bergan buyurtmalarni ko'rishi uchun ishlatiladi.
// (Bu login emas, shunchaki "bu buyurtmani KIM berdi" degan ichki belgi.)
function getDeviceId() {
  let deviceId = localStorage.getItem('nuran_device_id');
  if (!deviceId) {
    deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2);
    localStorage.setItem('nuran_device_id', deviceId);
  }
  return deviceId;
}

// FIRESTORE: barcha qurilmalarda umumiy bo'lgan ma'lumotlarni jonli (real-time) tinglash
function initFirestoreListeners() {
  firestoreDB.collection('categories').onSnapshot(snap => {
    if (snap.empty && !categoriesSeeded) {
      categoriesSeeded = true;
      defaultCategories.forEach(name => firestoreDB.collection('categories').add({ name }));
      return;
    }
    if (!snap.empty) {
      categories = snap.docs.map(d => d.data().name);
      renderCategoriesUI();
    }
  }, err => console.error('Categories xatosi:', err));

  firestoreDB.collection('products').onSnapshot(snap => {
    products = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderProducts();
    updateStockDashboard();
  }, err => console.error('Products xatosi:', err));

  firestoreDB.collection('orders').onSnapshot(snap => {
    orders = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
  }, err => console.error('Orders xatosi:', err));

  firestoreDB.collection('reviews').onSnapshot(snap => {
    reviews = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }, err => console.error('Reviews xatosi:', err));

  firestoreDB.collection('settings').doc('card').onSnapshot(docSnap => {
    if (docSnap.exists) {
      cardDetails = docSnap.data();
      loadCardDetails();
    }
  }, err => console.error('Card xatosi:', err));
}

// ADMIN: brauzerda avval (localStorage'da) qo'shilgan eski ma'lumotlarni
// Firebase'ga bir martalik ko'chirish uchun yordamchi funksiya.
async function migrateOldLocalData() {
  const oldProducts = JSON.parse(localStorage.getItem('nuran_products')) || [];
  const oldCategories = JSON.parse(localStorage.getItem('nuran_categories')) || [];
  const oldOrders = JSON.parse(localStorage.getItem('nuran_orders')) || [];
  const oldReviews = JSON.parse(localStorage.getItem('nuran_reviews')) || [];
  const oldCard = JSON.parse(localStorage.getItem('nuran_card'));

  if (!oldProducts.length && !oldCategories.length && !oldOrders.length && !oldReviews.length && !oldCard) {
    alert("Ko'chirish uchun eski ma'lumot topilmadi (bu brauzerda avval hech narsa qo'shilmagan, yoki avval muvaffaqiyatli ko'chirilgan).");
    return;
  }

  if (!confirm("Eski (shu brauzerdagi) ma'lumotlarni Firebase'ga ko'chirmoqchimisiz?")) return;

  // undefined qiymatlarni olib tashlaydi (Firestore ularni qabul qilmaydi)
  const clean = (obj) => JSON.parse(JSON.stringify(obj));

  let okCount = 0;
  const failed = [];

  // Kategoriyalar (avval qisman ko'chirilgan bo'lsa, takrorlanmasligi uchun tekshiriladi)
  for (const cat of oldCategories) {
    if (categories.includes(cat)) continue; // allaqachon bor
    try {
      await firestoreDB.collection('categories').add({ name: cat });
      okCount++;
    } catch (err) {
      failed.push(`Kategoriya "${cat}": ${err.message}`);
      console.error('Kategoriya xatosi:', cat, err);
    }
  }

  for (const p of oldProducts) {
    try {
      const { id, ...data } = p;
      await firestoreDB.collection('products').add(clean({ ...data, createdAtMs: Date.now() }));
      okCount++;
    } catch (err) {
      failed.push(`Mahsulot "${p.name || p.id}": ${err.message}`);
      console.error('Mahsulot xatosi:', p.name, err);
    }
  }

  for (const o of oldOrders) {
    try {
      const { id, ...data } = o;
      await firestoreDB.collection('orders').add(clean({ ...data, createdAtMs: Date.now() }));
      okCount++;
    } catch (err) {
      failed.push(`Buyurtma "${o.btsCode || o.id}": ${err.message}`);
      console.error('Buyurtma xatosi:', o.btsCode, err);
    }
  }

  for (const r of oldReviews) {
    try {
      const { id, ...data } = r;
      await firestoreDB.collection('reviews').add(clean(data));
      okCount++;
    } catch (err) {
      failed.push(`Sharh: ${err.message}`);
      console.error('Sharh xatosi:', err);
    }
  }

  if (oldCard) {
    try {
      await firestoreDB.collection('settings').doc('card').set(clean(oldCard));
      okCount++;
    } catch (err) {
      failed.push(`Karta ma'lumoti: ${err.message}`);
      console.error('Karta xatosi:', err);
    }
  }

  if (failed.length === 0) {
    localStorage.removeItem('nuran_products');
    localStorage.removeItem('nuran_categories');
    localStorage.removeItem('nuran_orders');
    localStorage.removeItem('nuran_reviews');
    localStorage.removeItem('nuran_card');
    localStorage.removeItem('nuran_is_admin');
    alert(`Ko'chirish tugadi! ${okCount} ta yozuv muvaffaqiyatli ko'chirildi.`);
  } else {
    console.error('Ko\'chirilmagan yozuvlar:', failed);
    alert(
      `Qisman ko'chirildi: ${okCount} ta muvaffaqiyatli, ${failed.length} ta xato.\n\n` +
      `Xato tafsilotlari brauzer konsolida (F12 > Console).\n\n` +
      `Eski ma'lumotlar hali brauzeringizda saqlanmoqda — muammoni tuzatib, "Eski ma'lumotlarni ko'chirish" tugmasini yana bosishingiz mumkin (allaqachon ko'chirilganlar takrorlanmaydi).`
    );
  }
}

// ⚠️ XAVFSIZLIK OGOHLANTIRISHI: bu token brauzerdagi kodda ochiq turibdi —
// har qanday odam "View Source" orqali ko'rib, botdan foydalanishi mumkin.
// Ishlab chiqarish (production) muhitida buni albatta backend/serverless
// funksiya orqali yashiring (frontend hech qachon botni bevosita chaqirmasin).
const TELEGRAM_BOT_TOKEN = '8573641261:AAEcr3vaerq28nD3Pn-nERU-H7htPmaLG1g'; 
const TELEGRAM_CHAT_ID = '8780726548'; 

document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderCategoriesUI();
  renderProducts();
  updateCartBadge();
  updateStockDashboard();
  initBTSAddressSelectors();
  setupEventListeners();

  initFirestoreListeners();

  // Firebase Authentication: admin sifatida kirgan-kirmaganini kuzatib boradi
  auth.onAuthStateChanged(user => {
    isAdmin = !!user;
    toggleUserRoleUI();
    renderProducts();
  });

  // PWA: Service Worker'ni ro'yxatdan o'tkazish (Add to Home Screen ishlashi uchun shart)
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').catch(err => {
      console.error('Service worker ro\'yxatdan o\'tmadi:', err);
    });
  }
});

function setupEventListeners() {
  const addEvent = (id, event, callback) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener(event, callback);
  };

  addEvent('themeToggleBtn', 'click', toggleTheme);
  
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      renderProducts(e.target.value.trim().toLowerCase());
    });
  }

  const catList = document.getElementById('categoriesList');
  if (catList) {
    catList.addEventListener('click', (e) => {
      if (e.target.classList.contains('cat-btn')) {
        document.querySelectorAll('.cat-btn').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        currentCategory = e.target.dataset.category;
        renderProducts();
      }
    });
  }

  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const overlay = e.target.closest('.modal-overlay');
      if (overlay) overlay.classList.add('hidden');
    });
  });

  addEvent('adminLoginBtn', 'click', () => showModal(document.getElementById('adminAuthModal')));
  addEvent('exitAdminBtn', 'click', logoutAdmin);
  addEvent('adminAuthForm', 'submit', handleAdminLogin);

  addEvent('toggleCatInputBtn', 'click', () => {
    const box = document.getElementById('newCatInputBox');
    if (box) box.classList.toggle('hidden');
  });

  addEvent('saveCategoryBtn', 'click', handleAddCategory);
  addEvent('cartBtn', 'click', openCartModal);
  addEvent('myOrdersBtn', 'click', openMyOrdersModal);
  addEvent('receiptsBtn', 'click', openReceiptsModal);
  addEvent('stockBtn', 'click', openStockModal);

  addEvent('adminCardForm', 'submit', saveCardDetails);
  addEvent('addProductForm', 'submit', handleAddProduct);
  addEvent('editProductForm', 'submit', handleEditProduct);
  addEvent('checkoutBtn', 'click', openCheckoutModal);
  addEvent('copyCardBtn', 'click', copyCardNumber);
  addEvent('paymentCheckForm', 'submit', handlePaymentSubmit);

  addEvent('toggleMapBtn', 'click', toggleBTSMap);
  addEvent('confirmPointFromMapBtn', 'click', confirmMapPoint);
  addEvent('reviewForm', 'submit', handleReviewSubmit);

  addEvent('editProfileBtn', 'click', toggleProfileEditMode);
  addEvent('customerProfileForm', 'submit', saveCustomerProfile);
  addEvent('profileAvatarFile', 'change', handleAvatarChange);
  addEvent('avatarRemoveBtn', 'click', removeAvatarPhoto);

  addEvent('goToOrdersBtn', 'click', () => {
    hideModal(document.getElementById('successModal'));
    openMyOrdersModal();
  });
  
  addEvent('backToHomeBtn', 'click', () => {
    hideModal(document.getElementById('successModal'));
  });
  
  addEvent('profileExitAdminBtn', 'click', () => {
    hideModal(document.getElementById('adminProfileModal'));
    logoutAdmin();
  });

  const addProductBtn = document.getElementById('addProductBtn');
  if (addProductBtn) {
    addProductBtn.onclick = function(e) {
      e.preventDefault();
      const modal = document.getElementById('addProductModal');
      if (modal) {
        modal.classList.remove('hidden');
        modal.style.display = 'flex';
      }
    };
  }
}

// BTS SELECTORS VA XARITA MANTIQLARI
function initBTSAddressSelectors() {
  const regionSelect = document.getElementById('regionSelect');
  const pointSelect = document.getElementById('btsPointSelect');
  if (!regionSelect || !pointSelect) return;

  regionSelect.innerHTML = '<option value="">1. Viloyatni tanlang</option>';
  Object.keys(BTS_DATA).forEach(region => {
    const opt = document.createElement('option');
    opt.value = region;
    opt.textContent = region;
    regionSelect.appendChild(opt);
  });

  regionSelect.addEventListener('change', (e) => {
    const region = e.target.value;
    pointSelect.innerHTML = '<option value="">2. BTS Punktini tanlang</option>';

    if (region && BTS_DATA[region]) {
      pointSelect.disabled = false;
      BTS_DATA[region].forEach(pt => {
        const opt = document.createElement('option');
        opt.value = `${pt.name} (${pt.address})`;
        opt.textContent = pt.name;
        pointSelect.appendChild(opt);
      });
    } else {
      pointSelect.disabled = true;
    }
  });

  pointSelect.addEventListener('change', (e) => {
    const val = e.target.value;
    if (val) {
      setSelectedAddress(val);
    }
  });
}

function setSelectedAddress(fullAddress) {
  const addrInput = document.getElementById('customerAddress');
  if (addrInput) addrInput.value = fullAddress;
  const badge = document.getElementById('chosenAddressBadge');
  if (badge) {
    badge.textContent = `✓ Tanlandi: ${fullAddress}`;
    badge.classList.remove('hidden');
  }
}

function toggleBTSMap() {
  const container = document.getElementById('btsMapContainer');
  if (!container) return;

  container.classList.toggle('hidden');
  if (!container.classList.contains('hidden')) {
    setTimeout(() => {
      initOrUpdateMap();
    }, 200);
  }
}

function initOrUpdateMap() {
  if (!btsMap) {
    btsMap = L.map('btsMap').setView([41.2995, 69.2401], 6);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 18,
      attribution: '© OpenStreetMap'
    }).addTo(btsMap);

    const locationControl = L.control({ position: 'topright' });
    locationControl.onAdd = function () {
      const btn = L.DomUtil.create('button', 'btn-secondary-small');
      btn.innerHTML = '📍 Joylashuvim';
      btn.style.backgroundColor = '#fff';
      btn.style.color = '#333';
      btn.style.padding = '6px 10px';
      btn.style.cursor = 'pointer';
      btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.2)';
      btn.onclick = function (e) {
        e.preventDefault();
        btsMap.locate({ setView: true, maxZoom: 13 });
      };
      return btn;
    };
    locationControl.addTo(btsMap);

    btsMap.on('locationfound', (e) => {
      L.marker(e.latlng).addTo(btsMap).bindPopup("Siz shu yerdasiz!").openPopup();
    });
  }

  mapMarkers.forEach(m => btsMap.removeLayer(m));
  mapMarkers = [];

  const selectedRegion = document.getElementById('regionSelect').value;

  Object.keys(BTS_DATA).forEach(region => {
    if (!selectedRegion || selectedRegion === region) {
      BTS_DATA[region].forEach(pt => {
        const marker = L.marker([pt.lat, pt.lng]).addTo(btsMap);
        marker.bindPopup(`<b>${pt.name}</b><br>${pt.address}`);

        marker.on('click', () => {
          tempSelectedPoint = pt;
          document.getElementById('selectedPointName').textContent = pt.name;
          document.getElementById('selectedPointAddress').textContent = pt.address;
          document.getElementById('selectedPointCard').classList.remove('hidden');
        });

        mapMarkers.push(marker);
      });
    }
  });

  btsMap.invalidateSize();
}

function confirmMapPoint() {
  if (tempSelectedPoint) {
    const full = `${tempSelectedPoint.name} (${tempSelectedPoint.address})`;
    setSelectedAddress(full);

    const regionSelect = document.getElementById('regionSelect');
    const pointSelect = document.getElementById('btsPointSelect');

    Object.keys(BTS_DATA).forEach(reg => {
      const found = BTS_DATA[reg].find(p => p.name === tempSelectedPoint.name);
      if (found) {
        regionSelect.value = reg;
        regionSelect.dispatchEvent(new Event('change'));
        pointSelect.value = full;
      }
    });

    document.getElementById('btsMapContainer').classList.add('hidden');
    alert("Manzil xaritadan tanlandi va tasdiqlandi!");
  }
}

function renderCategoriesUI() {
  const select = document.getElementById('productCategory');
  const catList = document.getElementById('categoriesList');

  if (select) select.innerHTML = '';
  if (catList) catList.innerHTML = '<button class="cat-btn active" data-category="all">Barchasi</button>';

  categories.forEach(cat => {
    if (select) {
      const opt = document.createElement('option');
      opt.value = cat;
      opt.textContent = cat;
      select.appendChild(opt);
    }

    if (catList) {
      const btn = document.createElement('button');
      btn.className = 'cat-btn';
      btn.dataset.category = cat;
      btn.textContent = cat;
      catList.appendChild(btn);
    }
  });
}

async function handleAddCategory() {
  const input = document.getElementById('newCategoryName');
  const catName = input.value.trim();

  if (catName !== '') {
    if (!categories.includes(catName)) {
      try {
        await firestoreDB.collection('categories').add({ name: catName });

        const select = document.getElementById('productCategory');
        if (select) select.value = catName;

        input.value = '';
        document.getElementById('newCatInputBox').classList.add('hidden');
      } catch (err) {
        alert("Kategoriya qo'shishda xatolik: " + err.message);
      }
    } else {
      alert("Bu kategoriya allaqachon mavjud!");
    }
  }
}

// Endi admin login Firebase Authentication orqali amalga oshadi — parol hech
// qayerda kod ichida yozilmagan, Firebase serverida xavfsiz tekshiriladi.
function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('adminEmail').value.trim();
  const password = document.getElementById('adminPassword').value;

  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      hideModal(document.getElementById('adminAuthModal'));
      document.getElementById('adminPassword').value = '';
      document.getElementById('authError').classList.add('hidden');
      document.getElementById('adminAuthForm').reset();
      // isAdmin, toggleUserRoleUI() va renderProducts() onAuthStateChanged orqali avtomatik yangilanadi
    })
    .catch(() => {
      document.getElementById('authError').classList.remove('hidden');
    });
}

function logoutAdmin() {
  auth.signOut();
  // isAdmin, toggleUserRoleUI() va renderProducts() onAuthStateChanged orqali avtomatik yangilanadi
}

function toggleUserRoleUI() {
  const customerOnly = document.querySelectorAll('.customer-only');
  const adminOnly = document.querySelectorAll('.admin-only');

  if (isAdmin) {
    customerOnly.forEach(el => el.classList.add('hidden'));
    adminOnly.forEach(el => el.classList.remove('hidden'));
  } else {
    customerOnly.forEach(el => el.classList.remove('hidden'));
    adminOnly.forEach(el => el.classList.add('hidden'));
  }
}

function renderProducts(searchQuery = '') {
  const grid = document.getElementById('productsGrid');
  if (!grid) return; 
  grid.innerHTML = '';

  const searchVariants = searchQuery ? convertAlphabet(searchQuery) : [];

  let filtered = products.filter(p => {
    const matchesCat = currentCategory === 'all' || p.category === currentCategory;
    if (!searchQuery) return matchesCat;

    const prodNameVariants = convertAlphabet(p.name);
    const prodDescVariants = p.description ? convertAlphabet(p.description) : [];

    const matchesSearch = searchVariants.some(sVariant => {
      return prodNameVariants.some(pVariant => isSimilar(pVariant, sVariant)) ||
             prodDescVariants.some(dVariant => isSimilar(dVariant, sVariant));
    });

    return matchesCat && matchesSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; opacity: 0.7;">Mahsulotlar topilmadi.</p>';
    return;
  }

  filtered.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.innerHTML = `
      ${isAdmin ? `
        <button class="delete-btn" onclick="deleteProduct('${product.id}')">
          <img src="images/delete.png" alt="Delete" class="delete-icon">
        </button>
        <button class="edit-btn" onclick="openEditModal('${product.id}')">
          <img src="images/edit.png" alt="Edit" class="edit-icon">
        </button>
      ` : ''}
      <div class="card-img-container" onclick="openProductModal('${product.id}')">
        <img src="${product.images[0] || 'images/logo.jpg'}" class="card-img">
      </div>
      <div class="card-content">
        <span style="font-size:12px; opacity:0.7;">${product.category}</span>
        <h3 style="font-size:16px; margin:4px 0;">${product.name}</h3>
        <div class="card-price">${formatMoney(product.price)} UZS</div>
        <button class="btn-primary customer-only ${isAdmin ? 'hidden' : ''}" onclick="openProductModal('${product.id}')">Batafsil</button>
      </div>
    `;
    grid.appendChild(card);
  });

  toggleUserRoleUI();
}

function openProductModal(id) {
  selectedProductForModal = products.find(p => p.id === id);
  if (!selectedProductForModal) return;

  selectedSize = selectedProductForModal.sizes[0] || 'Standart';
  selectedColor = selectedProductForModal.colors[0] || 'Standart';

  document.getElementById('modalImg').src = selectedProductForModal.images[0] || 'images/logo.jpg';
  document.getElementById('modalTitle').textContent = selectedProductForModal.name;
  document.getElementById('modalCategory').textContent = selectedProductForModal.category;
  document.getElementById('modalDesc').textContent = selectedProductForModal.description || 'Tavsif berilmagan';
  document.getElementById('modalPrice').textContent = `${formatMoney(selectedProductForModal.price)} UZS`;

  const thumbBox = document.getElementById('modalThumbnails');
  thumbBox.innerHTML = '';
  (selectedProductForModal.images || ['images/logo.jpg']).forEach((img, i) => {
    const t = document.createElement('img');
    t.src = img;
    t.className = `thumb-img ${i === 0 ? 'active' : ''}`;
    t.onclick = () => {
      document.getElementById('modalImg').src = img;
      document.querySelectorAll('.thumb-img').forEach(el => el.classList.remove('active'));
      t.classList.add('active');
    };
    thumbBox.appendChild(t);
  });

  const sizeBox = document.getElementById('modalSizes');
  sizeBox.innerHTML = '';
  (selectedProductForModal.sizes || ['Standart']).forEach((s, i) => {
    const btn = document.createElement('button');
    btn.className = `size-btn ${i === 0 ? 'selected' : ''}`;
    btn.textContent = s;
    btn.onclick = () => {
      document.querySelectorAll('#modalSizes .size-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedSize = s;
    };
    sizeBox.appendChild(btn);
  });

  const colorBox = document.getElementById('modalColors');
  colorBox.innerHTML = '';
  (selectedProductForModal.colors || ['Standart']).forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = `size-btn ${i === 0 ? 'selected' : ''}`;
    btn.textContent = c;
    btn.onclick = () => {
      document.querySelectorAll('#modalColors .size-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedColor = c;
    };
    colorBox.appendChild(btn);
  });

  document.getElementById('modalAddToCartBtn').onclick = (e) => {
    addToCart(e, selectedProductForModal, selectedSize, selectedColor);
    setTimeout(() => {
      hideModal(document.getElementById('productModal'));
    }, 1200);
  };

  showModal(document.getElementById('productModal'));
}

async function addToCart(e, product, size, color) {
  if (e) e.preventDefault();

  const cartItemId = `${product.id}_${size}_${color}`;
  const existing = await db.cart.get(cartItemId);

  if (existing) {
    await db.cart.update(cartItemId, { qty: existing.qty + 1 });
  } else {
    await db.cart.put({
      id: cartItemId,
      productId: product.id,
      name: product.name,
      price: product.price,
      image: (product.images && product.images[0]) ? product.images[0] : 'images/logo.jpg',
      size: size,
      color: color,
      qty: 1
    });
  }

  await updateCartBadge();

  const btn = document.getElementById('modalAddToCartBtn');
  if (btn) {
    const originalText = btn.innerText;
    btn.innerText = "✓ Savatga qo'shildi";
    btn.classList.add('added');

    setTimeout(() => {
      btn.innerText = originalText;
      btn.classList.remove('added');
    }, 1200);
  }
}

async function openCartModal() {
  await renderCart();
  showModal(document.getElementById('cartModal'));
}

async function removeFromCart(itemId) {
  await db.cart.delete(itemId);
  await updateCartBadge();
  await renderCart();
}

async function changeQty(itemId, change) {
  const item = await db.cart.get(itemId);
  if (!item) return;

  const newQty = item.qty + change;
  if (newQty <= 0) {
    await db.cart.delete(itemId);
  } else {
    await db.cart.update(itemId, { qty: newQty });
  }
  
  await updateCartBadge();
  await renderCart();
}

async function renderCart() {
  const cartItems = await db.cart.toArray();
  const container = document.getElementById('cartItemsList') || document.getElementById('cartItemsContainer');
  const totalSumEl = document.getElementById('cartTotalSum') || document.getElementById('totalPrice');

  if (!container) return;
  container.innerHTML = '';

  if (cartItems.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:20px 0; opacity:0.8;">Savatingiz bo\'sh</p>';
    if (totalSumEl) totalSumEl.textContent = '0 UZS';
    return;
  }

  let total = 0;
  cartItems.forEach(item => {
    total += item.price * item.qty;
    const row = document.createElement('div');
    row.className = 'cart-item-row';
    row.innerHTML = `
      <img src="${item.image}" class="cart-item-img" style="width:50px; height:50px; object-fit:cover; border-radius:6px;">
      <div style="flex-grow:1; margin-left:10px;">
        <div style="font-weight:600; font-size:16px;">${item.name}</div>
        <small style="font-size:12px; opacity:0.8;">${item.size} / ${item.color}</small>
        <div style="font-size:13px; font-weight:bold; margin-top:2px;">${formatMoney(item.price)} UZS</div>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <button class="qty-btn" onclick="changeQty('${item.id}', -1)">-</button>
        <span style="font-size: 15px; font-weight: bold;">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
      </div>
      <button class="delete-btnn" style="background:none; border:none; cursor:pointer; margin-left:10px;" onclick="removeFromCart('${item.id}')">
        <img src="images/delete.png" alt="Delete" class="delete-icon" style="width:20px;">
      </button>
    `;
    container.appendChild(row);
  });

  if (totalSumEl) {
    totalSumEl.textContent = `${formatMoney(total)} UZS`;
  }
}

async function updateCartBadge() {
  const cartItems = await db.cart.toArray();
  const totalCount = cartItems.reduce((sum, item) => sum + item.qty, 0);
  
  const badge = document.getElementById('cartBadge');
  if (badge) badge.innerText = totalCount;

  const mobileBadge = document.getElementById('cartBadgeMobile');
  if (mobileBadge) mobileBadge.innerText = totalCount;
}

async function openCheckoutModal() {
  const cartItems = await db.cart.toArray();
  if (cartItems.length === 0) {
    alert("Savatingiz bo'sh!");
    return;
  }

  hideModal(document.getElementById('cartModal'));

  document.getElementById('displayCardBank').textContent = cardDetails.bank;
  document.getElementById('displayCardNumber').textContent = cardDetails.number;
  document.getElementById('displayCardHolder').textContent = cardDetails.holder;

  const total = cartItems.reduce((sum, item) => sum + item.price * item.qty, 0);
  document.getElementById('checkoutTotalSum').textContent = formatMoney(total);

  showModal(document.getElementById('checkoutModal'));
}

function copyCardNumber() {
  const cleanNum = cardDetails.number.replace(/\s+/g, '');
  navigator.clipboard.writeText(cleanNum).then(() => alert("Karta raqami nusxalandi!"));
}

async function handlePaymentSubmit(e) {
  e.preventDefault();

  const fileInput = document.getElementById('checkFile');
  if (!fileInput || !fileInput.files || !fileInput.files[0]) {
    alert("Iltimos, to'lov cheki rasm/faylini yuklang!");
    return;
  }

  const file = fileInput.files[0];
  const customerName = document.getElementById('customerName')?.value.trim();
  const customerPhone = document.getElementById('customerPhone')?.value.trim();
  const customerAddress = document.getElementById('customerAddress')?.value.trim();

  if (!customerName || !customerPhone) {
    alert("Iltimos, ismingiz va telefon raqamingizni kiriting!");
    return;
  }

  if (!customerAddress) {
    alert("Iltimos, yetkazib berish BTS punktini tanlang!");
    return;
  }

  const cartItems = await db.cart.toArray();
  if (cartItems.length === 0) {
    alert("Savatingiz bo'sh!");
    return;
  }

  try {
    let receiptBase64 = '';
    
    if (file.type.startsWith('image/')) {
      receiptBase64 = await compressAndReadFile(file);
    } else {
      receiptBase64 = await readFileAsBase64(file);
    }

    const newOrder = {
      date: new Date().toLocaleString('uz-UZ'),
      customerName: customerName,
      customerPhone: customerPhone,
      customerAddress: customerAddress,
      items: cartItems,
      totalSum: cartItems.reduce((sum, item) => sum + (item.price * item.qty), 0),
      receiptImg: receiptBase64,
      receiptType: file.type,
      status: "Kutilmoqda",
      btsCode: "BTS-" + Math.floor(100000 + Math.random() * 900000),
      createdAtMs: Date.now(),
      deviceId: getDeviceId()
    };

    const orderSizeBytes = new Blob([JSON.stringify(newOrder)]).size;
    if (orderSizeBytes > 900000) {
      alert("Chek fayli hajmi juda katta! Iltimos, aniqroq va kichikroq hajmli screenshot (rasm) yuklang, PDF fayl o'rniga imkon qadar rasm (JPG/PNG) tanlang.");
      return;
    }

    await firestoreDB.collection('orders').add(newOrder);

    sendOrderToTelegramBot(newOrder, file);

    await db.cart.clear();
    await updateCartBadge();

    hideModal(document.getElementById('checkoutModal'));
    document.getElementById('paymentCheckForm').reset();
    document.getElementById('chosenAddressBadge')?.classList.add('hidden');
    
    const successModal = document.getElementById('successModal');
    if (successModal) showModal(successModal);

  } catch (err) {
    console.error("Fayl yuklashda xatolik:", err);
    alert("Fayl ishlov berishda xatolik yuz berdi. Iltimos boshqa fayl tanlang.");
  }
}

function sendOrderToTelegramBot(order, file) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const caption = `🛒 <b>YANGI BUYURTMA!</b>\n\n` +
    `👤 <b>Mijoz:</b> ${order.customerName}\n` +
    `📞 <b>Tel:</b> ${order.customerPhone}\n` +
    `📍 <b>Manzil (BTS):</b> ${order.customerAddress}\n` +
    `🔖 <b>BTS Kod:</b> <code>${order.btsCode}</code>\n` +
    `💰 <b>Jami:</b> ${formatMoney(order.totalSum)} UZS\n\n` +
    `🛍 <b>Mahsulotlar:</b>\n` +
    order.items.map(i => `- ${i.name} (${i.size}/${i.color}) x ${i.qty} шт.`).join('\n');

  const formData = new FormData();
  formData.append('chat_id', TELEGRAM_CHAT_ID);
  formData.append('caption', caption);
  formData.append('parse_mode', 'HTML');

  let apiMethod = 'sendDocument';
  if (file.type.startsWith('image/')) {
    formData.append('photo', file);
    apiMethod = 'sendPhoto';
  } else {
    formData.append('document', file);
  }

  fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/${apiMethod}`, {
    method: 'POST',
    body: formData
  }).catch(err => console.error("Telegramga yuborishda xatolik:", err));
}

function openReceiptsModal() {
  const container = document.getElementById('receiptsList');
  if (!container) return;
  container.innerHTML = '';

  if (orders.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:20px 0; opacity: 0.7;">Cheklar yo\'q.</p>';
  } else {
    orders.forEach(o => {
      const isPDF = (o.receiptType && o.receiptType.includes('pdf')) || (o.receiptImg && o.receiptImg.startsWith('data:application/pdf'));

      let receiptHTML = '';
      if (isPDF) {
        receiptHTML = `
          <div style="margin-top: 10px;">
            <a href="${o.receiptImg}" target="_blank" download="chek_${o.btsCode}.pdf" class="glass-pdf-btn">
              PDF Chek
            </a>
          </div>`;
      } else if (o.receiptImg) {
        receiptHTML = `
          <div style="margin-top: 10px;">
            <a href="${o.receiptImg}" target="_blank">
              <img src="${o.receiptImg}" class="receipt-preview-img" style="max-width: 100px; border-radius: 8px;">
            </a>
          </div>`;
      } else {
        receiptHTML = `<p style="opacity: 0.5; margin-top: 5px; font-size: 12px;"><i>Chek biriktirilmagan</i></p>`;
      }

      const item = document.createElement('div');
      item.className = 'stock-card';

      item.innerHTML = `
        <div class="glass-card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <span class="customer-name" style="font-weight:bold;">${o.customerName} (${o.customerPhone})</span>
          <span class="status-badge ${getStatusBadgeClass(o.status)}">${o.status || 'Kutilmoqda'}</span>
        </div>
        <p class="card-info" style="margin-top:8px;"><strong>Manzil:</strong> ${o.customerAddress}</p>
        <p class="card-info"><strong>BTS Kod:</strong> <span class="bts-code">${o.btsCode}</span></p>
        <p class="card-info"><strong>Summa:</strong> ${formatMoney(o.totalSum)} UZS</p>

        ${receiptHTML}

        <div class="order-status-actions">
          <button type="button" class="status-btn-compact status-kutilmoqda" onclick="updateOrderStatus('${o.id}', 'Kutilmoqda')">Kutilmoqda</button>
          <button type="button" class="status-btn-compact status-bts" onclick="updateOrderStatus('${o.id}', 'BTS pochtaga yetkazildi')">BTS pochtaga yetkazildi</button>
          <button type="button" class="status-btn-compact status-bekor" onclick="updateOrderStatus('${o.id}', 'Buyurtma bekor qilindi')">Buyurtma bekor qilindi</button>
        </div>
      `;
      container.appendChild(item);
    });
  }

  showModal(document.getElementById('receiptsModal'));
}

function getStatusBadgeClass(status) {
  if (status === 'BTS pochtaga yetkazildi') return 'badge-bts';
  if (status === 'Buyurtma bekor qilindi') return 'badge-bekor';
  return 'badge-kutilmoqda';
}

function openMyOrdersModal() {
  const container = document.getElementById('myOrdersList');
  if (!container) return;
  container.innerHTML = '';

  const myOrders = orders.filter(o => o.deviceId === getDeviceId());

  if (myOrders.length === 0) {
    container.innerHTML = '<p style="text-align:center; padding:20px 0; opacity: 0.7;">Sizda hali buyurtmalar yo\'q.</p>';
  } else {
    myOrders.forEach(o => {
      const card = document.createElement('div');
      card.className = 'stock-card';
      
      const isDelivered = (o.status === 'BTS pochtaga yetkazildi');
      const hasReview = reviews.some(r => r.orderId === o.id);

      const itemsListId = `orderItems_${o.id}`;
      const itemsHTML = (o.items || []).map(it => `
        <div class="order-item-row">
          <img src="${it.image || 'images/logo.jpg'}" alt="${it.name}">
          <div>
            <div style="font-weight:600;">${it.name}</div>
            <div style="opacity:0.7;">${it.size || ''} / ${it.color || ''} · ${it.qty} dona</div>
          </div>
        </div>
      `).join('');

      card.innerHTML = `
        <div class="glass-card-header" style="display:flex; justify-content:space-between; align-items:center;">
          <span><strong>Buyurtma №:</strong> <span class="bts-code">${o.btsCode}</span></span>
          <span class="status-badge ${getStatusBadgeClass(o.status)}">${o.status || 'Kutilmoqda'}</span>
        </div>
        <p class="card-info" style="margin-top: 6px; font-size: 12px; opacity: 0.6;">Sana: ${o.date}</p>
        <p class="card-info" style="font-size: 14px; margin-top: 4px;"><strong>Manzil:</strong> ${o.customerAddress}</p>
        <p class="card-info" style="font-size: 15px; margin-top: 4px;"><strong>Summa:</strong> ${formatMoney(o.totalSum)} UZS</p>

        <button type="button" class="order-items-toggle-btn" onclick="document.getElementById('${itemsListId}').classList.toggle('hidden')">Mahsulotlarni ko'rish</button>
        <div class="order-items-list hidden" id="${itemsListId}">${itemsHTML}</div>

        ${isDelivered ? `
          <div style="margin-top:10px;">
            ${hasReview ? `
              <span style="color:#22c55e; font-size:13px; font-weight:600;">✓ Otziv qoldirilgan</span>
            ` : `
              <button class="btn-primary" style="padding:6px 12px; font-size:12px;" onclick="openReviewModal('${o.id}')">Otziv qoldirish</button>
            `}
          </div>
        ` : ''}
      `;
      container.appendChild(card);
    });
  }

  showModal(document.getElementById('myOrdersModal'));
}

function openReviewModal(orderId) {
  document.getElementById('reviewOrderId').value = orderId;
  showModal(document.getElementById('reviewModal'));
}

async function handleReviewSubmit(e) {
  e.preventDefault();

  const orderId = document.getElementById('reviewOrderId').value;
  const comment = document.getElementById('reviewComment').value.trim();
  const fileInput = document.getElementById('reviewImageFile');
  let reviewImg = null;

  if (fileInput && fileInput.files && fileInput.files[0]) {
    try {
      reviewImg = await compressAndReadFile(fileInput.files[0]);
    } catch (err) {
      console.error(err);
    }
  }

  try {
    await firestoreDB.collection('reviews').add({
      orderId: orderId,
      comment: comment,
      image: reviewImg,
      date: new Date().toLocaleDateString('uz-UZ')
    });

    alert("Otzivingiz uchun rahmat!");
    hideModal(document.getElementById('reviewModal'));
    document.getElementById('reviewForm').reset();
    openMyOrdersModal();
  } catch (err) {
    alert("Otziv yuborishda xatolik: " + err.message);
  }
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    await firestoreDB.collection('orders').doc(orderId).update({ status: newStatus });
    alert(`Buyurtma statusi "${newStatus}" ga o'zgartirildi!`);
    openReceiptsModal();
  } catch (err) {
    alert("Statusni yangilashda xatolik: " + err.message);
  }
}

async function saveCardDetails(e) {
  e.preventDefault();
  const newCardDetails = {
    number: document.getElementById('adminCardNumber').value,
    holder: document.getElementById('adminCardHolder').value,
    bank: document.getElementById('adminBankName').value
  };
  try {
    await firestoreDB.collection('settings').doc('card').set(newCardDetails);
    alert("Karta ma'lumotlari saqlandi!");
  } catch (err) {
    alert("Saqlashda xatolik: " + err.message);
  }
}

function loadCardDetails() {
  const num = document.getElementById('adminCardNumber');
  const holder = document.getElementById('adminCardHolder');
  const bank = document.getElementById('adminBankName');
  if (num) num.value = cardDetails.number;
  if (holder) holder.value = cardDetails.holder;
  if (bank) bank.value = cardDetails.bank;
}

function compressAndReadFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target.result;
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const scaleSize = MAX_WIDTH / img.width;
        
        if (scaleSize < 1) {
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
        } else {
          canvas.width = img.width;
          canvas.height = img.height;
        }

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
        resolve(compressedBase64);
      };
      
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (err) => reject(err);
  });
}

async function handleAddProduct(e) {
  e.preventDefault();

  const name = document.getElementById('newProdName')?.value.trim();
  const category = document.getElementById('productCategory')?.value;
  const price = Number(document.getElementById('newProdPrice')?.value);
  const stock = Number(document.getElementById('newProdStock')?.value);
  const sizesInput = document.getElementById('newProdSizes')?.value;
  const sizes = sizesInput ? sizesInput.split(',').map(s => s.trim()).filter(Boolean) : ['Standart'];
  const description = document.getElementById('newProdDesc')?.value.trim();
  
  const fileEl = document.getElementById('newProdImgFile');
  const files = fileEl && fileEl.files ? Array.from(fileEl.files) : [];

  const checkedColors = Array.from(document.querySelectorAll('#colorPickerGrid input[type=checkbox]:checked')).map(cb => cb.value);
  const colors = checkedColors.length > 0 ? checkedColors : ['Standart'];

  if (!name || !price) {
    alert("Iltimos, mahsulot nomi va narxini kiriting!");
    return;
  }

  let images = [];
  if (files.length > 0) {
    try {
      images = await Promise.all(files.map(file => compressAndReadFile(file)));
    } catch (err) {
      alert("Rasm yuklashda xatolik yuz berdi!");
      return;
    }
  } else {
    images.push('images/logo.jpg');
  }

  saveNewProduct({ name, category, price, stock, sizes, colors, images, description });
}

async function saveNewProduct(data) {
  try {
    await firestoreDB.collection('products').add({ ...data, createdAtMs: Date.now() });

    const modal = document.getElementById('addProductModal');
    if (modal) modal.classList.add('hidden');

    document.getElementById('addProductForm')?.reset();
    alert("Mahsulot muvaffaqiyatli qo'shildi!");
  } catch (err) {
    alert("Mahsulot qo'shishda xatolik: " + err.message);
  }
}

async function deleteProduct(id) {
  if (confirm("Mahsulotni o'chirmoqchimisiz?")) {
    try {
      await firestoreDB.collection('products').doc(id).delete();
    } catch (err) {
      alert("O'chirishda xatolik: " + err.message);
    }
  }
}

function openEditModal(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;

  document.getElementById('editProdId').value = product.id;
  document.getElementById('editProdName').value = product.name;
  document.getElementById('editProdPrice').value = product.price;
  document.getElementById('editProdStock').value = product.stock || 0;
  document.getElementById('editProdSizes').value = product.sizes ? product.sizes.join(', ') : '';
  document.getElementById('editProdDesc').value = product.description || '';

  const existingColors = product.colors || [];
  document.querySelectorAll('#editColorPickerGrid input[type=checkbox]').forEach(cb => {
    cb.checked = existingColors.includes(cb.value);
  });

  const catSelect = document.getElementById('editProdCategory');
  if (catSelect) {
    catSelect.innerHTML = categories.map(c => 
      `<option value="${c}" ${c === product.category ? 'selected' : ''}>${c}</option>`
    ).join('');
  }

  showModal(document.getElementById('editProductModal'));
}

async function handleEditProduct(e) {
  e.preventDefault();

  const id = document.getElementById('editProdId').value;
  const name = document.getElementById('editProdName').value.trim();
  const category = document.getElementById('editProdCategory').value;
  const price = Number(document.getElementById('editProdPrice').value);
  const stock = Number(document.getElementById('editProdStock').value);
  const sizesInput = document.getElementById('editProdSizes').value;
  const sizes = sizesInput ? sizesInput.split(',').map(s => s.trim()).filter(Boolean) : ['Standart'];
  const description = document.getElementById('editProdDesc').value.trim();

  const fileEl = document.getElementById('editProdImgFile');
  const files = fileEl && fileEl.files ? Array.from(fileEl.files) : [];

  const checkedColors = Array.from(document.querySelectorAll('#editColorPickerGrid input[type=checkbox]:checked')).map(cb => cb.value);
  const colors = checkedColors.length > 0 ? checkedColors : ['Standart'];

  const index = products.findIndex(p => p.id === id);
  if (index === -1) return;

  let images = products[index].images;

  if (files.length > 0) {
    try {
      images = await Promise.all(files.map(file => compressAndReadFile(file)));
    } catch (err) {
      alert("Rasm yuklashda xatolik yuz berdi!");
      return;
    }
  }

  try {
    await firestoreDB.collection('products').doc(id).update({
      name, category, price, stock, sizes, colors, description, images
    });

    hideModal(document.getElementById('editProductModal'));
    alert("Mahsulot muvaffaqiyatli o'zgartirildi!");
  } catch (err) {
    alert("Yangilashda xatolik: " + err.message);
  }
}

function updateStockDashboard() {
  const typesEl = document.getElementById('totalTypes');
  const unitsEl = document.getElementById('totalUnits');
  if (typesEl) typesEl.textContent = products.length;
  if (unitsEl) unitsEl.textContent = products.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
}

function setActiveNav(btn) {
  const nav = btn.closest('.bottom-nav');
  if (!nav) return;
  nav.querySelectorAll('.bottom-nav-item').forEach(item => item.classList.remove('active'));
  btn.classList.add('active');
}

function openStockModal() {
  updateStockDashboard();
  showModal(document.getElementById('stockModal'));
}

function openCardSettingsModal() {
  loadCardDetails();
  showModal(document.getElementById('cardSettingsModal'));
}

function openCustomerProfileModal() {
  const myOrders = orders.filter(o => o.deviceId === getDeviceId());
  const lastOrder = myOrders[0];
  const nameInput = document.getElementById('profileName');
  const phoneInput = document.getElementById('profilePhone');

  if (nameInput) nameInput.value = customerProfile.name || (lastOrder ? lastOrder.customerName : '');
  if (phoneInput) phoneInput.value = customerProfile.phone || (lastOrder ? lastOrder.customerPhone : '');

  setProfileEditMode(false);
  renderProfileAvatar();
  showModal(document.getElementById('customerProfileModal'));
}

function setProfileEditMode(isEditing) {
  const nameInput = document.getElementById('profileName');
  const phoneInput = document.getElementById('profilePhone');
  const saveBtn = document.getElementById('profileSaveBtn');
  const editBtn = document.getElementById('editProfileBtn');

  if (nameInput) nameInput.disabled = !isEditing;
  if (phoneInput) phoneInput.disabled = !isEditing;
  if (saveBtn) saveBtn.classList.toggle('hidden', !isEditing);
  if (editBtn) editBtn.classList.toggle('active', isEditing);
}

function toggleProfileEditMode() {
  const nameInput = document.getElementById('profileName');
  const isCurrentlyEditing = nameInput && !nameInput.disabled;
  setProfileEditMode(!isCurrentlyEditing);
  if (!isCurrentlyEditing && nameInput) nameInput.focus();
}

function saveCustomerProfile(e) {
  e.preventDefault();
  customerProfile.name = document.getElementById('profileName')?.value.trim() || '';
  customerProfile.phone = document.getElementById('profilePhone')?.value.trim() || '';
  localStorage.setItem(STORAGE_KEYS.CUSTOMER_PROFILE, JSON.stringify(customerProfile));
  setProfileEditMode(false);
  alert("Profil ma'lumotlari saqlandi!");
}

function renderProfileAvatar() {
  const icon = document.getElementById('profileAvatarIcon');
  const img = document.getElementById('profileAvatarImg');
  const removeBtn = document.getElementById('avatarRemoveBtn');

  if (customerProfile.photo) {
    if (img) { img.src = customerProfile.photo; img.classList.remove('hidden'); }
    if (icon) icon.classList.add('hidden');
    if (removeBtn) removeBtn.classList.remove('hidden');
  } else {
    if (img) { img.classList.add('hidden'); img.src = ''; }
    if (icon) icon.classList.remove('hidden');
    if (removeBtn) removeBtn.classList.add('hidden');
  }
}

async function handleAvatarChange(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  try {
    const compressed = await compressAndReadFile(file);
    customerProfile.photo = compressed;
    localStorage.setItem(STORAGE_KEYS.CUSTOMER_PROFILE, JSON.stringify(customerProfile));
    renderProfileAvatar();
  } catch (err) {
    alert("Rasm yuklashda xatolik yuz berdi!");
  }
  e.target.value = '';
}

function removeAvatarPhoto() {
  customerProfile.photo = '';
  localStorage.setItem(STORAGE_KEYS.CUSTOMER_PROFILE, JSON.stringify(customerProfile));
  renderProfileAvatar();
}

function openAdminProfileModal() {
  showModal(document.getElementById('adminProfileModal'));
}

function showModal(modal) { if (modal) modal.classList.remove('hidden'); }
function hideModal(modal) { if (modal) modal.classList.add('hidden'); }
function formatMoney(amount) { return amount ? amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") : "0"; }

function toggleTheme() {
  document.body.classList.toggle('dark-theme');
  const isDark = document.body.classList.contains('dark-theme');
  localStorage.setItem(STORAGE_KEYS.THEME, isDark ? 'dark' : 'light');
  syncThemeLabels(isDark);
}

function initTheme() {
  const isDark = localStorage.getItem(STORAGE_KEYS.THEME) === 'dark';
  if (isDark) document.body.classList.add('dark-theme');
  syncThemeLabels(isDark);
}

function syncThemeLabels(isDark) {
  const themeText = document.getElementById('themeText');
  if (themeText) themeText.textContent = isDark ? 'Light' : 'Dark';
  const themeTextProfile = document.getElementById('themeTextProfile');
  if (themeTextProfile) themeTextProfile.textContent = isDark ? 'Kunduzgi rejim' : 'Tungi rejim';
}

function convertAlphabet(text) {
  const lotinToKirill = {
    'sh': 'ш', 'ch': 'ч', 'yo': 'ё', 'yu': 'ю', 'ya': 'я', 'ye': 'е', 'o\'': 'ў', 'g\'': 'ғ',
    'a': 'а', 'b': 'б', 'v': 'в', 'g': 'г', 'd': 'д', 'e': 'е', 'z': 'з', 'i': 'и',
    'j': 'ж', 'k': 'к', 'l': 'л', 'm': 'м', 'n': 'н', 'o': 'о', 'p': 'п', 'r': 'р',
    's': 'с', 't': 'т', 'u': 'у', 'f': 'ф', 'x': 'х', 'h': 'ҳ', 'c': 'ц', 'q': 'қ'
  };

  const kirillToLotin = {
    'ш': 'sh', 'ч': 'ch', 'ё': 'yo', 'ю': 'yu', 'я': 'ya', 'ў': 'o\'', 'ғ': 'g\'',
    'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ж': 'j', 'з': 'z',
    'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm', 'n': 'n', 'о': 'o', 'п': 'p',
    'р': 'r', 'с': 's', 'т': 't', 'у': 'u', 'ф': 'f', 'х': 'x', 'ҳ': 'h', 'ц': 'ts', 'қ': 'q'
  };

  let lotin = text.toLowerCase();
  let kirill = text.toLowerCase();

  Object.keys(lotinToKirill).forEach(key => {
    lotin = lotin.replaceAll(key, lotinToKirill[key]);
  });

  Object.keys(kirillToLotin).forEach(key => {
    kirill = kirill.replaceAll(key, kirillToLotin[key]);
  });

  return [text.toLowerCase(), lotin, kirill];
}

function isSimilar(str1, str2) {
  if (str1.includes(str2) || str2.includes(str1)) return true;
  
  let track = Array(str2.length + 1).fill(null).map(() =>
    Array(str1.length + 1).fill(null));
  for (let i = 0; i <= str1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= str2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= str2.length; j += 1) {
    for (let i = 1; i <= str1.length; i += 1) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }
  
  return track[str2.length][str1.length] <= 2;
}
// Pastki menyu tugmalari bosilganda "active" klassini yangilash
document.querySelectorAll('.bottom-nav-item').forEach(item => {
  item.addEventListener('click', function() {
    document.querySelectorAll('.bottom-nav-item').forEach(btn => btn.classList.remove('active'));
    this.classList.add('active');
  });
});