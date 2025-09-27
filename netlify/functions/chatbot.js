require('dotenv').config(); // Bu satır .env dosyasındaki değişkenleri yükler

// netlify/functions/chatbot.js

const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

// OpenAI API anahtarınızı Netlify'ın arayüzünden environment variable olarak ekleyin.
// ASLA KODUN İÇİNE DOĞRUDAN YAZMAYIN!
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Projenizin ana dizinindeki ilanlar.json dosyasını okumak için
const listingsPath = path.resolve(process.cwd(), 'data', 'ilanlar.json');
const allListings = JSON.parse(fs.readFileSync(listingsPath, 'utf8'));

// OpenAI'ye göndereceğimiz ana talimat (Developer Prompt)
const systemPrompt = `
KİMLİK
Adın: Onur Başaran
Rolün: Yapay Zeka Gayrimenkul Asistanı
Ana Görev: Müşteriyle sohbet ederek GÖREV AKIŞI'nı takip et, gerekli tüm bilgileri topla ve KESİN JSON formatında bir arama stratejisi oluştur. Çıktın daima { ile başlamalı ve } ile bitmelidir.
... (Daha önce sağladığınız talimatın tamamı buraya gelecek) ...
`;

// Gelen arama stratejisine göre ilanları filtreleyen fonksiyon
function filterListings(strategy) {
  const kriterler = strategy.arama_stratejisi.musteri_kriterleri;
  const bolge = strategy.arama_stratejisi.arama_bolgeleri[0];

  return allListings.filter(ilan => {
    // Fiyat Filtresi
    const fiyat = parseInt(ilan.Fiyat);
    if (fiyat < bolge.fiyat_min || fiyat > bolge.fiyat_max) return false;

    // Oda Sayısı Filtresi
    const arananOdaSayilari = kriterler.oda_sayisi.split(',');
    if (kriterler.oda_sayisi !== "Tümü" && !arananOdaSayilari.includes(ilan['Oda Sayısı'])) return false;

    // Konum (İlçe) Filtresi
    if (bolge.bolge_adi && ilan.Konum.toLowerCase() !== bolge.bolge_adi.toLowerCase()) return false;
    
    // Konut Tipi Filtresi
    if (kriterler.konut_tipi && kriterler.konut_tipi !== "Tümü" && ilan['Konut Tipi'].toLowerCase() !== kriterler.konut_tipi.toLowerCase()) return false;

    // Bina Yaşı Filtresi
    if (kriterler.bina_yasi_max !== "Tümü" && parseInt(ilan['Bina Yaşı']) > parseInt(kriterler.bina_yasi_max)) return false;

    // Balkon Filtresi
    if (kriterler.balkon === "Var" && (ilan.Balkon === "N/A" || ilan.Balkon.toLowerCase() === 'yok')) return false;
    if (kriterler.balkon === "Yok" && (ilan.Balkon !== "N/A" && ilan.Balkon.toLowerCase() !== 'yok')) return false;

    // Diğer filtreleri buraya ekleyebilirsiniz... (Asansör, Otopark vb.)

    return true; // Tüm filtrelerden geçti
  });
}


exports.handler = async function (event, context) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { message, history } = JSON.parse(event.body);

    const fullPrompt = `KONUŞMA GEÇMİŞİ:${history}\n\nSon Soru:${message}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo", // Veya "gpt-3.5-turbo"
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: fullPrompt }
      ],
      response_format: { type: "json_object" }
    });

    let aiResponse = JSON.parse(completion.choices[0].message.content);

    // Eğer AI filtreleme için hazır olduğunu belirtirse ("filtre": "Var")
    if (aiResponse.filtre === "Var") {
      const foundListings = filterListings(aiResponse);
      aiResponse.ilan_sonuclari = {
        toplam_sayi: foundListings.length,
        // Sadece ilk 2 ilanın özetini frontend'e gönder
        sunum: foundListings.slice(0, 2).map(ilan => ({
          id: ilan['İlan ID'],
          baslik: ilan.Başlık,
          fiyat: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(ilan.Fiyat),
          resim: ilan['Görsel Linki'],
          link: ilan['Detay Linki'] // Bu linki kendi sitenizdeki detay sayfasına yönlendirebilirsiniz
        }))
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(aiResponse),
    };

  } catch (error) {
    console.error('Error with OpenAI or filtering:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Bir hata oluştu.' }),
    };
  }
};