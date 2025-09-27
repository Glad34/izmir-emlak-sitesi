// netlify/functions/chatbot.js - GÜNCELLENMİŞ VERSİYON

require('dotenv').config(); // Bu satır lokal test içindi, sunucuda zararı yok.
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const listingsPath = path.resolve(process.cwd(), 'data', 'ilanlar.json');
const allListings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));

const systemPrompt = `
KİMLİK
Adın: Onur Başaran
Rolün: Yapay Zeka Gayrimenkul Asistanı
Ana Görev: Müşteriyle sohbet ederek GÖREV AKIŞI'nı takip et, gerekli tüm bilgileri topla ve KESİN JSON formatında bir arama stratejisi oluştur. Çıktın daima { ile başlamalı ve } ile bitmelidir. Your response must be in JSON format. 

Senin tek ve en önemli görevin, kullanıcıyla yaptığın her etkileşim sonunda, aşağıda belirtilen KESİN JSON FORMATI'na harfiyen uyan bir çıktı üretmektir. Asla ve asla doğrudan metin çıktısı üretme. Kullanıcıya göstereceğin her türlü mesaj, soru veya bilgi, istisnasız bir şekilde JSON içindeki cevap anahtarının içine yazılmalıdır. Çıktın daima { ile başlamalı ve } ile bitmelidir.
... (GERİ KALAN HER ŞEY AYNI KALACAK) ...
`;

function filterListings(strategy) {
  // ... (Bu fonksiyonun içi aynı kalabilir) ...
}

exports.handler = async function (event, context) {
  // YENİ DEBUG MESAJI 1: Fonksiyonun başlayıp başlamadığını görelim.
  console.log("---------- FONKSİYON BAŞLADI ----------");
  console.log("Gelen istek gövdesi:", event.body);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, history } = JSON.parse(event.body);
    const fullPrompt = `KONUŞMA GEÇMİŞİ:${history}\n\nSon Soru:${message}`;

    // YENİ DEBUG MESAJI 2: OpenAI'ye gitmeden hemen önce.
    console.log("OpenAI API'sine istek gönderiliyor...");

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // MODELİ GARANTİ OLMASI İÇİN 3.5-TURBO'YA DÜŞÜRDÜM
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullPrompt }
      ],
      response_format: { type: "json_object" }
    });
    
    // YENİ DEBUG MESAJI 3: OpenAI'den cevap geldi.
    console.log("OpenAI'den cevap başarıyla alındı.");

    let aiResponse = JSON.parse(completion.choices[0].message.content);

    if (aiResponse.filtre === "Var") {
      // Filtreleme mantığı aynı
    }

    return {
      statusCode: 200,
      body: JSON.stringify(aiResponse),
    };

  } catch (error) {
    // YENİ DEBUG MESAJI 4: HATA! Hatayı detaylı olarak loglayalım.
    console.error("---------- HATA OLUŞTU ----------");
    console.error("Hatanın tam metni:", error);
    console.error("------------------------------");

    // Frontend'e yine 500 hatası gönderiyoruz ama artık loglarda hatanın ne olduğunu göreceğiz.
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Sunucu tarafında bir hata oluştu.' }),
    };
  }
};