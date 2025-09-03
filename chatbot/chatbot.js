console.log("🔥 chatbot.js V3 (STABİL SÜRÜM) YÜKLENDİ.");

// --- 1. AYARLAR ---
const MAKE_DIALOG_WEBHOOK_URL = 'https://hook.eu2.make.com/c5dt1cwtpat7kk6i6oxilacno0yxnuif';
const MAKE_STATUS_CHECK_URL = 'https://hook.eu2.make.com/jwfmybzglr2gjbgynuyeep7163nldzzj';

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
async function handleFormSubmit(event) {
    if (event) event.preventDefault();
    const messageText = userInput.value.trim();
    if (messageText === '') return;

    addMessageToHistoryAndUI(messageText, 'user', false);
    userInput.value = '';
    addMessageToHistoryAndUI('...', 'ai', false, true); // 'isPending' olarak işaretle

    try {
        // --- GÜNCELLENDİ: Artık 'text' gönderiyoruz ---
        const aiResponse = await sendMessageToMake({ text: messageText });
        updateLastMessage(aiResponse.cevap, true);
        if (aiResponse.status === 'tamamlandi') {
            startPollingForResults();
        }
    } catch (error) {
        console.error('Asistanla iletişimde hata:', error);
        updateLastMessage('Üzgünüm, bir hata oluştu. Lütfen daha sonra tekrar deneyin.', false);
    }
}

// --- GÜNCELLENDİ: Artık tek bir obje alıyor ---
async function sendMessageToMake(payloadBody) {
    // Her isteğe conversation_id'yi otomatik ekle
    const fullPayload = { ...payloadBody, conversation_id: conversationId };
    
    const response = await fetch(MAKE_DIALOG_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullPayload)
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
        lastMessage.isPending = false; // Artık beklemede değil
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

// --- GÜNCELLENDİ: "Yeniden Gönder" yerine "Son Durumu Sor" ---
async function resolveStuckState() {
    const lastMessage = conversationHistory[conversationHistory.length - 1];
    
    // Eğer son mesaj 'beklemede' değilse, hiçbir şey yapma.
    if (!lastMessage || !lastMessage.isPending) {
        return;
    }

    console.log("Takılı kalmış bir işlem tespit edildi. Son durum soruluyor...");
    
    try {
        // Make.com'a SADECE conversation_id göndererek son mesajı istiyoruz.
        // 'text' alanı göndermiyoruz.
        const aiResponse = await sendMessageToMake({}); 
        updateLastMessage(aiResponse.cevap, true);
        if (aiResponse.status === 'tamamlandi') {
            startPollingForResults();
        }
    } catch (error) {
        console.error('Takılı kalan durum çözümlenirken hata:', error);
        updateLastMessage('Önceki mesaja cevap alınırken bir hata oluştu.', false);
    }
}

// ... (startPollingForResults ve renderIlanSlider fonksiyonları aynı kalabilir) ...
function startPollingForResults() {
    let pollCount = 0;
    const maxPolls = 24;
    const intervalId = setInterval(async () => {
        if (pollCount >= maxPolls) {
            clearInterval(intervalId);
            addMessageToHistoryAndUI("Sonuçların hazırlanması beklenenden uzun sürdü.", 'ai', false);
            return;
        }
        try {
            const response = await fetch(MAKE_STATUS_CHECK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: conversationId })
            });
            const data = await response.json();
           
            if (data.rapor_durumu === 'hazir') {
                clearInterval(intervalId);
                renderIlanSlider(data.ilan_sunumu);
            }
        } catch (error) {
            console.error("Sonuç kontrolü sırasında hata:", error);
            clearInterval(intervalId);
            addMessageToHistoryAndUI("Sonuçlar alınırken bir veri formatı hatası oluştu.", "ai", false);
        }
        pollCount++;
    }, 5000);
}
function renderIlanSlider(ilanSunumuBase64) {
    if (!ilanSunumuBase64) {
        addMessageToHistoryAndUI("Size uygun ilan bulunamadı.", 'ai', false);
        return;
    }
    try {
        const ilanSunumuJSON = atob(ilanSunumuBase64);
        const veriObjesi = JSON.parse(ilanSunumuJSON);
        const ilanlarDizisi = veriObjesi.ilanlar;

        if (!Array.isArray(ilanlarDizisi) || ilanlarDizisi.length === 0) {
            addMessageToHistoryAndUI("Taleplerinize uygun bir ilan bulunamadı.", 'ai', false);
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

    } catch (error) {
        console.error("İlan slider'ı oluşturulurken hata:", error);
        addMessageToHistoryAndUI("Sonuçlar görüntülenirken bir sorun oluştu.", 'ai', false);
    }
}
// --- 8. BAŞLANGIÇ ---
async function initializeChat() {
    loadHistoryFromSession();
    await resolveStuckState();
}

initializeChat();