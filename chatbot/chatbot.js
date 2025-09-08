console.log("🔥 chatbot.js V5 (GOOGLE APPS SCRIPT ENTEGRASYONU) YÜKLENDİ.");

// --- 1. AYARLAR ---
// ÖNEMLİ: Google Apps Script'ten kopyaladığınız Web Uygulaması URL'sini bu satıra yapıştırın.
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby74_aPDzLHv2SNQXNh9RpWkljXbMqj5_BNlhoRhYcAXQnw8iMvDUaADG3-5RUBgYGG/exec';

// --- 2. HTML ELEMENTLERİ ---
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-input-form');
const userInput = document.getElementById('user-input');

// --- 3. STATE YÖNETİMİ ---
let conversationHistory = [];

// --- 4. OTURUM YÖNETİMİ ---
function getOrCreateConversationId() {
    let id = sessionStorage.getItem('chatConversationId');
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem('chatConversationId', id);
    }
    return id;
}

function saveHistoryToSession() {
    sessionStorage.setItem('chatHistory', JSON.stringify(conversationHistory));
}

function loadHistoryFromSession() {
    const savedHistory = sessionStorage.getItem('chatHistory');
    if (savedHistory) {
        conversationHistory = JSON.parse(savedHistory);
        chatMessages.innerHTML = '';
        conversationHistory.forEach(message => {
            addMessageToUI(message.content, message.sender, message.isHTML);
        });
    } else {
        const welcomeMessage = "Merhaba! Size nasıl yardımcı olabilirim?";
        addMessageToHistoryAndUI(welcomeMessage, 'ai', false);
    }
}

const conversationId = getOrCreateConversationId();

// --- 5. OLAY DİNLEYİCİ ---
chatForm.addEventListener('submit', handleFormSubmit);

// --- 6. ANA FONKSİYONLAR ---

function openChatPopupIfNeeded() {
    const chatbotPopup = document.getElementById('chatbot-popup');
    if (chatbotPopup && chatbotPopup.classList.contains('chatbot-hidden')) {
        chatbotPopup.classList.remove('chatbot-hidden');
    }
}

async function handleFormSubmit(event) {
    if (event) event.preventDefault();
    const messageText = userInput.value.trim();
    if (messageText === '') return;

    addMessageToHistoryAndUI(messageText, 'user', false);
    userInput.value = '';
    addMessageToHistoryAndUI('...', 'ai', false, true); 

    try {
        const aiResponse = await sendMessageToGAS({ text: messageText });
        updateLastMessage(aiResponse.cevap, true);
        openChatPopupIfNeeded();
        
        if (aiResponse.status === 'tamamlandi') {
            startPollingForResults();
        }
    } catch (error) {
        console.error('Asistanla iletişimde hata:', error);
        updateLastMessage('Üzgünüm, bir hata oluştu. Lütfen daha sonra tekrar deneyin.', false);
        openChatPopupIfNeeded();
    }
}

async function sendMessageToGAS(payloadBody) {
    const fullPayload = {
        action: 'handleMessage',
        text: payloadBody.text,
        history: conversationHistory.slice(0, -2), 
        conversation_id: conversationId
    };
    
    const response = await fetch(GAS_WEB_APP_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullPayload),
        redirect: 'follow' 
    });
    if (!response.ok) throw new Error(`Network hatası: ${response.status}`);
    return await response.json();
}

function addMessageToUI(content, sender, isHTML) {
    const messageElement = document.createElement('div');
    messageElement.classList.add('message', `${sender}-message`);
    if (isHTML) {
        messageElement.innerHTML = content;
    } else {
        messageElement.textContent = content;
    }
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return messageElement;
}

function addMessageToHistoryAndUI(content, sender, isHTML, isPending = false) {
    conversationHistory.push({ content, sender, isHTML, isPending });
    saveHistoryToSession();
    return addMessageToUI(content, sender, isHTML);
}

