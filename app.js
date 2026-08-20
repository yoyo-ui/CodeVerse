// ضع رابط الـ Web App الخاص بك هنا
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzFKTrt7NLEBkhI4Ea2birS-BGpJRZuiplidJ0_PbkiE4R5S8VMbtGRsQfHpNh1jM5P/exec";

let selectedProduct = null;
let currentWalletNumber = "010XXXXXXXX";
let isMaintenanceActive = false;

function getSavedTokens() {
    try {
        return JSON.parse(localStorage.getItem("cv_tracking_tokens") || "[]");
    } catch (e) {
        return [];
    }
}

function saveToken(token) {
    const tokens = getSavedTokens();
    if (!tokens.includes(token)) {
        tokens.unshift(token);
        localStorage.setItem("cv_tracking_tokens", JSON.stringify(tokens));
    }
}

function switchTab(tab) {
    const isStore = tab === 'store';
    document.getElementById('store-view').classList.toggle('hidden', !isStore);
    document.getElementById('orders-view').classList.toggle('hidden', isStore);

    document.getElementById('tab-btn-store').className = isStore
        ? "px-4 py-1.5 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-bold transition flex items-center gap-1.5"
        : "px-4 py-1.5 rounded-xl text-gray-400 hover:text-gray-200 text-xs font-bold transition flex items-center gap-1.5";

    document.getElementById('tab-btn-orders').className = !isStore
        ? "px-4 py-1.5 rounded-xl bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-bold transition flex items-center gap-1.5"
        : "px-4 py-1.5 rounded-xl text-gray-400 hover:text-gray-200 text-xs font-bold transition flex items-center gap-1.5";

    if (!isStore) {
        autoLoadRecentOrders();
    }
}

function getServiceImage(name, customImageUrl) {
    if (customImageUrl && customImageUrl.trim().startsWith('http')) {
        return customImageUrl.trim();
    }
    const lower = (name || '').toLowerCase();
    if (lower.includes('gemini')) return 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/google-gemini.png';
    if (lower.includes('gpt') || lower.includes('chatgpt') || lower.includes('openai')) return 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/chatgpt.png';
    if (lower.includes('claude') || lower.includes('anthropic')) return 'https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/claude.png';
    return 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80';
}

function renderProducts(services) {
    const container = document.getElementById('products-list');
    if (!services || services.length === 0) {
        container.innerHTML = `
      <div class="col-span-1 md:col-span-3 card-terminal border border-violet-500/30 p-8 rounded-3xl text-center space-y-3">
        <p class="text-gray-300 font-bold text-sm">⚠️ لا توجد منتجات متاحة حالياً</p>
        <p class="text-gray-500 text-xs mono-font">يرجى التأكد من إضافة خدمات داخل حساب AIVerse أو إعادة النشر.</p>
        <button onclick="loadProducts(true)" class="bg-violet-600 hover:bg-violet-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition">
          إعادة المحاولة 🔄
        </button>
      </div>
    `;
        return;
    }

    container.innerHTML = services.map(p => {
        const title = p.name || p.title || p.service_name || "منتج رقمي";
        const id = p.service_id || p.id || "key";
        const price = p.price !== undefined ? p.price : (p.cost !== undefined ? p.cost : 0);
        const stock = p.stock !== undefined ? p.stock : (p.quantity !== undefined ? p.quantity : "متوفر");
        const isGemini = title.toLowerCase().includes('gemini');
        const imgUrl = getServiceImage(title, p.image_url || p.image);

        return `
      <div class="card-terminal rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xl">
        <div class="terminal-header px-4 py-2.5 flex items-center justify-between">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          <span class="mono-font text-[10px] text-gray-400 font-bold tracking-wider">~/keys/${id}.key</span>
        </div>

        <div>
          <div class="h-44 w-full p-4 flex items-center justify-center relative bg-gradient-to-b from-violet-950/20 to-transparent border-b border-gray-800/60">
            <img src="${imgUrl}" alt="${title}" loading="lazy" class="h-24 w-24 object-contain drop-shadow-xl hover:scale-105 transition duration-300" onerror="this.src='https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80'">
            ${isGemini ? '<span class="absolute top-3 right-3 bg-fuchsia-500/20 border border-fuchsia-500/40 text-fuchsia-300 text-[10px] font-black px-2.5 py-0.5 rounded-full shadow">18 شهر - تفعيل 24س</span>' : ''}
          </div>
          
          <div class="p-5 space-y-2">
            <h3 class="font-black text-base text-gray-100 leading-snug">${title}</h3>
            <div class="flex justify-between items-center text-xs">
              <span class="text-gray-400">المتوفر بالمخزن:</span>
              <span class="mono-font text-cyan-400 font-bold bg-cyan-950/40 border border-cyan-500/20 px-2 py-0.5 rounded-lg">${stock}</span>
            </div>
            <p class="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400 pt-1 mono-font">
              ${price} <span class="text-xs text-gray-400 font-normal">ج.م</span>
            </p>
          </div>
        </div>

        <div class="p-5 pt-0">
          <button onclick='openCheckout(${JSON.stringify({ ...p, name: title, service_id: id, price: price })})' class="w-full ${isMaintenanceActive ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white shadow-lg shadow-violet-950/50'} py-3 rounded-2xl text-xs font-black transition tracking-wider">
            ${isMaintenanceActive ? 'الصيانة مفعلة' : 'شراء وتفعيل فوري ⚡'}
          </button>
        </div>
      </div>
    `;
    }).join('');
}

