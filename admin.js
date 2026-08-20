// Set your deployed Web App URL here
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzFKTrt7NLEBkhI4Ea2birS-BGpJRZuiplidJ0_PbkiE4R5S8VMbtGRsQfHpNh1jM5P/exec";

let adminToken = "";
let currentOrders = [];
let hiddenProductsList = [];
let allServicesCache = [];

// ==========================================
// Authentication
// ==========================================
async function adminLogin() {
  const passInput = document.getElementById("admin-pass-input");
  const btn = document.getElementById("btn-login");
  const pass = passInput.value.trim();

  if (!pass) return;

  btn.disabled = true;
  btn.innerText = "جاري التحقق...";

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "adminLogin", pass: pass })
    });
    const data = await res.json();

    if (data.error) {
      alert("كلمة المرور غير صحيحة!");
    } else {
      adminToken = pass;
      sessionStorage.setItem("cv_admin_token", pass);
      document.getElementById("login-section").classList.add("hidden");
      document.getElementById("dashboard-section").classList.remove("hidden");
      document.getElementById("admin-actions-bar").classList.remove("hidden");
      loadDashboardData();
    }
  } catch (err) {
    alert("تعذر الاتصال بالخادم: " + err.message);
  } finally {
    btn.disabled = false;
    btn.innerText = "دخول للوحة التحكم 🚀";
  }
}

function adminLogout() {
  sessionStorage.removeItem("cv_admin_token");
  location.reload();
}

// ==========================================
// Dashboard Data Fetcher
// ==========================================
async function loadDashboardData() {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "adminGetOrders", pass: adminToken })
    });
    const data = await res.json();

    if (data.settings) {
      document.getElementById("setting-wallet-input").value = data.settings.wallet_number || "";
      updateMaintenanceUI(data.settings.maintenance_mode === true);
      hiddenProductsList = Array.isArray(data.settings.hidden_products) ? data.settings.hidden_products : [];
    }

    if (data.all_services) {
      allServicesCache = data.all_services;
      renderAdminProducts(data.all_services, hiddenProductsList);
    }

    if (data.orders) {
      currentOrders = data.orders;
      renderOrders(data.orders);
      updateStats(data.orders);
    }
  } catch (err) {
    console.error("فشل جلب بيانات الإدارة:", err);
  }
}

function updateStats(orders) {
  const pending = orders.filter(o => String(o.status).toLowerCase() === "pending").length;
  const approved = orders.filter(o => String(o.status).toLowerCase() === "approved").length;

  document.getElementById("stat-pending").innerText = pending;
  document.getElementById("stat-approved").innerText = approved;
  document.getElementById("stat-total").innerText = orders.length;
  document.getElementById("orders-count-badge").innerText = `${orders.length} سجل`;
}

// ==========================================
// Product Visibility Management (Optimistic UI)
// ==========================================
function renderAdminProducts(services, hiddenList) {
  if (services) allServicesCache = services;
  hiddenProductsList = Array.isArray(hiddenList) ? hiddenList : hiddenProductsList;

  const container = document.getElementById("admin-products-list");
  if (!container) return;

  if (!allServicesCache || allServicesCache.length === 0) {
    container.innerHTML = `<p class="text-gray-500 text-xs col-span-full text-center py-2">لا توجد خدمات متاحة حالياً.</p>`;
    return;
  }

  container.innerHTML = allServicesCache.map(p => {
    const id = String(p.service_id || p.id);
    const title = p.name || p.title || "منتج رقمي";
    const isHidden = hiddenProductsList.includes(id);

    return `
      <div id="product-card-${id}" class="bg-gray-950 border ${isHidden ? 'border-rose-500/20 bg-rose-950/5' : 'border-emerald-500/20 bg-emerald-950/5'} p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all duration-200">
        <div class="space-y-0.5 overflow-hidden">
          <p id="product-title-${id}" class="font-bold text-xs ${isHidden ? 'text-gray-400 line-through' : 'text-gray-100'} truncate transition-colors duration-200">${title}</p>
          <div class="flex items-center gap-2">
            <span class="mono-font text-[10px] text-gray-500">${id}</span>
            <span id="product-status-${id}" class="text-[10px] font-bold ${isHidden ? 'text-rose-400' : 'text-emerald-400'} transition-colors duration-200">
              ${isHidden ? '• غير معروض' : '• معروض للبيع'}
            </span>
          </div>
        </div>

        <button 
          id="btn-toggle-${id}"
          onclick="toggleProductFast('${id}')" 
          class="shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-1.5 ${
            isHidden 
              ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30' 
              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          }">
          <span>${isHidden ? 'إظهار 👁️' : 'إخفاء 🚫'}</span>
        </button>
      </div>
    `;
  }).join("");
}

