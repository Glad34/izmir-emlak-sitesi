// netlify/functions/chatbot.js - TOPLU FORM GÖNDERİMİNE UYGUN NİHAİ KOD

require('dotenv').config();
const { OpenAI } = require('openai');
const allListings = require('./ilan-data.js');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// === YENİ AKIŞA UYGUN SYSTEM PROMPT ===
const systemPrompt = `
KİMLİK
Adın: Onur Başaran, Yapay Zeka Gayrimenkul Asistanı.
Görevin: Müşterinin ihtiyaçlarını anlamak ve en uygun mülkleri sunmak. Cevapların daima KESİN JSON ÇIKTI FORMATI'nda olmalıdır.

GÖREV AKIŞI
1.  **isim_sor (Başlangıç):** İlk olarak sadece müşterinin ismini sor.
2.  **form_goster:** İsmi aldıktan sonra, BİR SONRAKİ CEVABINDA MUTLAKA ve SADECE 'form_goster' adımını kullan. Bu adım, frontend'de çoktan seçmeli bir form gösterecek. Başka bir soru sorma.
3.  **onay_goster:** Kullanıcı formu doldurup gönderdiğinde, gelen verileri ('Kullanıcı Form Seçimleri: ...' ile başlayacak) al, 'arama_stratejisi'ne kaydet ve tüm kriterleri özetleyerek onay iste.
4.  **sunum_yap:** Kullanıcı onayı verdiğinde ("Onayla ve İlanları Getir" mesajı geldiğinde), ilanları filtrele ve sunum yap.

ADIMLAR VE JSON ÇIKTILARI
*   **isim_sor:**
    { "adim": "isim_sor", "eylem": "soru_sor", "cevap": "Harika bir başlangıç yapalım! İsminizi öğrenebilir miyim?", "secenekler": null, "arama_stratejisi": {} }
*   **form_goster:**
    { "adim": "form_goster", "eylem": "form_goster", "cevap": "Memnun oldum [İsim]! Size en uygun seçenekleri bulabilmem için lütfen aşağıdaki bilgileri seçin.", "secenekler": null, "arama_stratejisi": { "isim": "[İsim]" } }
*   **onay_goster:**
    { "adim": "onay_goster", "eylem": "soru_sor", "cevap": "Harika, kriterlerinizi özetliyorum:\\n- Amaç: [Amaç]\\n- Mülk Tipi: [Mülk Tipi]\\n- Bütçe: [Bütçe]\\n- Oda Sayısı: [Oda Sayısı]\\n\\nOnaylıyor musunuz?", "secenekler": ["Onayla ve İlanları Getir", "Filtreyi Değiştir"], "arama_stratejisi": { /* doldurulmuş strateji */ } }
*   **telefon_sor:**
    { "adim": "telefon_sor", "eylem": "soru_sor", "cevap": "Tüm listeyi ve detayları size gönderebilmem için telefon numaranızı paylaşır mısınız?", "secenekler": null }
`;

// === FİLTRELEME FONKSİYONU (DEĞİŞİKLİK YOK) ===
function filterListings(strategy) {
  const k = strategy.arama_stratejisi || strategy; // Gelen objenin yapısına göre ayarla
  const ODA_SAYISI_HIYERARSISI = ["1+1", "2+1", "2.5+1", "3+1", "3.5+1", "3+2", "4+1", "4+2", "4.5+1", "5+1", "5+2", "6+2", "7+1", "7+2", "8+1", "10+1"];
  const DAIRE_TIPLERI = ["daire", "rezidans"];
  const MUSTAKIL_TIPLERI = ["villa", "müstakil ev", "köşk & konak", "yazlık", "yalı dairesi", "çiftlik evi"];

  return allListings.filter(ilan => {
    const butceStr = (k.butce || k.butce || "");
    if (butceStr) {
        const sayilar = butceStr.match(/\d{1,3}(?:\.\d{3})*/g)?.map(s => s.replace(/\./g, '')) || [];
        let minButce = 0, maxButce = 0;
        if (butceStr.includes('Üzeri')) {
            minButce = parseInt(sayilar[0]); maxButce = Infinity;
        } else if (sayilar.length > 1) {
            minButce = parseInt(sayilar[0]); maxButce = parseInt(sayilar[1]);
        } else if (sayilar.length === 1) {
            minButce = 0; maxButce = parseInt(sayilar[0]);
        }
        if (parseInt(ilan.Fiyat) > maxButce || parseInt(ilan.Fiyat) < minButce) return false;
    }

    const minOdaSayisi = (k.odaSayisi || k.oda_sayisi || "").replace(' ve üzeri', '');
    if (minOdaSayisi) {
      const startIndex = ODA_SAYISI_HIYERARSISI.indexOf(minOdaSayisi);
      if (startIndex > -1 && !ODA_SAYISI_HIYERARSISI.slice(startIndex).includes(ilan['Oda Sayısı'])) return false;
    }

    const konutTipi = (k.mulkTipi || k.konut_tipi || "").toLowerCase();
    if (konutTipi) {
        const ilanTipi = (ilan['Konut Tipi'] || "").toLowerCase();
        let tipUygun = false;
        if (konutTipi === 'daire' && DAIRE_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'müstakil ev' && MUSTAKIL_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'villa' && ilanTipi === 'villa') tipUygun = true;
        if (!tipUygun) return false;
    }
    return true;
  });
}

// === ANA HANDLER FONKSİYONU (YENİ AKIŞA GÖRE GÜNCELLENDİ) ===
exports.handler = async function (event, context) {
    try {
        const { message, history, current_strategy } = JSON.parse(event.body);
        
        // Eğer kullanıcı onayı geldiyse, OpenAI'ye tekrar sormadan direkt ilanları filtrele
        if (message === "Onayla ve İlanları Getir") {
            const foundListings = filterListings(current_strategy);
            let responseBody;

            if (foundListings.length > 0) {
                responseBody = {
                    adim: "telefon_sor",
                    eylem: "sunum_yap_ve_sor",
                    cevap: `Harika! Kriterlerinize uygun ${foundListings.length} ilan arasından öne çıkanlar şunlar.`,
                    secenekler: null,
                    ilan_sonuclari: {
                        toplam_sayi: foundListings.length,
                        sunum: foundListings.slice(0, 2).map(ilan => ({
                            id: ilan['İlan ID'], baslik: ilan.Başlık, fiyat: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(ilan.Fiyat), resim: ilan['Görsel Linki'], link: `ilan-detay.html?id=${ilan['İlan ID']}`
                        }))
                    }
                };
            } else {
                responseBody = {
                    adim: "onay_sonrasi",
                    eylem: "soru_sor",
                    cevap: "Maalesef bu kriterlere uygun ilan bulamadım. Kriterleri değiştirmek ister misiniz?",
                    secenekler: ["Filtreyi Değiştir"]
                };
            }
            return { statusCode: 200, body: JSON.stringify(responseBody) };
        }

        // Diğer tüm durumlarda OpenAI'ye danış
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: `KONUŞMA GEÇMİŞİ:${history}\n\nKULLANICI MESAJI:${message}` }
            ],
            response_format: { type: "json_object" }
        });

        const aiResponse = JSON.parse(response.choices[0].message.content);
        return { statusCode: 200, body: JSON.stringify(aiResponse) };

    } catch (error) {
        console.error("HATA OLUŞTU:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Sunucu tarafında bir hata oluştu.' }) };
    }
};