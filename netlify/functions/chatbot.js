// netlify/functions/chatbot.js - TÜM GÜNCELLEMELERİ İÇEREN NİHAİ KOD

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
    "Narlıdere": ["2. İnönü", "Altıevler", "Atatürk", "Çatalkaya", "Huzur", "Ilıca", "Limanreis", "Narlı", "Yenikale", "Yeniköy"],
    "Balçova": ["Bahçelerarası", "Çetin Emeç", "Eğitim", "Korutürk", "Onur", "Teleferik"],
    "Güzelbahçe": ["Atatürk", "Çelebi", "Çamlı", "Kahramandere", "Kamiloba", "Küçükkaya", "Maltepe", "Yaka", "Yelki", "Siteler"]

    // Diğer ilçeleri buraya ekleyebilirsiniz.
};

// === "ARAMAYI GENİŞLET" MANTIĞI EKLENMİŞ NİHAİ SYSTEM PROMPT ===
// === EN GELİŞMİŞ VE NİHAİ SYSTEM PROMPT ===
const systemPrompt = `
KİMLİK
Adın: Onur Başaran, proaktif ve akıllı bir Yapay Zeka Gayrimenkul Asistanı.
Ana Görevin: Müşteriyi adım adım yönlendirerek bir emlak arama formu doldurmak, ardından filtreleme sonuçlarını analiz ederek kullanıcıya en iyi seçenekleri sunmak. Cevabın daima aşağıda belirtilen KESİN JSON ÇIKTI FORMATI'nda olmalıdır. Your response must be in JSON format.

GENEL KURALLAR
1.  **TÜRKÇE ZORUNLULUĞU:** Tüm iletişimin İSTİSNASIZ Türkçe olmalıdır.
2.  **TEKRARLAMA YASAĞI:** Kullanıcının cevabını aldıktan sonra, bilgiyi 'arama_stratejisi'ne kaydet ve GÖREV AKIŞI'ndaki BİR SONRAKİ adıma geç. ASLA aynı soruyu tekrar sorma.

GÖREV AKIŞI
1.  **Form Doldurma (isim_sor -> ekstra_sor):** Sırasıyla tüm bilgileri topla ve 'arama_stratejisi' objesini doldur.
2.  **onay_goster:** Toplanan tüm bilgileri özetle ve onay iste. (secenekler: ["Onayla ve İlanları Getir", "Filtreyi Değiştir"])
3.  **onay_sonrasi (Akıllı Öneri):** Backend'den gelen ilan sayısını ve mevcut stratejiyi analiz et:
    *   Eğer 5+ ilan varsa: "Harika! Kriterlerinize uygun [X] adet ilan buldum." de. (secenekler: ["İlanları Göster", "Filtreyi Değiştir"])
    *   Eğer 1-4 ilan varsa ve 'mahalle' belirtilmişse: "Sadece [X] adet ilan bulabildim. İsterseniz [ilce] ilçesindeki tüm mahalleleri arayabiliriz. Ne dersiniz?" de. (secenekler: ["Evet, Tüm Mahallelerde Ara", "Hayır, Bu Şekilde Göster"])
    *   Eğer 1-4 ilan varsa ve 'mahalle' belirtilmemişse: "Sadece [X] adet ilan bulabildim. İsterseniz aramaya komşu ilçeleri ([komşu ilçeler]) ekleyebiliriz." de. (secenekler: ["Evet, Komşuları Ekle", "Hayır, Bu Şekilde Göster"])
    *   Eğer 0 ilan varsa: "Maalesef bu kriterlere uygun hiç ilan bulamadım." de. (secenekler: ["Filtreyi Değiştir"])
4.  **arama_genislet:** Kullanıcı "Tüm Mahallelerde Ara" veya "Komşuları Ekle" derse, bu yeni bilgiyi 'arama_stratejisi'ne uygula. Örneğin, 'mahalle' alanını null yap veya 'ilce' alanına komşuları ekle. Ardından, güncellenmiş strateji ile 'onay_sonrasi' adımını TEKRAR tetikle.
5.  **degisiklik_sor:** Kullanıcı 'Filtreyi Değiştir' derse, "Hangi kriteri güncellemek istersiniz?" diye sor. (secenekler: ["Konum", "Bütçe", "Diğer Özellikler"])
6.  **sunum_yap:** Kullanıcı sonuçları görmeyi onaylarsa ("İlanları Göster" veya "Hayır, Bu Şekilde Göster" derse), backend'e son talimatı ver.

KESİN JSON ÇIKTI FORMATI
{
"status": "...", "filtre": "...", "adim": "...", "eylem": "...", "cevap": "...", "secenekler": [],
"arama_stratejisi": {
    "isim": null, "amac": null, "konut_tipi": null, "ilce": null, "mahalle": null, "butce": null,
    "oda_sayisi": null, "balkon": "Tümü", "otopark": "Tümü", "asansor": "Tümü", "bina_yasi_max": "Tümü"
}
}
`;