async function toggleProductFast(serviceId) {
  const card = document.getElementById(`product-card-${serviceId}`);
  const title = document.getElementById(`product-title-${serviceId}`);
  const status = document.getElementById(`product-status-${serviceId}`);
  const btn = document.getElementById(`btn-toggle-${serviceId}`);

  const wasHidden = hiddenProductsList.includes(serviceId);
  const nowHidden = !wasHidden;

  // 1. Optimistic Local State Update
  if (nowHidden) {
    hiddenProductsList.push(serviceId);
  } else {
    hiddenProductsList = hiddenProductsList.filter(id => id !== serviceId);
  }

  // 2. Instant Visual Transition
  if (card && title && status && btn) {
    card.className = `bg-gray-950 border ${nowHidden ? 'border-rose-500/20 bg-rose-950/5' : 'border-emerald-500/20 bg-emerald-950/5'} p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all duration-200`;
    title.className = `font-bold text-xs ${nowHidden ? 'text-gray-400 line-through' : 'text-gray-100'} truncate transition-colors duration-200`;
    status.className = `text-[10px] font-bold ${nowHidden ? 'text-rose-400' : 'text-emerald-400'} transition-colors duration-200`;
    status.innerText = nowHidden ? '• غير معروض' : '• معروض للبيع';

    btn.className = `shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-200 flex items-center gap-1.5 ${
      nowHidden 
        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30' 
        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
    }`;
    btn.innerHTML = `<span>${nowHidden ? 'إظهار 👁️' : 'إخفاء 🚫'}</span>`;
  }

  // 3. Background Network Synchronization
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({
        action: "toggleProductVisibility",
        pass: adminToken,
        service_id: serviceId
      })
    });
    const data = await res.json();

    if (data.success) {
      hiddenProductsList = data.hidden_products;
    } else {
      throw new Error(data.error || "فشل التعديل");
    }
  } catch (err) {
    alert("تعذر حفظ التغيير على السيرفر: " + err.message);
    // Rollback state upon failure
    if (wasHidden) {
      hiddenProductsList.push(serviceId);
    } else {
      hiddenProductsList = hiddenProductsList.filter(id => id !== serviceId);
    }
    renderAdminProducts();
  }
}

// ==========================================
// Orders Table & Processing
// ==========================================
function renderOrders(orders) {
  const tbody = document.getElementById("orders-table-body");
  if (!orders || orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-10 text-gray-500">لا توجد طلبات مسجلة حالياً.</td></tr>`;
    return;
  }

  tbody.innerHTML = orders.map(o => {
    const status = String(o.status || "pending").toLowerCase();

    let statusBadge = `<span class="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">⏳ معلق</span>`;
    if (status === "approved") {
      statusBadge = `<span class="px-2.5 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold">✓ مكتمل</span>`;
    } else if (status === "rejected") {
      statusBadge = `<span class="px-2.5 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold">✕ مرفوض</span>`;
    }

    const cleanPhone = String(o.whatsapp || "").replace(/\D/g, "");
    const waLink = `https://wa.me/2${cleanPhone}`;

    return `
      <tr class="hover:bg-violet-950/20 transition">
        <td class="p-4 mono-font font-bold text-gray-200">${o.order_id}</td>
        <td class="p-4">
          <p class="font-bold text-gray-100">${o.customer_name}</p>
          <a href="${waLink}" target="_blank" class="text-[11px] text-cyan-400 hover:underline mono-font flex items-center gap-1 mt-0.5">
            <span>💬 ${o.whatsapp}</span>
          </a>
        </td>
        <td class="p-4 font-bold text-gray-200">${o.service_name || o.service_id}</td>
        <td class="p-4">
          ${o.screenshot_url && o.screenshot_url.startsWith('http') 
            ? `<button onclick="viewReceipt('${o.screenshot_url}')" class="bg-gray-900 hover:bg-gray-800 border border-gray-700 text-cyan-300 px-2.5 py-1 rounded-lg text-[11px] font-bold transition">عرض الإيصال 🖼️</button>` 
            : `<span class="text-gray-500 text-[11px]">لا يوجد</span>`}
        </td>
        <td class="p-4">${statusBadge}</td>
        <td class="p-4 mono-font text-cyan-300 font-bold max-w-xs break-all select-all">${o.code_or_reason || "-"}</td>
        <td class="p-4 text-center">
          ${status === "pending" ? `
            <div class="flex items-center justify-center gap-1.5">
              <button onclick="approveOrder('${o.order_id}')" class="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-xl font-bold transition shadow-sm">
                موافقة وشراء
              </button>
              <button onclick="rejectOrder('${o.order_id}')" class="bg-rose-600/20 hover:bg-rose-600/40 border border-rose-500/30 text-rose-300 px-2.5 py-1.5 rounded-xl font-bold transition">
                رفض
              </button>
            </div>
          ` : `
            <span class="text-[11px] text-gray-500 mono-font">تمت المعالجة</span>
          `}
        </td>
      </tr>
    `;
  }).join("");
}

