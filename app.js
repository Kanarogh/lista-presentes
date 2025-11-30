/* --- app.js (Versão Corrigida) --- */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, runTransaction, query, where } from "https://www.gstatic.com/firebasejs/9.15.0/firebase-firestore.js";

// SUAS CONFIGURAÇÕES (Mantenha as suas chaves aqui)
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

// VARIÁVEIS GLOBAIS
let gifts = [];
let isAdminMode = false;
let currentUser = null;
let isViewOnly = false;
let activeSort = 'name';
let activeCategory = 'all';
const ADMIN_EMAIL = "admin2@gmail.com";
const categoryEmojis = { Cozinha: "🍳", Sala: "🛋", Quarto: "🛏", Banheiro: "🚿", Decoração: "🎨", Limpeza: "🧽", Outros: "📦" };

// AUTH ADMIN
onAuthStateChanged(auth, user => {
  if (user && user.email === ADMIN_EMAIL) {
    isAdminMode = true;
    currentUser = "Admin";
    console.log("Admin logado");
    enterMainSite();
  }
});

// ==========================================
// FUNÇÕES DE JANELA (WINDOW) - MODAIS
// ==========================================

window.openRSVPModal = () => document.getElementById('rsvpModal').classList.remove('hidden');
window.openLoginModal = () => document.getElementById('loginGuestModal').classList.remove('hidden');
window.openPixModal = () => document.getElementById('pixModal').classList.remove('hidden');

window.closeModals = () => {
    document.getElementById('rsvpModal').classList.add('hidden');
    document.getElementById('loginGuestModal').classList.add('hidden');
    document.getElementById('pixModal').classList.add('hidden');
}

// ==========================================
// LÓGICA DE RSVP E LOGIN (AQUI ESTAVA O PROBLEMA)
// ==========================================

// 1. CONFIRMAR PRESENÇA
window.handleRSVP = async (e) => {
    if(e) e.preventDefault(); // Impede recarregar a página
    console.log("Iniciando RSVP...");

    const nameInput = document.getElementById('rsvpName');
    const name = nameInput.value.trim();

    if(!name) { alert("Por favor, digite seu nome."); return; }

    try {
        console.log("Verificando se nome existe:", name);
        // Cria a query para buscar o nome
        const guestsRef = collection(db, "guests");
        const q = query(guestsRef, where("name", "==", name));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("Nome novo. Salvando...");
            // Salva no banco
            await addDoc(guestsRef, { 
                name: name, 
                confirmedAt: new Date().toISOString() 
            });
            alert("Presença confirmada com sucesso! Bem-vindo(a).");
        } else {
            console.log("Nome já existe.");
            alert("Você já tinha confirmado presença! Redirecionando...");
        }

        // Sucesso: Entra no site
        currentUser = name;
        isViewOnly = false;
        window.closeModals();
        enterMainSite();

    } catch (error) {
        console.error("ERRO NO RSVP:", error);
        alert("Erro ao confirmar presença:\n" + error.message + "\n\nVerifique se as Regras do Firestore estão liberadas.");
    }
}

// 2. JÁ RESERVEI (LOGIN)
window.handleGuestLogin = async (e) => {
    if(e) e.preventDefault();
    console.log("Iniciando Login de Convidado...");

    const nameInput = document.getElementById('loginGuestName');
    const name = nameInput.value.trim();

    if(!name) { alert("Digite seu nome."); return; }

    try {
        const guestsRef = collection(db, "guests");
        const q = query(guestsRef, where("name", "==", name));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log("Usuário não encontrado.");
            alert("Não encontramos este nome na lista de confirmados.\nPor favor, confirme sua presença primeiro.");
            window.closeModals();
            window.openRSVPModal();
            // Preenche o nome lá no outro formulário pra facilitar
            document.getElementById('rsvpName').value = name;
        } else {
            console.log("Usuário encontrado!");
            currentUser = name;
            isViewOnly = false;
            window.closeModals();
            enterMainSite();
        }
    } catch (error) {
        console.error("ERRO NO LOGIN:", error);
        alert("Erro ao verificar nome:\n" + error.message);
    }
}

