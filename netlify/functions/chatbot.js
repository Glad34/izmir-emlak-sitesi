// netlify/functions/chatbot.js - EKSİKSİZ VE NİHAİ KOD

require('dotenv').config();
const { OpenAI } = require('openai');
const allListings = require('./ilan-data.js');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const ODA_SAYISI_HIYERARSISI = ["1+1", "2+1", "2.5+1", "3+1", "3.5+1", "3+2", "4+1", "4+2", "4.5+1", "5+1", "5+2", "6+2", "7+1", "7+2", "8+1", "10+1"];
const DAIRE_TIPLERI = ["daire", "rezidans"];
const MUSTAKIL_TIPLERI = ["villa", "müstakil ev", "köşk & konak", "yazlık", "yalı dairesi", "çiftlik evi"];
const ILCE_KOMSULUK = {
    "Narlıdere": ["Balçova", "Güzelbahçe"],
    "Balçova": ["Narlıdere", "Karabağlar", "Konak"],
    // Diğer ilçeleri buraya ekleyebilirsiniz.
};

// === AKILLI FİLTRE DEĞİŞTİRME VE DOĞRU JSON MANTIĞI EKLENMİŞ NİHAİ SYSTEM PROMPT ===
// chatbot.js içindeki systemPrompt'u bununla değiştirin
const systemPrompt = `
KİMLİK
Adın: Onur Başaran, Yapay Zeka Gayrimenkul Asistanı.
Ana Görevin: Müşteriden gelen ilk toplu bilgileri işlemek, eksik kalan kritik bilgileri (konum vb.) sormak ve sonrasında filtreleme sonuçlarını analiz ederek kullanıcıyı yönlendirmek. Cevabın daima KESİN JSON ÇIKTI FORMATI'nda olmalıdır. Your response must be in JSON format.

GÖREV AKIŞI
1.  **ilk_veri_alma (Başlangıç):** Bot ilk açıldığında, kullanıcıya bir karşılama mesajı göster. Bu adımda kullanıcıdan toplu veri beklendiği için AI bir şey yapmaz, sadece frontend'in hazırladığı formu bekler.
    JSON Çıktısı (Başlangıç için): adim:"ilk_veri_alma", eylem:"form_goster", cevap:"Merhaba, ben sanal gayrimenkul asistanınız Onur. Hayalinizdeki evi bulmak için lütfen aşağıdaki temel bilgileri seçin.", secenekler:null

2.  **konum_sor:** Kullanıcı ilk dört bilgiyi (amaç, tip, bütçe, oda sayısı) gönderdikten sonra, bu bilgileri 'arama_stratejisi'ne kaydet. Ardından, eksik olan konum bilgisini iste.
    JSON Çıktısı: adim:"konum_sor", eylem:"soru_sor", cevap:"Harika seçimler! Şimdi arama yapmak istediğiniz ilçe ve varsa mahalle bilgisini yazar mısınız? (Örn: Narlıdere, Yenikale)", secenekler:null

3.  **ekstra_sor:** Konum bilgisi alındıktan sonra, ek özellikleri sor.
    JSON Çıktısı: adim:"ekstra_sor", eylem:"soru_sor", cevap:"Neredeyse tamamız! Varsa, olmazsa olmaz dediğiniz ek özellikleri (balkon, otopark, bina yaşı vb.) yazabilirsiniz. Yoksa 'yok' yazmanız yeterli.", secenekler:null

4.  **onay_goster:** Toplanan tüm bilgileri özetle ve onay iste. (Bu adımdan sonrası mevcut akışla aynıdır).

(onay_sonrasi, degisiklik_sor, sunum_yap gibi diğer adımlar ve kurallar aynı kalır.)

KESİN JSON ÇIKTI FORMATI
{
"status": "...", "filtre": "...", "adim": "...", "eylem": "...", "cevap": "...", "secenekler": [],
"arama_stratejisi": {
    "isim": null, "amac": null, "konut_tipi": null, "ilce": null, "mahalle": null, "butce": null,
    "oda_sayisi": null, "balkon": "Tümü", "otopark": "Tümü", "asansor": "Tümü", "bina_yasi_max": "Tümü"
}
}
`;

