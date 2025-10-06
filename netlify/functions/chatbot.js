// netlify/functions/chatbot.js - İLÇE/MAHALLE AYRIŞTIRMALI NİHAİ VE TAM KOD

require('dotenv').config();
const { OpenAI } = require('openai');
const allListings = require('./ilan-data.js');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// === İLÇE/MAHALLE TESPİTİ İÇİN GÜNCELLENMİŞ SYSTEM PROMPT ===
const systemPrompt = `
KİMLİK: Onur Başaran, Yapay Zeka Gayrimenkul Asistanı.
GÖREV: Müşterinin ihtiyaçlarını adım adım öğrenerek en uygun mülkleri sunmak. Cevapların daima KESİN JSON ÇIKTI FORMATI'nda olmalıdır.

GÖREV AKIŞI
1.  **isim_sor (Başlangıç):** Sadece müşterinin ismini sor.
2.  **konum_sor:** İsmi aldıktan sonra, arama yapacağı ilçe/mahalle bilgisini sor.
3.  **form_goster:** Kullanıcı konum bilgisini girdiğinde, bu bilgiyi analiz et. İlçe ve mahalleyi AYRI AYRI tespit etmeye çalış. Bu bilgileri 'arama_stratejisi' objesindeki 'konum' (ilçe için) ve 'mahalle' alanlarına kaydet. 'mahalle' tespit edilemezse "Tümü" olarak bırak. Ardından 'form_goster' adımına geç.
4.  **onay_goster:** Kullanıcı formu doldurduğunda, gelen verileri al ve TÜM KRİTERLERİ (ilçe ve mahalle dahil) özetleyerek onay iste.

JSON ÇIKTILARI
*   **isim_sor:**
    { "adim": "isim_sor", "eylem": "soru_sor", "cevap": "Harika bir başlangıç yapalım! İsminizi öğrenebilir miyim?", "arama_stratejisi": { "isim": null, "konum": null, "mahalle": "Tümü" } }
*   **konum_sor:**
    { "adim": "konum_sor", "eylem": "soru_sor", "cevap": "Memnun oldum [İsim]! Lütfen aradığınız ilçe ve varsa mahalle bilgisini yazar mısınız? (Örn: Narlıdere, Yenikale)", "arama_stratejisi": { "isim": "[İsim]", "konum": null, "mahalle": "Tümü" } }
*   **form_goster:** (Örnek: Kullanıcı "narlıdere yenikale mahallesi" girdi)
    { "adim": "form_goster", "eylem": "form_goster", "cevap": "Harika! Şimdi de diğer kriterlerinizi seçerek devam edelim.", "arama_stratejisi": { "isim": "[İsim]", "konum": "Narlıdere", "mahalle": "Yenikale" } }
*   **onay_goster:**
    { "adim": "onay_goster", "eylem": "soru_sor", "cevap": "Kriterlerinizi özetliyorum:\\n- Konum: [Konum]\\n- Mahalle: [Mahalle]\\n- Amaç: [Amaç]\\n- Mülk Tipi: [Mülk Tipi]\\n- Bütçe: [Bütçe]\\n- Oda Sayısı: [Oda Sayısı]\\n\\nOnaylıyor musunuz?", "secenekler": ["Onayla ve İlanları Getir", "Filtreyi Değiştir"] }
`;

// === BÜYÜK/KÜÇÜK HARFE DUYARSIZ FİLTRELEME İÇİN GÜNCELLENMİŞ FONKSİYON ===
function filterListings(strategy) {
  const k = strategy.arama_stratejisi || strategy;
  const ODA_SAYISI_HIYERARSISI = ["1+1", "2+1", "2.5+1", "3+1", "3.5+1", "3+2", "4+1", "4+2", "4.5+1", "5+1", "5+2", "6+2", "7+1", "7+2", "8+1", "10+1"];
  const DAIRE_TIPLERI = ["daire", "rezidans"];
  const MUSTAKIL_TIPLERI = ["villa", "müstakil ev", "köşk & konak", "yazlık", "yalı dairesi", "çiftlik evi"];

  return allListings.filter(ilan => {
    // Bütçe Filtresi
    const butceStr = (k.butce || "");
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
    
    // Oda Sayısı Filtresi
    const minOdaSayisi = (k.odaSayisi || "").replace(' ve üzeri', '');
    if (minOdaSayisi) {
      const startIndex = ODA_SAYISI_HIYERARSISI.indexOf(minOdaSayisi);
      if (startIndex > -1 && !ODA_SAYISI_HIYERARSISI.slice(startIndex).includes(ilan['Oda Sayısı'])) return false;
    }

    // Mülk Tipi Filtresi
    const konutTipi = (k.mulkTipi || "").toLowerCase();
    if (konutTipi) {
        const ilanTipi = (ilan['Konut Tipi'] || "").toLowerCase();
        let tipUygun = false;
        if (konutTipi === 'daire' && DAIRE_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'müstakil ev' && MUSTAKIL_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'villa' && ilanTipi === 'villa') tipUygun = true;
        if (!tipUygun) return false;
    }

    // GÜNCELLENDİ: Büyük/küçük harfe duyarsız ilçe ve mahalle filtreleme
    const arananIlce = (k.konum || "").toLowerCase().trim();
    if (arananIlce) {
        const ilanIlce = (ilan.Konum || "").toLowerCase().trim();
        if (!ilanIlce.includes(arananIlce)) return false;
    }

    const arananMahalle = (k.mahalle || "").toLowerCase().trim();
    if (arananMahalle && arananMahalle !== 'tümü') {
        const ilanMahalle = (ilan.Mahalle || "").toLowerCase().trim();
        if (!ilanMahalle.includes(arananMahalle)) return false;
    }

    return true;
  });
}

// === ANA HANDLER FONKSİYONU (DEĞİŞİKLİK YOK) ===
exports.handler = async function (event, context) {
    try {
        const { message, history, current_strategy } = JSON.parse(event.body);
        
        // Kullanıcı onayı geldiyse, OpenAI'ye tekrar sormadan direkt ilanları filtrele
        if (message === "Onayla ve İlanları Getir") {
            const foundListings = filterListings(current_strategy);
            let responseBody;

            if (foundListings.length > 0) {
                responseBody = {
                    adim: "telefon_formu_goster",
                    eylem: "sunum_yap_ve_form_goster",
                    cevap: `Harika! Kriterlerinize uygun ${foundListings.length} ilan arasından öne çıkanlar şunlar.`,
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