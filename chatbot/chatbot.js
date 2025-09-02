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

    addMessageToUI(messageText, 'user', false);
    userInput.value = '';
    userInput.disabled = true;

    addMessageToUI('...', 'ai', false);

    try {
        const aiResponse = await sendMessageToMake(messageText);
        const messages = document.querySelectorAll('.message');
        messages[messages.length - 1].remove();

        // Gelen cevabı işle
        if (typeof aiResponse.cevap === 'object' && aiResponse.cevap.questions) {
            // EĞER CEVAP BİR FORM İSE (YENİ SİSTEM):
            addMessageToUI(aiResponse.cevap.text, 'ai', true); // "Lütfen formu doldurun" metni
            renderForm(aiResponse.cevap.questions); // Formu ekrana çiz
        } else if (typeof aiResponse.cevap === 'object' && aiResponse.cevap.options) {
            // EĞER CEVAP BASİT SEÇENEKLER İSE:
            addMessageToUI(aiResponse.cevap.text, 'ai', true);
            renderOptions(aiResponse.cevap.options);
        } else {
            // EĞER CEVAP SADECE METİNSE:
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
        // Form gösterilmediyse input'u tekrar aktif et
        if (!document.querySelector('.dynamic-form-container')) {
            userInput.disabled = false;
            userInput.focus();
        }
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
 * Verilen "questions" dizisinden dinamik bir form oluşturur.
 * @param {Array} questions - Form elemanlarını içeren dizi.
 */
function renderForm(questions) {
    const formContainer = document.createElement('div');
    formContainer.classList.add('dynamic-form-container');

    let formHTML = '';
    questions.forEach(q => {
        formHTML += `<div class="form-group">`;
        formHTML += `<label for="${q.id}">${q.text}</label>`;
        if (q.options) {
            // Seçenekler varsa buton grubu oluştur
            formHTML += `<div class="form-options" data-id="${q.id}">`;
            q.options.forEach(opt => {
                formHTML += `<button type="button" class="quick-reply-button">${opt}</button>`;
            });
            formHTML += `</div>`;
        } else {
            // Seçenek yoksa metin input'u oluştur
            formHTML += `<input type="text" id="${q.id}" name="${q.id}" class="form-input">`;
        }
        formHTML += `</div>`;
    });

    // Gönder butonu
    formHTML += `<button type="submit" class="form-submit-button">Kriterleri Gönder</button>`;
    formContainer.innerHTML = formHTML;
    chatMessages.appendChild(formContainer);

    // Buton tıklama olaylarını yönet
    formContainer.querySelectorAll('.quick-reply-button').forEach(button => {
        button.addEventListener('click', () => {
            // Aynı gruptaki diğer butonların seçimini kaldır
            const parent = button.parentElement;
            parent.querySelectorAll('.quick-reply-button').forEach(btn => btn.classList.remove('selected'));
            // Tıklanan butonu seçili yap
            button.classList.add('selected');
        });
    });

    // Form gönderme olayını yönet
    formContainer.querySelector('.form-submit-button').addEventListener('click', () => {
        let collectedData = [];
        questions.forEach(q => {
            let value = '';
            if (q.options) {
                const selectedButton = formContainer.querySelector(`.form-options[data-id="${q.id}"] .selected`);
                if (selectedButton) {
                    value = selectedButton.textContent;
                }
            } else {
                const inputElement = formContainer.querySelector(`#${q.id}`);
                if (inputElement) {
                    value = inputElement.value;
                }
            }
            if (value.trim() !== '') {
                collectedData.push(`${q.text} ${value}`);
            }
        });

        if (collectedData.length > 0) {
            userInput.value = collectedData.join(', ');
            handleFormSubmit(null);
        }
        formContainer.remove(); // Formu gönderdikten sonra kaldır
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
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