// === ÇOKLU KONUM FİLTRELEME İÇEREN NİHAİ filterListings FONKSİYONU ===
function filterListings(strategy) {
  console.log("Filtreleme başladı. Strateji:", JSON.stringify(strategy, null, 2));
  const k = strategy.arama_stratejisi;

  const filtered = allListings.filter(ilan => {
    // 1. BÜTÇE FİLTRESİ
    const butceStr = (k.butce || "");
    if (butceStr) {
        const sayilar = butceStr.match(/\d{1,3}(?:\.\d{3})*/g)?.map(s => s.replace(/\./g, '')) || [];
        let maxButce = 0;
        if (butceStr.includes('Üzeri')) { maxButce = Infinity; }
        else if (sayilar.length > 1) { maxButce = parseInt(sayilar[1]); }
        else if (sayilar.length === 1) { maxButce = parseInt(sayilar[0]); }
        if (maxButce > 0 && maxButce !== Infinity) { maxButce += maxButce >= 10000000 ? 1000000 : 500000; }
        if (parseInt(ilan.Fiyat) > maxButce) return false;
    }

    // 2. ODA SAYISI FİLTRESİ
    const minOdaSayisi = (k.oda_sayisi || "").replace(' ve üzeri', '');
    if (minOdaSayisi) {
      const startIndex = ODA_SAYISI_HIYERARSISI.indexOf(minOdaSayisi);
      if (startIndex > -1 && !ODA_SAYISI_HIYERARSISI.slice(startIndex).includes(ilan['Oda Sayısı'])) return false;
    }

    // 3. KONUT TİPİ FİLTRESİ
    const konutTipi = (k.konut_tipi || "").toLowerCase();
    if (konutTipi) {
        const ilanTipi = (ilan['Konut Tipi'] || "").toLowerCase();
        let tipUygun = false;
        if (konutTipi === 'daire' && DAIRE_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'müstakil ev' && MUSTAKIL_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'villa' && ilanTipi === 'villa') tipUygun = true;
        if (!tipUygun) return false;
    }

    // 4. ÇOKLU KONUM FİLTRESİ
    const arananIlceler = (k.konum || "").toLowerCase().split(/, | ve |&/).map(item => item.trim()).filter(item => item);
    const arananMahalleler = (k.mahalle !== "Tümü" && k.mahalle) ? k.mahalle.toLowerCase().split(/, | ve |&/).map(item => item.trim()).filter(item => item) : [];

    if (arananIlceler.length > 0) {
        const ilanIlce = (ilan.Konum || "").toLowerCase();
        if (!arananIlceler.some(ilce => ilanIlce.includes(ilce))) return false;
    }
    if (arananMahalleler.length > 0) {
        const ilanMahalle = (ilan.Mahalle || "").toLowerCase();
        if (!arananMahalleler.some(mahalle => ilanMahalle.includes(mahalle))) return false;
    }

    // 5. DETAYLI EK KRİTERLER FİLTRESİ
    if (k.balkon === 'Var' && ((ilan.Balkon || "").toLowerCase() === 'yok' || (ilan.Balkon || "") === "N/A")) return false;
    if (k.asansor === 'Var' && ((ilan.Asansör || "").toLowerCase() === 'yok' || (ilan.Asansör || "") === "N/A")) return false;
    if (k.bina_yasi_max !== 'Tümü' && k.bina_yasi_max && parseInt(ilan['Bina Yaşı']) > parseInt(k.bina_yasi_max)) return false;
    
    return true;
  });

  console.log(`Filtreleme tamamlandı. Bulunan ilan sayısı: ${filtered.length}`);
  return filtered;
}

// === ANA HANDLER FONKSİYONU ===
exports.handler = async function (event, context) {
    try {
        const { message, history } = JSON.parse(event.body);
        const isNewConversation = !history && !message;
        const promptMessage = isNewConversation ? "Yeni bir konuşma başlat." : message;

        const initialResponse = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `KONUŞMA GEÇMİŞİ:${history}\n\nSon Soru:${promptMessage}` }],
          response_format: { type: "json_object" }
        });

        let aiResponse = JSON.parse(initialResponse.choices[0].message.content);

        if (aiResponse.adim === 'onay_sonrasi' || aiResponse.adim === 'arama_genislet' || aiResponse.adim === 'kriter_guncelle') {
            const foundListings = filterListings(aiResponse);
            const ilanSayisi = foundListings.length;
            const komsuIlceler = aiResponse.arama_stratejisi.konum ? (ILCE_KOMSULUK[aiResponse.arama_stratejisi.konum.split(',')[0].trim()] || []).join(', ') : "";
            const reportPrompt = `SİSTEM NOTU: Filtreleme yapıldı ve ${ilanSayisi} adet ilan bulundu. Mevcut strateji: ${JSON.stringify(aiResponse.arama_stratejisi)}. Komşu ilçeler: ${komsuIlceler}. Şimdi GÖREV AKIŞI'ndaki 'onay_sonrasi (Akıllı Öneri)' adımını bu bilgilere göre uygula.`;
            
            const finalResponse = await openai.chat.completions.create({
                model: "gpt-4-turbo",
                messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `KONUŞMA GEÇMİŞİ:${history}\n\nSon Soru:${promptMessage}\n\n${reportPrompt}` }],
                response_format: { type: "json_object" }
            });
            aiResponse = JSON.parse(finalResponse.choices[0].message.content);
        }
       
        if (aiResponse.eylem === "sunum_yap") {
            const foundListings = filterListings(aiResponse);
            aiResponse.ilan_sonuclari = {
                toplam_sayi: foundListings.length,
                sunum: foundListings.slice(0, 2).map(ilan => ({
                  id: ilan['İlan ID'], baslik: ilan.Başlık, fiyat: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(ilan.Fiyat), resim: ilan['Görsel Linki'], link: `ilan-detay.html?id=${ilan['İlan ID']}`
                }))
            };
            aiResponse.cevap = `Harika! Kriterlerinize uygun ${foundListings.length} ilan arasından öne çıkanlar şunlar.`;
            aiResponse.secenekler = null;
            aiResponse.adim = "telefon_iste";
        }

        return { statusCode: 200, body: JSON.stringify(aiResponse) };

    } catch (error) {
        console.error("HATA OLUŞTU:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Sunucu tarafında bir hata oluştu.' }) };
    }
};