/* --- app.js (Com Persistência de Login) --- */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, runTransaction, query, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// --- 1. CONFIGURAÇÕES DO FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDHzO4EEriWRsbIwW6Dry0pQAww4e4d3-c",
  authDomain: "lista-de-presentes-e3c02.firebaseapp.com",
  projectId: "lista-de-presentes-e3c02",
  storageBucket: "lista-de-presentes-e3c02.appspot.com",
  messagingSenderId: "89325375943",
  appId: "1:89325375943:web:4cca547dbfcdbc0f5909e2",
  measurementId: "G-N421XQHTF8"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. VARIÁVEIS GLOBAIS E MEMÓRIA ---
let gifts = [];
let isAdminMode = false;

// MODIFICAÇÃO AQUI: Tenta recuperar o usuário da memória do navegador
let currentUser = localStorage.getItem('weddingUser') || null; 

let isViewOnly = false;
let activeSort = 'name';
let activeCategory = 'all';
const ADMIN_EMAIL = "admin@gmail.com"; 

// --- 3. ÍCONES SVG ---
const categoryIcons = {
    "Cozinha": `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>`,
    "Sala": `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>`,
    "Quarto": `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>`,
    "Banheiro": `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>`,
    "Decoração": `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>`,
    "Limpeza": `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" /></svg>`,
    "Outros": `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`
};

// --- 4. AUTENTICAÇÃO E ROTEAMENTO INTELIGENTE ---
onAuthStateChanged(auth, user => {
  const loader = document.getElementById('initialLoader');
  const landing = document.getElementById('landingPage');
  
  if (user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    console.log("Admin logado");
    isAdminMode = true;
    currentUser = "Admin";
    if(loader) loader.style.display = 'none';
    if(landing) landing.style.display = 'none';
    enterMainSite();
  } 
  // Verifica se existe usuário na variável (que veio do localStorage)
  else if (currentUser || isViewOnly) {
     console.log("Convidado recuperado da memória");
     if(loader) loader.style.display = 'none';
     if(landing) landing.style.display = 'none';
     enterMainSite();
  }
  else {
    console.log("Nenhum usuário. Mostrando capa.");
    if(loader) loader.style.display = 'none';
    if(landing) landing.style.display = 'flex';
  }
});

// --- 5. FUNÇÕES DE ACESSO (WINDOW) ---
window.openRSVPModal = () => document.getElementById('rsvpModal').classList.remove('hidden');
window.openLoginModal = () => document.getElementById('loginGuestModal').classList.remove('hidden');
window.openPixModal = () => document.getElementById('pixModal').classList.remove('hidden');

window.closeModals = () => {
    document.getElementById('rsvpModal').classList.add('hidden');
    document.getElementById('loginGuestModal').classList.add('hidden');
    document.getElementById('pixModal').classList.add('hidden');
}

window.handleRSVP = async (e) => {
    if(e) e.preventDefault();
    const name = document.getElementById('rsvpName').value.trim();
    if(!name) { alert("Por favor, digite seu nome."); return; }

    try {
        const guestsRef = collection(db, "guests");
        const q = query(guestsRef, where("name", "==", name));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            await addDoc(guestsRef, { name: name, confirmedAt: new Date().toISOString() });
        }
        
        currentUser = name;
        // MODIFICAÇÃO: Salva no localStorage
        localStorage.setItem('weddingUser', name);
        
        isViewOnly = false;
        window.closeModals();
        enterMainSite();
    } catch (error) {
        alert("Erro ao confirmar. Verifique sua conexão.");
        console.error(error);
    }
}

window.handleGuestLogin = async (e) => {
    if(e) e.preventDefault();
    const name = document.getElementById('loginGuestName').value.trim();
    if(!name) { alert("Por favor, digite seu nome."); return; }

    try {
        const q = query(collection(db, "guests"), where("name", "==", name));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("Nome não encontrado. Confirme sua presença primeiro.");
            window.closeModals();
            window.openRSVPModal();
            document.getElementById('rsvpName').value = name;
        } else {
            currentUser = name;
            // MODIFICAÇÃO: Salva no localStorage
            localStorage.setItem('weddingUser', name);
            
            isViewOnly = false;
            window.closeModals();
            enterMainSite();
        }
    } catch (error) { console.error(error); }
}

window.enterViewOnly = () => {
    currentUser = null;
    isViewOnly = true;
    enterMainSite();
}