// 3. ENTRAR SÓ PRA OLHAR
window.enterViewOnly = () => {
    console.log("Entrando modo espião");
    currentUser = null;
    isViewOnly = true;
    enterMainSite();
}
// 3. AUTHENTICAÇÃO E ROTEAMENTO INTELIGENTE
onAuthStateChanged(auth, user => {
  const loader = document.getElementById('initialLoader');
  const landing = document.getElementById('landingPage');

  // Verifica se é Admin (com proteção contra letras maiúsculas/minúsculas)
  if (user && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    console.log("Admin detectado! Redirecionando para o painel...");
    isAdminMode = true;
    currentUser = "Admin";
    
    // Remove o loader e entra direto na lista
    if(loader) loader.style.display = 'none';
    enterMainSite();
  } 
  else {
    // Se não for admin, verifica se tem convidado "logado" na memória (navegador)
    // Se não tiver ninguém, mostra a capa (Landing Page)
    if (!currentUser && !isViewOnly) {
        if(loader) loader.style.display = 'none';
        if(landing) landing.style.display = 'flex'; // Mostra a capa agora
    } else {
        // Caso raro: se já tiver convidado na memória, entra direto
        if(loader) loader.style.display = 'none';
        enterMainSite();
    }
  }
});
// 4. SAIR
window.logoutGuest = () => {
    if(isAdminMode) signOut(auth);
    window.location.reload();
}

// ==========================================
// FUNÇÕES PRINCIPAIS DO SITE
// ==========================================

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
        indicator.innerHTML = '🔧 Modo Administrador';
        body.classList.remove('user-mode');
        welcome.innerHTML = 'Olá, Admin!';
        welcome.classList.remove('hidden');
    } else if (currentUser) {
        indicator.innerHTML = '✅ Presença Confirmada';
        body.classList.add('user-mode');
        welcome.innerHTML = `Olá, <strong>${currentUser}</strong>!`;
        welcome.classList.remove('hidden');
    } else {
        indicator.innerHTML = '👀 Apenas Espiando';
        body.classList.add('user-mode');
        welcome.classList.add('hidden');
    }
}

// ==========================================
// API E FIREBASE DE PRESENTES
// ==========================================

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
    if (list) list.innerHTML = '<p class="col-span-3 text-center text-gray-400">Carregando lista...</p>';
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