async function approveOrder(orderId) {
  if (!confirm(`هل أنت متأكد من الموافقة على الطلب ${orderId} وطلب الكود من المزود؟`)) return;

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "approveOrder", pass: adminToken, order_id: orderId })
    });
    const data = await res.json();

    if (data.success) {
      alert(`✅ تم إصدار الكود بنجاح:\n${data.code}`);
      loadDashboardData();
    } else {
      alert("❌ حدث خطأ: " + (data.error || "تعذر الشراء"));
    }
  } catch (err) {
    alert("تعذر الاتصال بالخادم: " + err.message);
  }
}

async function rejectOrder(orderId) {
  const reason = prompt("يرجى كتابة سبب رفض الطلب:", "التحويل غير مطابق للمبلغ المطلوب");
  if (!reason) return;

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "rejectOrder", pass: adminToken, order_id: orderId, reason: reason })
    });
    const data = await res.json();

    if (data.success) {
      alert("تم تسجيل رفض الطلب.");
      loadDashboardData();
    } else {
      alert("خطأ: " + data.error);
    }
  } catch (err) {
    alert("تعذر الرفض: " + err.message);
  }
}

// ==========================================
// Settings Controls
// ==========================================
async function updateWalletSetting() {
  const newNumber = document.getElementById("setting-wallet-input").value.trim();
  if (!newNumber) return;

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "updateSetting", pass: adminToken, key: "wallet_number", value: newNumber })
    });
    const data = await res.json();
    if (data.success) alert("✅ تم تحديث رقم المحفظة بنجاح!");
  } catch (e) {
    alert("فشل التحديث: " + e.message);
  }
}

async function toggleMaintenanceSetting() {
  const currentText = document.getElementById("stat-maintenance-status").innerText;
  const newMode = !currentText.includes("صيانة");

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "updateSetting", pass: adminToken, key: "maintenance_mode", value: String(newMode) })
    });
    const data = await res.json();
    if (data.success) {
      updateMaintenanceUI(newMode);
      alert(`تم ${newMode ? "تفعيل وضع الصيانة" : "إلغاء وضع الصيانة وإتاحة المتجر"}`);
    }
  } catch (e) {
    alert("فشل تعديل الحالة: " + e.message);
  }
}

function updateMaintenanceUI(isMaint) {
  const badge = document.getElementById("stat-maintenance-status");
  const btn = document.getElementById("btn-toggle-maintenance");

  if (isMaint) {
    badge.innerText = "وضع الصيانة مفعل ⚠️";
    badge.className = "text-sm font-bold text-rose-400";
    btn.innerText = "إيقاف الصيانة 🟢";
    btn.className = "px-4 py-1.5 rounded-xl text-xs font-black bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30";
  } else {
    badge.innerText = "المتجر يعمل طبيعي ✅";
    badge.className = "text-sm font-bold text-emerald-400";
    btn.innerText = "تفعيل وضع الصيانة 🔴";
    btn.className = "px-4 py-1.5 rounded-xl text-xs font-black bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30";
  }
}

async function syncLatestAIVerseOrders() {
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      body: JSON.stringify({ action: "getAIVerseOrders", pass: adminToken })
    });
    const data = await res.json();
    const ordersList = Array.isArray(data) ? data : (data.orders || data.data || []);

    if (ordersList.length > 0) {
      const latest = ordersList[0];
      const serviceTitle = latest.service || latest.service_name || latest.name || latest.service_id || "طلب غير محدد";
      
      let codeDelivered = "لا يوجد كود";
      if (latest.delivered_products && Array.isArray(latest.delivered_products) && latest.delivered_products.length > 0) {
        codeDelivered = latest.delivered_products.join(" | ");
      } else if (latest.products && Array.isArray(latest.products) && latest.products.length > 0) {
        codeDelivered = latest.products.join(" | ");
      } else if (latest.code || latest.product) {
        codeDelivered = latest.code || latest.product;
      }

      alert(`📋 آخر عملية على AIVerse:\n• الخدمة: ${serviceTitle}\n• الحالة: ${latest.status || "N/A"}\n• الكود المستلم: ${codeDelivered}`);
    } else {
      alert(data.error || "لا توجد طلبات في سجل AIVerse.");
    }
  } catch (err) {
    alert("فشل المزامنة: " + err.message);
  }
}
// ==========================================
// Modal & Initialization
// ==========================================
function viewReceipt(url) {
  document.getElementById("modal-preview-img").src = url;
  document.getElementById("modal-img-link").href = url;
  document.getElementById("image-modal").classList.remove("hidden");
}

function closeImageModal() {
  document.getElementById("image-modal").classList.add("hidden");
}

document.addEventListener("DOMContentLoaded", () => {
  const savedToken = sessionStorage.getItem("cv_admin_token");
  if (savedToken) {
    document.getElementById("admin-pass-input").value = savedToken;
    adminLogin();
  }
});