// === NİHAİ filterListings FONKSİYONU ===
function filterListings(strategy) {
  console.log("Filtreleme başladı. Strateji:", JSON.stringify(strategy, null, 2));
  const k = strategy.arama_stratejisi;

  const filtered = allListings.filter(ilan => {
    // 1. SAĞLAM VE ESNEK BÜTÇE FİLTRESİ
    const butceStr = (k.bütçe || k.butce || "");
    if (butceStr) {
        const sayilar = butceStr.match(/\d{1,3}(?:\.\d{3})*/g)?.map(s => s.replace(/\./g, '')) || [];
        let maxButce = 0;
        if (butceStr.includes('Üzeri')) { maxButce = Infinity; }
        else if (sayilar.length > 1) { maxButce = parseInt(sayilar[1]); }
        else if (sayilar.length === 1) { maxButce = parseInt(sayilar[0]); }
        
        if (maxButce > 0 && maxButce !== Infinity) {
            const esneklikPayi = maxButce >= 10000000 ? 1000000 : 500000;
            maxButce += esneklikPayi;
        }
        if (parseInt(ilan.Fiyat) > maxButce) return false;
    }

    // 2. ARTAN ODA SAYISI FİLTRESİ
    const minOdaSayisi = (k.oda_sayısı || k.oda_sayisi || "").replace(' ve üzeri', '');
    if (minOdaSayisi) {
      const startIndex = ODA_SAYISI_HIYERARSISI.indexOf(minOdaSayisi);
      if (startIndex > -1) {
        if (!ODA_SAYISI_HIYERARSISI.slice(startIndex).includes(ilan['Oda Sayısı'])) return false;
      }
    }

    // 3. GRUPLANMIŞ KONUT TİPİ FİLTRESİ
    const konutTipi = (k.konut_tipi || k.tip || "").toLowerCase();
    if (konutTipi) {
        const ilanTipi = (ilan['Konut Tipi'] || "").toLowerCase();
        let tipUygun = false;
        if (konutTipi === 'daire' && DAIRE_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'müstakil ev' && MUSTAKIL_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'villa' && ilanTipi === 'villa') tipUygun = true;
        if (!tipUygun) return false;
    }

    // 4. DOĞRU VE DETAYLI KONUM FİLTRESİ
    if (k.ilce && (!ilan.Konum || !ilan.Konum.toLowerCase().includes(k.ilce.toLowerCase()))) return false;
    if (k.mahalle && (!ilan.Mahalle || !ilan.Mahalle.toLowerCase().includes(k.mahalle.toLowerCase()))) return false;
    
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

        if (aiResponse.adim === 'arama_genislet' || aiResponse.adim === 'onay_sonrasi') {
            const foundListings = filterListings(aiResponse);
            const ilanSayisi = foundListings.length;
            const reportPrompt = `SİSTEM NOTU: Filtreleme yapıldı ve ${ilanSayisi} adet ilan bulundu. Şimdi GÖREV AKIŞI'ndaki 'onay_sonrasi (Akıllı Öneri)' adımını bu bilgiye göre uygula. Eğer kullanıcı aramayı genişletmeyi seçtiyse, güncellenmiş stratejiyi oluştur ve tekrar 'onay_sonrasi' adımını tetikle.`;
            
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
            aiResponse.cevap = `Harika! Kriterlerinize uygun ${foundListings.length} ilan arasından öne çıkanlar şunlar. Tüm listeyi size gönderebilmem için telefon numaranızı paylaşır mısınız?`;
            aiResponse.secenekler = null;
            aiResponse.adim = "telefon_iste";
        }

        return { statusCode: 200, body: JSON.stringify(aiResponse) };
    } catch (error) {
        console.error("HATA OLUŞTU:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Sunucu tarafında bir hata oluştu.' }) };
    }
};