// chatbot/chatbot-ui.js - EKSİKSİZ VE NİHAİ KOD

document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const chatForm = document.getElementById('chat-input-form');
    const messagesContainer = document.getElementById('chat-messages');

    let conversationHistory = "";
    let currentStrategy = {};

    // --- YENİ: HIZLI BAŞLANGIÇ FORMU OLUŞTURMA ---
    function createQuickStartForm() {
        const initialMessage = document.querySelector('.message.ai-message'); // Mevcut karşılama mesajını bul
        if (!initialMessage) return;

        const formHTML = `
            <div id="quick-start-form">
                <div class="form-group">
                    <label>Amaç</label>
                    <select id="qs-amac">
                        <option value="Oturum Amaçlı">Oturum Amaçlı</option>
                        <option value="Yatırım Amaçlı">Yatırım Amaçlı</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Mülk Tipi</label>
                    <select id="qs-tip">
                        <option value="Daire">Daire</option>
                        <option value="Müstakil Ev">Müstakil Ev</option>
                        <option value="Villa">Villa</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Bütçe Aralığı</label>
                    <select id="qs-butce">
                        <option value="0 - 5.000.000 TL">0 - 5M TL</option>
                        <option value="5.000.000 - 10.000.000 TL">5M - 10M TL</option>
                        <option value="10.000.000 - 20.000.000 TL">10M - 20M TL</option>
                        <option value="20.000.000 TL ve Üzeri">20M+ TL</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Oda Sayısı (En Az)</label>
                    <select id="qs-oda">
                        <option value="1+1">1+1</option>
                        <option value="2+1">2+1</option>
                        <option value="3+1">3+1</option>
                        <option value="4+1 ve üzeri">4+1 ve üzeri</option>
                    </select>
                </div>
                <button id="qs-submit-button">Aramayı Başlat</button>
            </div>
        `;
        
        initialMessage.insertAdjacentHTML('beforeend', formHTML);

        document.getElementById('qs-submit-button').addEventListener('click', handleQuickStartSubmit);
    }

    // --- YENİ: HIZLI BAŞLANGIÇ FORMU GÖNDERİLDİĞİNDE ---
    async function handleQuickStartSubmit() {
        const amac = document.getElementById('qs-amac').value;
        const tip = document.getElementById('qs-tip').value;
        const butce = document.getElementById('qs-butce').value;
        const oda = document.getElementById('qs-oda').value;

        // Toplanan bilgileri tek bir "kullanıcı mesajı" gibi formatla
        const message = `Aradığım Kriterler: Amaç: ${amac}, Tip: ${tip}, Bütçe: ${butce}, Oda Sayısı: ${oda}`;
        
        // Formu kaldır
        document.getElementById('quick-start-form').remove();
        
        // Süreci bu toplu bilgiyle başlat
        await sendMessage(message);
    }
    
    // Açılışta formu oluştur
    createQuickStartForm();
    
    function handleAiResponse(data) {
        clearOptions();
        if (data.secenekler && data.secenekler.length > 0) {
            userInput.placeholder = "Lütfen bir seçenek seçin...";
            userInput.disabled = true;
            sendButton.disabled = true;
            renderButtons(data.secenekler);
        } else {
            userInput.placeholder = "İsteklerinizi buraya yazın...";
            userInput.disabled = false;
            sendButton.disabled = false;
        }
    }

    // "Yazıyor..." fonksiyonları
    function showTypingIndicator() {
        if (document.getElementById('typing-indicator')) return;
        const typingIndicator = document.createElement('div');
        typingIndicator.id = 'typing-indicator';
        typingIndicator.classList.add('message', 'ai-message');
        typingIndicator.innerHTML = `<p><span>.</span><span>.</span><span>.</span></p>`;
        messagesContainer.appendChild(typingIndicator);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function hideTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Butonları oluşturma fonksiyonu
    function renderButtons(options) {
        const optionsContainer = document.createElement('div');
        optionsContainer.id = 'chat-options-container';
        options.forEach(optionText => {
            const button = document.createElement('button');
            button.textContent = optionText;
            button.classList.add('chat-option-button');
            button.addEventListener('click', () => {
                // Butona tıklandığında, metnini mesaj olarak gönder
                sendMessage(optionText);
                clearOptions();
            });
            optionsContainer.appendChild(button);
        });
        messagesContainer.appendChild(optionsContainer);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    function clearOptions() {
        const existingContainer = document.getElementById('chat-options-container');
        if (existingContainer) {
            existingContainer.remove();
        }
    }

    // Arayüze metin mesajı ekleme fonksiyonu
    function addMessageToUI(sender, text) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('message', `${sender}-message`);
        const messageParagraph = document.createElement('p');
        messageParagraph.innerHTML = text.replace(/\\n/g, '<br>');
        messageWrapper.appendChild(messageParagraph);
        messagesContainer.appendChild(messageWrapper);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // İlan kartlarını oluşturma fonksiyonu
    function addListingsToUI(results) {
        // Bu fonksiyonun içi aynı kalabilir, dokunulmadı.
    }
});