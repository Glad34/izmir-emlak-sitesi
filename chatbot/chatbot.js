console.log("🔥 chatbot.js GÜNCEL SÜRÜM YÜKLENDİ VE ÇALIŞIYOR.");

// --- 1. AYARLAR ---
const MAKE_DIALOG_WEBHOOK_URL = 'https://hook.eu2.make.com/c5dt1cwtpat7kk6i6oxilacno0yxnuif';
const MAKE_STATUS_CHECK_URL = 'https://hook.eu2.make.com/jwfmybzglr2gjbgynuyeep7163nldzzj';

// --- 2. HTML ELEMENTLERİNİN SEÇİLMESİ ---
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-input-form');
const userInput = document.getElementById('user-input');

// --- YENİ ---
// 3. UYGULAMA DURUMU (STATE) YÖNETİMİ ---
// Konuşma geçmişini tutacak olan ana dizi. Artık tek gerçek kaynağımız bu olacak.
let conversationHistory = [];
// --- BİTİŞ ---

// --- GÜNCELLENDİ ---
// 4. KONUŞMA KİMLİĞİ (CONVERSATION ID) VE GEÇMİŞ YÖNETİMİ ---
// Sayfa yenilemelerinde silinmemesi ama sekme kapanınca silinmesi için sessionStorage daha uygun.
function getOrCreateConversationId() {
    let id = sessionStorage.getItem('chatConversationId');
    if (!id) {
        id = crypto.randomUUID();
        sessionStorage.setItem('chatConversationId', id);
    }
    return id;
}

// --- YENİ ---
// Konuşma geçmişini sessionStorage'a kaydeder.
function saveHistoryToSession() {
    sessionStorage.setItem('chatHistory', JSON.stringify(conversationHistory));
}

// --- YENİ ---
// Sayfa yüklendiğinde geçmişi sessionStorage'dan yükler ve ekranı yeniden çizer.
function loadHistoryFromSession() {
    const savedHistory = sessionStorage.getItem('chatHistory');
    if (savedHistory) {
        conversationHistory = JSON.parse(savedHistory);
        chatMessages.innerHTML = ''; // Önce mevcut mesajları temizle
        conversationHistory.forEach(message => {
            // isHTML bilgisi objede saklandığı için doğru şekilde yeniden çizebiliriz.
            addMessageToUI(message.content, message.sender, message.isHTML);
        });
    } else {
        // Eğer geçmiş yoksa, bir hoşgeldin mesajı ekleyebiliriz.
        const welcomeMessage = "Merhaba! Size nasıl yardımcı olabilirim?";
        conversationHistory.push({ content: welcomeMessage, sender: 'ai', isHTML: false });
        addMessageToUI(welcomeMessage, 'ai', false);
        saveHistoryToSession();
    }
}
// --- BİTİŞ ---

const conversationId = getOrCreateConversationId();

// --- 5. OLAY DİNLEYİCİ ---
chatForm.addEventListener('submit', handleFormSubmit);

// --- 6. ANA FONKSİYONLAR ---
async function handleFormSubmit(event) {
    if (event) event.preventDefault();
    const messageText = userInput.value.trim();
    if (messageText === '') return;

    // --- GÜNCELLENDİ ---
    // Mesajı artık hem UI'a hem de geçmiş dizisine ekliyoruz.
    addMessageToHistoryAndUI(messageText, 'user', false);
    userInput.value = '';

    const loadingIndicator = addMessageToHistoryAndUI('...', 'ai', false);
    // --- BİTİŞ ---

    try {
        const aiResponse = await sendMessageToMake(messageText);

        const chatbotPopup = document.getElementById('chatbot-popup');
        if (chatbotPopup && chatbotPopup.classList.contains('chatbot-hidden')) {
            chatbotPopup.classList.remove('chatbot-hidden');
        }

        // --- GÜNCELLENDİ ---
        // Yükleniyor(...) mesajını gelen gerçek cevapla güncelliyoruz.
        updateLastMessage(aiResponse.cevap, true); // isHTML: true olarak varsayıyoruz, çünkü cevap HTML içerebilir
        // --- BİTİŞ ---

        if (aiResponse.status === 'tamamlandi') {
            startPollingForResults();
        }
    } catch (error) {
        console.error('Asistanla iletişimde hata:', error);
        const errorMessage = 'Üzgünüm, bir hata oluştu. Lütfen daha sonra tekrar deneyin.';
        // --- GÜNCELLENDİ ---
        // Hata mesajını da aynı şekilde güncelliyoruz.
        updateLastMessage(errorMessage, false);
        // --- BİTİŞ ---
    }
}

async function sendMessageToMake(text) {
    const payload = { text: text, conversation_id: conversationId };
    const response = await fetch(MAKE_DIALOG_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Network hatası: ${response.status}`);
    const data = await response.json();
    return data;
}

// Bu fonksiyon artık sadece görselleştirmeden sorumlu.
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

// --- YENİ ---
// Mesaj ekleme işlemini merkezileştiren fonksiyon.
// Hem geçmiş dizisine ekler, hem UI'a ekler, hem de kaydeder.
function addMessageToHistoryAndUI(content, sender, isHTML) {
    conversationHistory.push({ content, sender, isHTML });
    saveHistoryToSession();
    return addMessageToUI(content, sender, isHTML);
}

// --- YENİ ---
// AI'dan cevap geldiğinde yükleniyor(...) mesajını güncellemek için.
function updateLastMessage(newContent, isHTML) {
    // Hem geçmiş dizisindeki son elemanı güncelle
    if (conversationHistory.length > 0) {
        const lastMessage = conversationHistory[conversationHistory.length - 1];
        lastMessage.content = newContent;
        lastMessage.isHTML = isHTML;
        saveHistoryToSession();
    }

    // Hem de UI'daki son mesaj elementini güncelle
    const lastMessageElement = chatMessages.lastElementChild;
    if (lastMessageElement) {
        if (isHTML) {
            lastMessageElement.innerHTML = newContent;
        } else {
            lastMessageElement.textContent = newContent;
        }
        lastMessageElement.classList.remove('loading');
    }
}
// --- BİTİŞ ---

// --- 7. ASENKRON SONUÇ KONTROLÜ VE GÖRSELLEŞTİRME ---
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
        
        // --- GÜNCELLENDİ ---
        // Slider mesajını da merkezi fonksiyonla ekliyoruz.
        addMessageToHistoryAndUI(htmlContent, 'ai', true);
        // --- BİTİŞ ---

        // Bu flag'e artık sessionStorage kullandığımız için ihtiyacımız kalmadı.
        // localStorage.setItem('newAiMessageFlag', Date.now());

    } catch (error) {
        console.error("İlan slider'ı oluşturulurken hata:", error);
        addMessageToHistoryAndUI("Sonuçlar görüntülenirken bir sorun oluştu.", 'ai', false);
    }
}

// --- YENİ ---
// 8. BAŞLANGIÇ ---
// Kod ilk yüklendiğinde bu fonksiyon çalışır ve her şeyi hazırlar.
function initializeChat() {
    loadHistoryFromSession();
}

initializeChat();
// --- BİTİŞ ---