// --- SUBSTITUA APENAS A FUNÇÃO renderGifts NO SEU app.js ---

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

    document.getElementById('available-title').innerHTML = `🎁 Disponíveis <span class="count-badge">${avail.length}</span>`;
    document.getElementById('reserved-title').innerHTML = `✅ Já Reservados <span class="count-badge">${reserv.length}</span>`;

    const createCard = (gift, isReserved, index) => {
        const defaultImg = "https://placehold.co/400x300/e2e8f0/94a3b8?text=Sem+Imagem";
        const img = (gift.image && gift.image.trim()) ? gift.image : defaultImg;
        const price = gift.price ? gift.price.toLocaleString('pt-BR', {style:'currency', currency:'BRL'}) : '';
        
        // Botões de Edição/Exclusão (Só aparecem para Admin)
        const adminBtns = isAdminMode ? `
            <div class="admin-controls">
                <button onclick="editItem('${gift.id}')" class="admin-btn">✏️</button>
                <button onclick="deleteItem('${gift.id}')" class="admin-btn">🗑️</button>
            </div>` : '';

        let actions = '';

        if(isReserved) {
            // === ITEM RESERVADO ===
            const isMine = currentUser && gift.purchasedBy === currentUser;
            actions = `
                <div class="mt-4 pt-4 border-t border-gray-100">
                    <p class="text-xs text-center text-gray-500 bg-gray-50 p-2 rounded">Reservado por: <strong>${gift.purchasedBy}</strong></p>
                    ${(isMine && !isAdminMode) ? `<button onclick="cancelRes('${gift.id}')" class="danger-button w-full mt-2 text-xs">Cancelar minha reserva</button>` : ''}
                    ${isAdminMode ? `<button onclick="toggleStatus('${gift.id}', true)" class="text-xs text-blue-500 w-full mt-2 hover:underline">Admin: Liberar Item</button>` : ''}
                </div>`;
        } else {
            // === ITEM DISPONÍVEL ===
            
            if(isAdminMode) {
                // VISÃO DO ADMIN (O que mudamos agora)
                // Link funciona (para testar), Botão de Presentear bloqueado (visual)
                actions = `
                    <div class="mt-auto pt-4 space-y-2 border-t border-dashed border-gray-200 mt-4">
                        <p class="text-xs text-gray-400 text-center mb-1">Visão do Admin</p>
                        <button onclick="openLink('${gift.link}')" class="secondary-button w-full hover:bg-green-50 text-green-700 border-green-200">
                            🔗 Testar Link
                        </button>
                        <button disabled class="primary-button w-full opacity-40 cursor-not-allowed">
                            🎁 Botão de Reserva (Inativo)
                        </button>
                    </div>`;
            } 
            else if(isViewOnly) {
                // VISÃO DE ESPIÃO
                actions = `
                    <div class="mt-auto pt-4 space-y-2">
                        <button onclick="openLink('${gift.link}')" class="secondary-button w-full">🔗 Ver Loja</button>
                        <button disabled class="primary-button w-full opacity-50 cursor-not-allowed text-sm">🔒 Faça Login para Reservar</button>
                    </div>`;
            } 
            else {
                // VISÃO DO CONVIDADO LOGADO
                actions = `
                    <div class="mt-auto pt-4 space-y-2">
                        <button onclick="openLink('${gift.link}')" class="secondary-button w-full">🔗 Ver Loja</button>
                        <button onclick="openResModal('${gift.id}')" class="primary-button w-full">🎁 Presentear</button>
                    </div>`;
            }
        }

        return `
            <div class="item-card ${isReserved ? 'reserved-card' : ''}">
                <div class="card-number-badge ${isReserved ? 'bg-gray-500 border-gray-500' : ''}">${index+1}</div>
                ${adminBtns}
                <div class="card-image-container"><img src="${img}" class="card-image" onerror="this.src='${defaultImg}'"></div>
                <div class="card-content">
                    <div>
                        <span class="category-tag ${isReserved ? 'bg-gray-200' : ''}">${categoryEmojis[gift.category] || '📦'} ${gift.category}</span>
                        <h3 class="text-lg font-bold mt-2 leading-tight ${isReserved?'text-gray-400 line-through':'text-gray-800'}">${gift.name}</h3>
                        ${!isReserved && price ? `<div class="price-tag mt-1">${price}</div>` : ''}
                    </div>
                    ${actions}
                </div>
            </div>`;
    };

    if(avail.length === 0 && reserv.length === 0) availableList.innerHTML = '<p class="col-span-3 text-center text-gray-500">Nada encontrado.</p>';
    else avail.forEach((g, i) => availableList.innerHTML += createCard(g, false, i));

    if(reserv.length > 0) {
        reservedSection.classList.remove('hidden');
        reserv.forEach((g, i) => reservedList.innerHTML += createCard(g, true, i));
    } else reservedSection.classList.add('hidden');
}
// ==========================================
// FUNÇÕES AUXILIARES, CRUD E MÁSCARAS
// ==========================================

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
    } catch(err) { console.error(err); alert("Erro ao adicionar: " + err.message); } 
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

window.deleteItem = async (id) => { if(confirm("Excluir?")) { await deleteDoc(doc(db, 'gifts', id)); fetchGifts(); } }
window.toggleStatus = async (id, st) => { await updateDoc(doc(db, 'gifts', id), { purchased: !st, purchasedBy: !st?"Admin":"" }); fetchGifts(); }
window.openLink = (url) => window.open(url, '_blank');
window.copyPix = () => navigator.clipboard.writeText(document.getElementById('pixKey').innerText).then(()=>alert("Copiado!"));

window.openResModal = (id) => {
    document.getElementById('reserveGiftId').value = id;
    document.getElementById('reserveGuestNameDisplay').innerText = currentUser;
    document.getElementById('reserveModal').classList.remove('hidden');
}
window.hideReserveModal = () => document.getElementById('reserveModal').classList.add('hidden');

// Event Listener para o Formulário de Reserva
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
            window.hideReserveModal(); fetchGifts(); alert("Reservado com sucesso! 🎉");
        } catch(err) { alert(err); window.hideReserveModal(); fetchGifts(); }
    });
}

window.cancelRes = async (id) => {
    if(confirm("Tem certeza que deseja cancelar sua reserva?")) {
        try {
            await updateDoc(doc(db, 'gifts', id), { purchased: false, purchasedBy: "" });
            fetchGifts();
            alert("Reserva cancelada.");
        } catch(err) { alert("Erro ao cancelar: " + err.message); }
    }
}