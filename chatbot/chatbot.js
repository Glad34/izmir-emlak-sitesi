console.log("🔥 chatbot.js YÜKLENDİ VE ÇALIŞIYOR.");

// --- 1. AYARLAR ---
const MAKE_DIALOG_WEBHOOK_URL = 'https://hook.eu2.make.com/c5dt1cwtpat7kk6i6oxilacno0yxnuif';
const MAKE_STATUS_CHECK_URL = 'https://hook.eu2.make.com/jwfmybzglr2gjbgynuyeep7163nldzzj';

// --- 2. HTML ELEMENTLERİNİN SEÇİLMESİ ---
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-input-form');
const userInput = document.getElementById('user-input');

// --- 3. KONUŞMA KİMLİĞİ (CONVERSATION ID) YÖNETİMİ ---
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

// --- 5. ANA FONKSİYONLAR ---
async function handleFormSubmit(event) {
    if (event) event.preventDefault();
    const messageText = userInput.value.trim();
    if (messageText === '') return;

    // Önceki butonları temizle (eğer varsa)
    const existingOptions = document.querySelector('.options-container');
    if (existingOptions) {
        existingOptions.remove();
    }

    addMessageToUI(messageText, 'user', false);
    userInput.value = '';
    userInput.disabled = true; // Yeni cevap gelene kadar input'u kilitle

    // "Yazıyor..." balonu ekleniyor
    addMessageToUI('...', 'ai', false);

    try {
        const aiResponse = await sendMessageToMake(messageText);

        // En son eklenen "Yazıyor..." balonunu ekrandan sil.
        const messages = document.querySelectorAll('.message');
        messages[messages.length - 1].remove();

        // Gelen cevabı işle
        if (typeof aiResponse.cevap === 'object' && aiResponse.cevap.options && Array.isArray(aiResponse.cevap.options)) {
            // EĞER CEVAP SEÇENEKLER İÇERİYORSA:
            addMessageToUI(aiResponse.cevap.text, 'ai', true);
            renderOptions(aiResponse.cevap.options);
        } else {
            // EĞER CEVAP SADECE METİNSE (ESKİ SİSTEM):
            addMessageToUI(aiResponse.cevap, 'ai', true);
        }

        const chatbotPopup = document.getElementById('chatbot-popup');
        if (chatbotPopup && chatbotPopup.classList.contains('chatbot-hidden')) {
            chatbotPopup.classList.remove('chatbot-hidden');
        }

        if (aiResponse.status === 'tamamlandi') {
            startPollingForResults();
        }
    } catch (error) {
        console.error('Asistanla iletişimde hata:', error);
        const messages = document.querySelectorAll('.message');
        if (messages.length > 0) {
            messages[messages.length - 1].remove();
        }
        addMessageToUI('Üzgünüm, bir hata oluştu. Lütfen daha sonra tekrar deneyin.', 'ai', false);
    } finally {
        userInput.disabled = false; // Input kilidini aç
        userInput.focus(); // Input'a odaklan
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

/**
 * Verilen seçenekler dizisinden tıklanabilir butonlar oluşturur ve mesaj alanına ekler.
 * @param {string[]} options - Buton olarak gösterilecek metinleri içeren dizi.
 */
function renderOptions(options) {
    const optionsContainer = document.createElement('div');
    optionsContainer.classList.add('options-container');

    options.forEach(optionText => {
        const button = document.createElement('button');
        button.classList.add('quick-reply-button');
        button.textContent = optionText;

        button.addEventListener('click', () => {
            userInput.value = optionText;
            handleFormSubmit(null); // event'i null gönderiyoruz
        });

        optionsContainer.appendChild(button);
    });

    chatMessages.appendChild(optionsContainer);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Scroll'u en alta kaydır
}

// --- 6. ASENKRON SONUÇ KONTROLÜ VE GÖRSELLEŞTİRME ---
function startPollingForResults() {
    let pollCount = 0;
    const maxPolls = 24;

    const intervalId = setInterval(async () => {
        if (pollCount >= maxPolls) {
            clearInterval(intervalId);
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

            if (data.rapor_durumu === 'hazir') {
                clearInterval(intervalId);
                renderIlanSlider(data.ilan_sunumu);
            }
        } catch (error) {
            console.error("Sonuç kontrolü sırasında hata:", error);
            clearInterval(intervalId);
            addMessageToUI("Sonuçlar alınırken bir veri formatı hatası oluştu.", "ai", false);
        }
        pollCount++;
    }, 5000);
}

function renderIlanSlider(ilanSunumuBase64) {
    if (!ilanSunumuBase64) {
        addMessageToUI("Size uygun ilan bulunamadı.", 'ai', false);
        return;
    }
    try {
        const ilanSunumuJSON = atob(ilanSunumuBase64);
        const veriObjesi = JSON.parse(ilanSunumuJSON);
        const ilanlarDizisi = veriObjesi.ilanlar;

        if (!Array.isArray(ilanlarDizisi) || ilanlarDizisi.length === 0) {
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

        htmlContent += `
                    </div>
                </div>
                <p class="slider-cta">Tüm ilanları görmek ve uzman desteği almak için lütfen <strong>telefon numaranızı</strong> yazın.</p>
            </div>
        `;
        addMessageToUI(htmlContent, 'ai', true);
        localStorage.setItem('newAiMessageFlag', Date.now());

    } catch (error) {
        console.error("İlan slider'ı oluşturulurken hata:", error);
        addMessageToUI("Sonuçlar görüntülenirken bir sorun oluştu.", 'ai', false);
    }
}