function updateLastMessage(newContent, isHTML) {
    if (conversationHistory.length > 0) {
        const lastMessage = conversationHistory[conversationHistory.length - 1];
        lastMessage.content = newContent;
        lastMessage.isHTML = isHTML;
        lastMessage.isPending = false;
        saveHistoryToSession();
    }
    const lastMessageElement = chatMessages.lastElementChild;
    if (lastMessageElement) {
        if (isHTML) {
            lastMessageElement.innerHTML = newContent;
        } else {
            lastMessageElement.textContent = newContent;
        }
    }
}

function startPollingForResults() {
    let pollCount = 0;
    const maxPolls = 24;
    const intervalId = setInterval(async () => {
        if (pollCount >= maxPolls) {
            clearInterval(intervalId);
            addMessageToHistoryAndUI("Sonuçların hazırlanması beklenenden uzun sürdü.", 'ai', false);
            openChatPopupIfNeeded();
            return;
        }
        try {
            const response = await fetch(GAS_WEB_APP_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'checkResults', 
                    conversation_id: conversationId 
                }),
                redirect: 'follow'
            });
            const data = await response.json();
           
            if (data.rapor_durumu === 'hazir') {
                clearInterval(intervalId);
                renderIlanSlider(data.ilan_sunumu);
            }
        } catch (error) {
            console.error("Sonuç kontrolü sırasında hata:", error);
            clearInterval(intervalId);
            addMessageToHistoryAndUI("Sonuçlar alınırken bir hata oluştu.", "ai", false);
            openChatPopupIfNeeded();
        }
        pollCount++;
    }, 5000);
}

function renderIlanSlider(ilanSunumuBase64) {
    if (!ilanSunumuBase64) {
        addMessageToHistoryAndUI("Size uygun ilan bulunamadı.", 'ai', false);
        openChatPopupIfNeeded();
        return;
    }
    try {
        const ilanSunumuJSON = atob(ilanSunumuBase64);
        const veriObjesi = JSON.parse(ilanSunumuJSON);
        const ilanlarDizisi = veriObjesi.ilanlar;

        if (!Array.isArray(ilanlarDizisi) || ilanlarDizisi.length === 0) {
            addMessageToHistoryAndUI("Taleplerinize uygun bir ilan bulunamadı.", 'ai', false);
            openChatPopupIfNeeded();
            return;
        }
       
        const gosterilecekAdet = 2;
        const gosterilecekIlanlar = ilanlarDizisi.slice(0, gosterilecekAdet);
       
        let htmlContent = `
            <div class="slider-message">
                <p>Taleplerinize yönelik <strong>${ilanlarDizisi.length} adet</strong> ilan buldum. İşte ilk ${gosterilecekIlanlar.length} tanesi:</p>
                <div class="ilan-slider-container">
                    <div class="ilan-slider">
        `;
       
        gosterilecekIlanlar.forEach((ilan) => {
            const formatliFiyat = new Intl.NumberFormat('tr-TR').format(ilan.fiyat);
            htmlContent += `
                <div class="ilan-card">
                    <img src="${ilan.gorsel}" alt="İlan Resmi">
                    <div class="fiyat">${formatliFiyat} TL</div>
                </div>`;
        });
       
        htmlContent += `
                    </div>
                </div>
                <p class="slider-cta">Tüm ilanları görmek ve uzman desteği almak için lütfen <strong>telefon numaranızı</strong> yazın.</p>
            </div>
        `;
               
        addMessageToHistoryAndUI(htmlContent, 'ai', true);
        openChatPopupIfNeeded();

    } catch (error) {
        console.error("İlan slider'ı oluşturulurken hata:", error);
        addMessageToHistoryAndUI("Sonuçlar görüntülenirken bir sorun oluştu.", 'ai', false);
        openChatPopupIfNeeded();
    }
}

// --- 8. BAŞLANGIÇ ---
function initializeChat() {
    loadHistoryFromSession();
}

initializeChat();