window.logoutGuest = () => {
    if(isAdminMode) {
        signOut(auth);
    }
    // MODIFICAÇÃO: Limpa a memória ao sair
    localStorage.removeItem('weddingUser');
    currentUser = null;
    window.location.reload();
}

// --- 6. UI GERAL ---
function enterMainSite() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('mainContent').style.display = 'block';
    fetchGifts();
    updateUI();
}

function updateUI() {
    const welcome = document.getElementById('guestWelcome');
    const indicator = document.getElementById('modeIndicator');
    const body = document.body;
    
    if (isAdminMode) {
        indicator.innerHTML = 'Painel Administrativo';
        body.classList.remove('user-mode');
        welcome.innerHTML = 'Modo Edição Ativo';
        welcome.classList.remove('hidden');
    } else if (currentUser) {
        indicator.innerHTML = 'Acesso Confirmado';
        body.classList.add('user-mode');
        welcome.innerHTML = `Olá, ${currentUser}`;
        welcome.classList.remove('hidden');
    } else {
        indicator.innerHTML = 'Apenas Visualizando';
        body.classList.add('user-mode');
        welcome.classList.add('hidden');
    }
}

// --- 7. CARREGAMENTO E RENDERIZAÇÃO ---
async function fetchMetaImage(url) {
    try {
        const apiUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&palette=true`;
        const response = await fetch(apiUrl);
        const data = await response.json();
        if (data.status === 'success' && data.data.image && data.data.image.url) return data.data.image.url;
        return null;
    } catch (error) { return null; }
}

async function fetchGifts() {
    const list = document.getElementById('availableGiftsList');
    if (list) list.innerHTML = '<p class="col-span-3 text-center text-gray-400 text-sm py-8 tracking-wide">Carregando a lista...</p>';
    try {
        const snapshot = await getDocs(collection(db, 'gifts'));
        gifts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        renderGifts();
    } catch (error) { console.error("Erro ao buscar presentes:", error); }
}

window.updateFilters = () => {
    activeSort = document.getElementById('sortFilter').value;
    activeCategory = document.getElementById('categoryFilter').value;
    renderGifts();
}

function renderGifts() {
    const availableList = document.getElementById('availableGiftsList');
    const reservedList = document.getElementById('reservedGiftsList');
    const reservedSection = document.getElementById('reservedSection');
    
    availableList.innerHTML = '';
    reservedList.innerHTML = '';

    let filtered = gifts;
    if(activeCategory !== 'all') filtered = gifts.filter(g => g.category === activeCategory);
    
    filtered.sort((a, b) => {
        if(activeSort === 'name') return a.name.localeCompare(b.name);
        if(activeSort === 'price-asc') return (a.price||0) - (b.price||0);
        if(activeSort === 'price-desc') return (b.price||0) - (a.price||0);
        return 0;
    });

    const avail = filtered.filter(g => !g.purchased);
    const reserv = filtered.filter(g => g.purchased);

    document.getElementById('available-title').innerHTML = `Disponíveis <span class="bg-wedding-50 text-wedding-800 text-lg font-bold px-3 py-1 rounded-full ml-2 align-middle">${avail.length}</span>`;
    document.getElementById('reserved-title').innerHTML = `Garantidos <span class="bg-gray-100 text-gray-500 text-lg font-bold px-3 py-1 rounded-full ml-2 align-middle">${reserv.length}</span>`;

    const createCard = (gift, isReserved, index) => {
        const defaultImg = "https://placehold.co/400x300/f4f7f5/cbd5e1?text=Sem+Foto";
        const img = (gift.image && gift.image.trim()) ? gift.image : defaultImg;
        const price = gift.price ? gift.price.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) : '';
        const icon = categoryIcons[gift.category] || categoryIcons["Outros"];
        
        const adminBtns = isAdminMode ? `
            <div class="admin-controls">
                <button onclick="editItem('${gift.id}')" class="admin-btn text-blue-600 hover:bg-blue-50" title="Editar">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                </button>
                <button onclick="deleteItem('${gift.id}')" class="admin-btn text-red-600 hover:bg-red-50" title="Excluir">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
            </div>` : '';

        let actions = '';

        if(isReserved) {
            const isMine = currentUser && gift.purchasedBy === currentUser;
            actions = `
                <div class="mt-4 pt-4 border-t border-gray-50">
                    <p class="text-[10px] uppercase tracking-wider text-center text-gray-400 mb-1">Reservado por</p>
                    <p class="text-sm font-bold text-center text-wedding-800 bg-wedding-50 p-1.5 rounded">${gift.purchasedBy}</p>
                    ${(isMine && !isAdminMode) ? `<button onclick="cancelRes('${gift.id}')" class="w-full mt-2 text-xs text-red-400 hover:text-red-600 underline">Cancelar minha reserva</button>` : ''}
                    ${isAdminMode ? `<button onclick="toggleStatus('${gift.id}', true)" class="w-full mt-2 text-xs text-blue-400 hover:text-blue-600 underline">Admin: Liberar</button>` : ''}
                </div>`;
        } else {
            if(isAdminMode) {
                actions = `
                    <div class="mt-auto pt-4 space-y-2 border-t border-dashed border-gray-100 mt-4">
                        <button onclick="openLink('${gift.link}')" class="text-xs w-full text-center text-wedding-600 hover:underline flex items-center justify-center gap-1">
                           Testar Link <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                        </button>
                    </div>`;
            } 
            else if(isViewOnly) {
                actions = `
                    <div class="mt-auto pt-4 space-y-2">
                        <button onclick="openLink('${gift.link}')" class="w-full py-2 border border-gray-200 text-gray-500 rounded text-sm hover:bg-gray-50 transition-colors">Ver na Loja</button>
                        <button disabled class="w-full py-2 bg-gray-100 text-gray-400 rounded text-sm cursor-not-allowed">Login p/ Reservar</button>
                    </div>`;
            } 
            else {
                actions = `
                    <div class="mt-auto pt-4 space-y-2">
                        <button onclick="openLink('${gift.link}')" class="w-full py-2 border border-gray-200 text-gray-500 rounded text-sm hover:bg-gray-50 transition-colors">Ver na Loja</button>
                        <button onclick="openResModal('${gift.id}')" class="w-full py-2 bg-wedding-600 text-white rounded text-sm hover:bg-wedding-800 shadow-sm transition-all font-medium">Presentear</button>
                    </div>`;
            }
        }

        return `
            <div class="item-card bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 flex flex-col ${isReserved ? 'opacity-80' : ''}">
                <div class="relative">
                    ${adminBtns}
                    <div class="h-48 w-full bg-white flex items-center justify-center overflow-hidden p-4 border-b border-gray-50">
                        <img src="${img}" class="max-h-full object-contain transition-transform duration-500 hover:scale-105 ${isReserved ? 'grayscale opacity-50' : ''}" onerror="this.src='${defaultImg}'">
                    </div>
                    ${isReserved ? '<div class="absolute inset-0 flex items-center justify-center bg-white/40 backdrop-blur-[1px]"><span class="bg-gray-800 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-md">Garantido</span></div>' : ''}
                </div>
                
                <div class="p-5 flex flex-col flex-grow">
                    <div class="flex justify-between items-start mb-2">
                        <span class="inline-flex items-center gap-1 bg-wedding-50 text-wedding-800 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                            ${icon} ${gift.category}
                        </span>
                    </div>
                    
                    <h3 class="text-base font-serif font-bold text-gray-800 leading-tight mb-1 ${isReserved?'line-through text-gray-400':''}">${gift.name}</h3>
                    ${!isReserved && price ? `<div class="text-sm font-medium text-wedding-600 mb-2">${price}</div>` : ''}
                    
                    ${actions}
                </div>
            </div>`;
    };

    if(avail.length === 0 && reserv.length === 0) availableList.innerHTML = '<p class="col-span-3 text-center text-gray-400 text-sm">Nenhum item encontrado.</p>';
    else avail.forEach((g, i) => availableList.innerHTML += createCard(g, false, i));

    if(reserv.length > 0) {
        reservedSection.classList.remove('hidden');
        reserv.forEach((g, i) => reservedList.innerHTML += createCard(g, true, i));
    } else reservedSection.classList.add('hidden');
}

// --- 8. FUNÇÕES AUXILIARES E CRUD ---
window.maskCurrency = (input) => {
    let v = input.value.replace(/\D/g,"");
    if(!v) return input.value="";
    input.value = (Number(v)/100).toLocaleString("pt-BR", {style:"currency", currency:"BRL"});
}

window.addItem = async (e) => {
    e.preventDefault(); if(!isAdminMode) return;
    const btn = document.getElementById('btnAddSubmit');
    const oldTxt = btn.innerText; btn.innerText = "..."; btn.disabled = true;
    
    const name = document.getElementById('itemName').value;
    const link = document.getElementById('itemLink').value;
    const cat = document.getElementById('itemCategory').value;
    const manualImg = document.getElementById('itemImageManual').value;
    
    let price = document.getElementById('itemPrice').value.replace(/[^\d,]/g, '').replace(',', '.');
    price = parseFloat(price) || 0;

    let image = (manualImg) ? manualImg : await fetchMetaImage(link);
    if(!image) image = "";

    try {
        await addDoc(collection(db, 'gifts'), { name, link, category: cat, price, image, purchased: false, purchasedBy: "" });
        window.hideAddForm(); fetchGifts();
    } catch(err) { console.error(err); alert("Erro ao adicionar."); } 
    finally { btn.innerText = oldTxt; btn.disabled = false; }
}

window.updateItem = async (e) => {
    e.preventDefault(); if(!isAdminMode) return;
    const id = document.getElementById('editItemId').value;
    const name = document.getElementById('editItemName').value;
    const link = document.getElementById('editItemLink').value;
    const cat = document.getElementById('editItemCategory').value;
    const manualImg = document.getElementById('editItemImageManual').value;
    const currImg = document.getElementById('editItemCurrentImg').value;
    let price = document.getElementById('editItemPrice').value.replace(/[^\d,]/g, '').replace(',', '.');
    price = parseFloat(price) || 0;
    let image = manualImg ? manualImg : ((!currImg) ? await fetchMetaImage(link) : currImg);
    try { await updateDoc(doc(db, 'gifts', id), { name, link, category: cat, price, image }); window.hideEditModal(); fetchGifts(); } catch(err){console.error(err);}
}

window.showAddForm = () => document.getElementById('addForm').classList.remove('hidden');
window.hideAddForm = () => { document.getElementById('addForm').classList.add('hidden'); document.getElementById('addForm').querySelector('form').reset(); }
window.hideEditModal = () => document.getElementById('editModal').classList.add('hidden');

window.editItem = (id) => {
    const g = gifts.find(x => x.id === id);
    if(!g) return;
    document.getElementById('editItemId').value = id;
    document.getElementById('editItemName').value = g.name;
    document.getElementById('editItemLink').value = g.link;
    document.getElementById('editItemCategory').value = g.category;
    document.getElementById('editItemPrice').value = g.price ? g.price.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) : '';
    document.getElementById('editItemImageManual').value = g.image || '';
    document.getElementById('editItemCurrentImg').value = g.image || '';
    document.getElementById('editModal').classList.remove('hidden');
}

window.deleteItem = async (id) => { if(confirm("Tem certeza que deseja excluir?")) { await deleteDoc(doc(db, 'gifts', id)); fetchGifts(); } }
window.toggleStatus = async (id, st) => { await updateDoc(doc(db, 'gifts', id), { purchased: !st, purchasedBy: !st?"Admin":"" }); fetchGifts(); }
window.openLink = (url) => window.open(url, '_blank');
window.copyPix = () => navigator.clipboard.writeText(document.getElementById('pixKey').innerText).then(()=>alert("Chave PIX copiada!"));

window.openResModal = (id) => {
    document.getElementById('reserveGiftId').value = id;
    document.getElementById('reserveGuestNameDisplay').innerText = currentUser;
    document.getElementById('reserveModal').classList.remove('hidden');
}
window.hideReserveModal = () => document.getElementById('reserveModal').classList.add('hidden');

const reserveForm = document.getElementById('reserveForm');
if(reserveForm) {
    reserveForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('reserveGiftId').value;
        try {
            await runTransaction(db, async (t) => {
                const d = await t.get(doc(db, 'gifts', id));
                if(d.data().purchased) throw "Já reservado.";
                t.update(doc(db, 'gifts', id), { purchased: true, purchasedBy: currentUser });
            });
            window.hideReserveModal(); fetchGifts();
        } catch(err) { alert("Este item já foi reservado por outra pessoa."); window.hideReserveModal(); fetchGifts(); }
    });
}

window.cancelRes = async (id) => {
    if(confirm("Tem certeza que deseja cancelar sua reserva?")) {
        try { await updateDoc(doc(db, 'gifts', id), { purchased: false, purchasedBy: "" }); fetchGifts(); } catch(err) { alert(err.message); }
    }
}