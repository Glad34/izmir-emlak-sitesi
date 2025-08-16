console.log("🔥 chatbot.js YÜKLENDİ VE ÇALIŞIYOR.");

// --- 1. AYARLAR ---
const MAKE_DIALOG_WEBHOOK_URL = 'https://hook.eu2.make.com/c5dt1cwtpat7kk6i6oxilacno0yxnuif';
const MAKE_STATUS_CHECK_URL = 'https://hook.eu2.make.com/jwfmybzglr2gjbgynuyeep7163nldzzj';

// --- 2. HTML ELEMENTLERİNİN SEÇİLMESİ ---
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-input-form');
const userInput = document.getElementById('user-input');

// --- 3. KONUŞMA KİMLİĞİ YÖNETİMİ ---
function getOrCreateConversationId() {
    let id = localStorage.getItem('chatConversationId');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('chatConversationId', id);
    }
    return id;
}
const conversationId = getOrCreateConversationId();

// --- 4. OLAY DİNLEYİCİ ---
chatForm.addEventListener('submit', handleFormSubmit);

// --- HATA AYIKLAMA İÇİN GLOBAL DEĞİŞKENLER ---
let pollingIntervalId = null;
let isPollingActive = false;
console.log("🔥 CHATBOT BAŞLATILDI. Polling durumu:", isPollingActive);

// --- 5. ANA FONKSİYONLAR ---
async function handleFormSubmit(event) {
    if (event) event.preventDefault();
    const messageText = userInput.value.trim();
    if (messageText === '') return;

    addMessageToUI(messageText, 'user', false);
    userInput.value = '';

    const loadingIndicator = addMessageToUI('...', 'ai', false);

    try {
        console.log("➡️ Mesaj gönderiliyor:", messageText);
        const aiResponse = await sendMessageToMake(messageText);
        console.log("⬅️ Make.com'dan cevap alındı:", aiResponse);

        if (aiResponse && aiResponse.cevap) {
            loadingIndicator.textContent = aiResponse.cevap;
            if (aiResponse.status === 'tamamlandi') {
                console.log("✅ Durum 'tamamlandi' olarak tespit edildi. Kontrol döngüsü başlatılacak.");
                startPollingForResults();
            } else {
                console.log("ℹ️ Durum 'devam' olarak tespit edildi. Yeni mesaj bekleniyor.");
            }
        } else {
             console.error("❌ Make.com'dan beklenen formatta cevap gelmedi:", aiResponse);
             loadingIndicator.textContent = 'Bir sorun oluştu, lütfen mesajınızı tekrar göndermeyi deneyin.';
        }
    } catch (error) {
        console.error('❌ Asistanla iletişimde hata:', error);
        loadingIndicator.textContent = 'Üzgünüm, bir hata oluştu.';
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

// --- 6. ASENKRON SONUÇ KONTROLÜ VE GÖRSELLEŞTİRME ---
function startPollingForResults() {
    if (isPollingActive) {
        console.warn("⚠️ KONTROL DÖNGÜSÜ ZATEN AKTİF. Yeni bir tane başlatılmadı.");
        return;
    }

    isPollingActive = true;
    console.log("🟢 KONTROL DÖNGÜSÜ BAŞLATILDI.");
    
    let pollCount = 0;
    const maxPolls = 24;

    pollingIntervalId = setInterval(async () => {
        console.log(`📡 Kontrol ${pollCount + 1}/${maxPolls} gönderiliyor...`);
        if (pollCount >= maxPolls) {
            clearInterval(pollingIntervalId);
            isPollingActive = false;
            console.log("🔴 Döngü maksimum deneme sayısına ulaştı ve DURDURULDU.");
            addMessageToUI("Sonuçların hazırlanması beklenenden uzun sürdü.", 'ai', false);
            return;
        }
        try {
            const response = await fetch(MAKE_STATUS_CHECK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ conversation_id: conversationId })
            });
            const data = await response.json();
            console.log(`📥 Kontrol cevabı alındı:`, data);
           
            if (data.rapor_durumu === 'hazir') {
                clearInterval(pollingIntervalId);
                isPollingActive = false;
                console.log("✅ SONUÇLAR BULUNDU! Döngü DURDURULDU.");
                renderIlanSlider(data.ilan_sunumu);
            }
        } catch (error) {
            console.error("❌ Sonuç kontrolü sırasında hata:", error);
            clearInterval(pollingIntervalId);
            isPollingActive = false;
            addMessageToUI("Sonuçlar alınırken bir veri formatı hatası oluştu.", "ai", false);
        }
        pollCount++;
    }, 5000);
}

function renderIlanSlider(ilanSunumu) {
    console.log("🎨 renderIlanSlider fonksiyonu ÇAĞRILDI. Gelen veri:", ilanSunumu);
    if (!ilanSunumu) {
        console.error("Render hatası: ilanSunumu verisi boş veya tanımsız.");
        addMessageToUI("Size uygun ilan bulunamadı.", 'ai', false);
        return;
    }
    try {
        const veriObjesi = JSON.parse(ilanSunumu);
        const ilanlarDizisi = veriObjesi.ilanlar;

        if (!Array.isArray(ilanlarDizisi) || ilanlarDizisi.length === 0) {
            console.error("Render hatası: İlan verisi bir dizi değil veya boş.", ilanlarDizisi);
            addMessageToUI("Taleplerinize uygun bir ilan bulunamadı.", 'ai', false);
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
        
        htmlContent += `</div></div><p class="slider-cta">Tüm ilanları görmek ve uzman desteği almak için lütfen <strong>telefon numaranızı</strong> yazın.</p></div>`;
        
        addMessageToUI(htmlContent, 'ai', true);

    } catch (error) {
        console.error("❌ İlan slider'ı oluşturulurken KRİTİK HATA:", error);
        addMessageToUI("Sonuçlar görüntülenirken bir sorun oluştu.", 'ai', false);
    }
}