async function loadProducts(forceRefresh = false) {
    const container = document.getElementById('products-list');
    if (container) {
        container.innerHTML = `
      <div class="col-span-1 md:col-span-3 text-center py-12 space-y-3">
        <div class="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-gray-400 text-xs mono-font">جاري جلب المنتجات والأسعار...</p>
      </div>
    `;
    }

    try {
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getProducts&_t=${Date.now()}`);
        const resText = await res.text();
        let data;

        try {
            data = JSON.parse(resText);
        } catch (e) {
            throw new Error("تأكد من إعدادات النشر (Deploy -> Who has access: Anyone)");
        }

        if (data.error && (!data.services || data.services.length === 0)) {
            throw new Error(data.error);
        }

        isMaintenanceActive = data.maintenance_mode === true;
        currentWalletNumber = data.wallet_number || "010XXXXXXXX";

        const banner = document.getElementById('maintenance-banner');
        if (banner) {
            if (isMaintenanceActive) {
                banner.classList.remove('hidden');
                document.getElementById('maintenance-banner-text').innerText = "المتجر في وضع الصيانة حالياً، إتمام عمليات الشراء متوقف مؤقتاً.";
            } else {
                banner.classList.add('hidden');
            }
        }

        const items = data.services || data.products || data.data || (Array.isArray(data) ? data : []);
        renderProducts(items);

    } catch (err) {
        if (container) {
            container.innerHTML = `
        <div class="col-span-1 md:col-span-3 card-terminal border border-rose-500/30 p-6 rounded-3xl text-center space-y-3">
          <p class="text-rose-400 font-bold text-sm">❌ تعذر تحميل المنتجات</p>
          <p class="text-gray-400 text-xs mono-font">${err.message}</p>
          <button onclick="loadProducts(true)" class="bg-gray-800 hover:bg-gray-700 text-gray-200 px-4 py-2 rounded-xl text-xs font-bold transition">
            إعادة المحاولة 🔄
          </button>
        </div>
      `;
        }
    }
}

function openCheckout(product) {
    if (isMaintenanceActive) {
        return alert("المتجر مغلق للصيانة حالياً ولا يمكن استقبال طلبات جديدة.");
    }
    selectedProduct = product;
    document.getElementById('modal-product-name').innerText = `إتمام طلب: ${product.name}`;
    document.getElementById('modal-wallet-display').innerText = currentWalletNumber;

    const warningBox = document.getElementById('gemini-warning');
    if (product.name.toLowerCase().includes('gemini')) {
        warningBox.classList.remove('hidden');
    } else {
        warningBox.classList.add('hidden');
    }

    document.getElementById('checkout-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('checkout-modal').classList.add('hidden');
}

function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

async function submitOrder() {
    const name = document.getElementById('cust-name').value.trim();
    const phone = document.getElementById('cust-phone').value.trim();
    const phoneRegex = /^01\d{9}$/ ; 
    const fileInput = document.getElementById('cust-screenshot');
    const submitBtn = document.getElementById('btn-submit-order');

    if (!name || !phone || !fileInput.files[0] || !phoneRegex.test(phone) || !isNaN(Number(name))) {
        return alert('يرجى كتابة الاسم، رقم الواتساب 11 رقم، وإرفاق صورة إيصال التحويل.');
    }

    const file = fileInput.files[0];
    if (file.size > 3 * 1024 * 1024) {
        return alert('حجم الصورة كبير جداً! الحد الأقصى المسموح به هو 3 ميجابايت.');
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "جاري رفع الإيصال وتأكيد الطلب...";

    try {
        const base64Image = await fileToBase64(file);

        const payload = {
            action: "createOrder",
            customer_name: name,
            whatsapp: phone,
            screenshot_base64: base64Image,
            service_id: selectedProduct.service_id,
            service_name: selectedProduct.name
        };

        const res = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.success) {
            saveToken(data.tracking_token);
            alert(`✅ تم إرسال طلبك بنجاح!\nرقم الطلب: ${data.order_id}\nتم حفظ رمز التتبع على جهازك تلقائياً.`);
            closeModal();
            switchTab('orders');
            fetchAndRenderOrder(data.tracking_token);
        } else {
            alert('خطأ: ' + (data.error || 'تعذر معالجة الطلب'));
        }
    } catch (err) {
        alert('حدث خطأ أثناء الإرسال: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerText = "تأكيد وإرسال الإيصال";
    }
}

async function fetchAndRenderOrder(trackingToken) {
    const container = document.getElementById('orders-results');

    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: "POST",
            body: JSON.stringify({ action: "trackOrder", tracking_token: trackingToken })
        });
        const data = await res.json();

        if (data.success && data.order) {
            const o = data.order;
            const status = String(o.status || 'pending').toLowerCase();
            const isGemini = o.service_name && o.service_name.toLowerCase().includes('gemini');

            let statusBadge = `<span class="text-amber-400 bg-amber-400/10 px-3 py-1 rounded-xl text-xs font-bold border border-amber-500/20">⏳ قيد المراجعة</span>`;
            let cardBorder = "border-gray-800";

            if (status === 'approved') {
                statusBadge = `<span class="text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-xl text-xs font-bold border border-emerald-500/20">✓ تم التسليم</span>`;
                cardBorder = "border-emerald-500/30";
            } else if (status === 'rejected') {
                statusBadge = `<span class="text-rose-400 bg-rose-400/10 px-3 py-1 rounded-xl text-xs font-bold border border-rose-500/20">✕ تم الرفض</span>`;
                cardBorder = "border-rose-500/30";
            }

            const itemHtml = `
        <div class="card-terminal ${cardBorder} p-6 rounded-3xl space-y-4 shadow-2xl transition mb-4">
          <div class="flex justify-between items-start flex-wrap gap-2 border-b border-gray-800 pb-3">
            <div>
              <p class="font-extrabold text-base text-gray-100">${o.service_name}</p>
              <p class="text-xs text-gray-400 mt-1">كود الطلب: <span class="mono-font text-cyan-300 font-bold">${o.order_id}</span></p>
            </div>
            <div>${statusBadge}</div>
          </div>

          ${status === 'approved' ? `
            <div class="bg-gray-950 border border-emerald-500/20 rounded-2xl p-4 space-y-2">
              <div class="flex justify-between items-center">
                <span class="text-xs text-emerald-400 font-bold">الكود الخاص بك:</span>
                <button onclick="navigator.clipboard.writeText('${o.code_or_reason}'); alert('تم نسخ الكود بنجاح!');" class="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded-lg text-xs font-bold transition shadow">
                  نسخ الكود 📋
                </button>
              </div>
              <p class="mono-font font-bold text-sm text-emerald-300 break-all select-all bg-gray-900 p-3 rounded-xl border border-gray-800 text-center">${o.code_or_reason}</p>
            </div>
            ${isGemini ? `
              <div class="p-3.5 bg-amber-950/40 border border-amber-500/40 rounded-2xl text-xs text-amber-300 leading-relaxed space-y-1">
                <p class="font-bold flex items-center gap-1.5 text-amber-200">
                  <span>⏳</span>
                  <span>معلومات هامة بخصوص التفعيل والضمان:</span>
                </p>
                <p>• <strong>مدة الاشتراك:</strong> يعمل معك لمدة <strong>18 شهراً</strong> كاملة.</p>
                <p>• <strong>صلاحية الرابط:</strong> رابط التفعيل صالح للاستخدام لمدة <strong>من 4 إلى 6 أيام</strong>.</p>
                <p>• <strong>الضمان:</strong> يُفضّل تفعيل الرابط خلال <strong>أول 24 ساعة</strong> لضمان الاستبدال أو الاسترجاع في حال واجهتك أي مشكلة.</p>
              </div>
            ` : ''}
          ` : ''}

          ${status === 'rejected' ? `
            <div class="bg-rose-950/30 border border-rose-500/20 rounded-2xl p-3.5 text-xs text-rose-300">
              <strong>سبب الرفض:</strong> ${o.code_or_reason || 'التحويل غير مطابق للمبلغ أو الإيصال غير واضح'}
            </div>
          ` : ''}

          ${status === 'pending' ? `
            <p class="text-xs text-gray-400 bg-gray-950 p-3.5 rounded-2xl border border-gray-800/80">
              طلبك قيد التحقق حالياً من قِبل الإدارة. سيظهر الكود هنا فور تأكيد التحويل المالي.
            </p>
          ` : ''}
        </div>
      `;
            container.innerHTML = itemHtml;
        } else {
            container.innerHTML = '<p class="text-gray-400 text-xs py-6 text-center">لم يتم العثور على بيانات لهذا الطلب.</p>';
        }
    } catch (e) {
        container.innerHTML = '<p class="text-rose-400 text-xs py-4 text-center">تعذر جلب تفاصيل الطلب.</p>';
    }
}

async function searchOrders() {
    const token = document.getElementById('order-search-input').value.trim();
    if (!token) return alert("يرجى إدخال رمز التتبع الخاص بالطلب (Tracking Token)");

    const btn = document.getElementById('btn-search-orders');
    btn.disabled = true;
    btn.innerText = "جاري البحث...";

    await fetchAndRenderOrder(token);

    btn.disabled = false;
    btn.innerText = "بحث 🔎";
}

function autoLoadRecentOrders() {
    const tokens = getSavedTokens();
    if (tokens.length > 0) {
        document.getElementById('order-search-input').value = tokens[0];
        fetchAndRenderOrder(tokens[0]);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    loadProducts();
});
