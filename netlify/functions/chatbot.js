// netlify/functions/chatbot.js - KULLANICI ETKİLEŞİMİYLE ADIMLARI AYIRAN NİHAİ VE TAM KOD

require('dotenv').config();
const { OpenAI } = require('openai');
const allListings = require('./ilan-data.js');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// === YENİ AKIŞA UYGUN SYSTEM PROMPT ===
const systemPrompt = `
KİMLİK: Onur Başaran, Yapay Zeka Gayrimenkul Asistanı.
GÖREV: Müşterinin ihtiyaçlarını adım adım öğrenerek en uygun mülkleri sunmak. Cevapların daima KESİN JSON ÇIKTI FORMATI'nda olmalıdır.

GÖREV AKIŞI
1.  **isim_sor (Başlangıç):** Sadece müşterinin ismini sor.
2.  **konum_sor:** İsmi aldıktan sonra, arama yapacağı ilçe/mahalle bilgisini sor.
3.  **form_goster:** Konum bilgisini aldıktan sonra, ilçe/mahalleyi ayrıştırıp kaydet ve çoktan seçmeli formu göster.
4.  **onay_goster:** Kullanıcı formu doldurduğunda, tüm kriterleri özetle ve onay iste.
5.  **sunum_yap:** Kullanıcı "Onayla" dediğinde, ilanları bul, önizlemeyi ve "öne çıkanlar..." mesajını göster, ardından BİR SONRAKİ EYLEM OLARAK kullanıcıya "Devam Et" seçeneği sun.
6.  **telefon_formu_goster:** Kullanıcı "Devam Et" dediğinde, telefon numarası formunu göster.

JSON ÇIKTILARI
*   **isim_sor:**
    { "adim": "isim_sor", "eylem": "soru_sor", "cevap": "Harika bir başlangıç yapalım! İsminizi öğrenebilir miyim?", "arama_stratejisi": { "isim": null, "konum": null, "mahalle": "Tümü" } }
*   **konum_sor:**
    { "adim": "konum_sor", "eylem": "soru_sor", "cevap": "Memnun oldum [İsim]! Lütfen aradığınız ilçe ve varsa mahalle bilgisini yazar mısınız? (Örn: Narlıdere, Yenikale)", "arama_stratejisi": { "isim": "[İsim]", "konum": null, "mahalle": "Tümü" } }
*   **form_goster:**
    { "adim": "form_goster", "eylem": "form_goster", "cevap": "Harika! Şimdi de diğer kriterlerinizi seçerek devam edelim.", "arama_stratejisi": { "isim": "[İsim]", "konum": "[Konum]", "mahalle": "[Mahalle]" } }
*   **onay_goster:**
    { "adim": "onay_goster", "eylem": "soru_sor", "cevap": "Kriterlerinizi özetliyorum:\\n- Konum: [Konum]\\n- Mahalle: [Mahalle]\\n...vb.\\nOnaylıyor musunuz?", "secenekler": ["Onayla ve İlanları Getir", "Filtreyi Değiştir"] }
`;

// === FİLTRELEME FONKSİYONU (DEĞİŞİKLİK YOK) ===
function filterListings(strategy) {
  // Bu fonksiyonun içi öncekiyle tamamen aynı kalacak.
  const k = strategy.arama_stratejisi || strategy;
  const ODA_SAYISI_HIYERARSISI = ["1+1", "2+1", "2.5+1", "3+1", "3.5+1", "3+2", "4+1", "4+2", "4.5+1", "5+1", "5+2", "6+2", "7+1", "7+2", "8+1", "10+1"];
  const DAIRE_TIPLERI = ["daire", "rezidans"];
  const MUSTAKIL_TIPLERI = ["villa", "müstakil ev", "köşk & konak", "yazlık", "yalı dairesi", "çiftlik evi"];
  return allListings.filter(ilan => {
    const butceStr = (k.butce || "");
    if (butceStr) {
        const sayilar = butceStr.match(/\d{1,3}(?:\.\d{3})*/g)?.map(s => s.replace(/\./g, '')) || [];
        let minButce = 0, maxButce = 0;
        if (butceStr.includes('Üzeri')) { minButce = parseInt(sayilar[0]); maxButce = Infinity; }
        else if (sayilar.length > 1) { minButce = parseInt(sayilar[0]); maxButce = parseInt(sayilar[1]); }
        else if (sayilar.length === 1) { minButce = 0; maxButce = parseInt(sayilar[0]); }
        if (parseInt(ilan.Fiyat) > maxButce || parseInt(ilan.Fiyat) < minButce) return false;
    }
    const minOdaSayisi = (k.odaSayisi || "").replace(' ve üzeri', '');
    if (minOdaSayisi) {
      const startIndex = ODA_SAYISI_HIYERARSISI.indexOf(minOdaSayisi);
      if (startIndex > -1 && !ODA_SAYISI_HIYERARSISI.slice(startIndex).includes(ilan['Oda Sayısı'])) return false;
    }
    const konutTipi = (k.mulkTipi || "").toLowerCase();
    if (konutTipi) {
        const ilanTipi = (ilan['Konut Tipi'] || "").toLowerCase();
        let tipUygun = false;
        if (konutTipi === 'daire' && DAIRE_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'müstakil ev' && MUSTAKIL_TIPLERI.includes(ilanTipi)) tipUygun = true;
        else if (konutTipi === 'villa' && ilanTipi === 'villa') tipUygun = true;
        if (!tipUygun) return false;
    }
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

// === ANA HANDLER (YENİ MANTIKLA GÜNCELLENDİ) ===
exports.handler = async function (event, context) {
    try {
        const { message, history, current_strategy } = JSON.parse(event.body);
        
        // 1. ADIM: KULLANICI İLANLARI İSTEDİĞİNDE
        if (message === "Onayla ve İlanları Getir") {
            const foundListings = filterListings(current_strategy);
            let responseBody;
            if (foundListings.length > 0) {
                responseBody = {
                    adim: "sunum_sonrasi_onay", // Yeni adım
                    eylem: "sunum_yap_ve_sor",
                    cevap: `Harika! Kriterlerinize uygun ${foundListings.length} ilan arasından öne çıkanlar şunlar.`,
                    secenekler: ["Devam Et"], // <<< EN KRİTİK DEĞİŞİKLİK
                    ilan_sonuclari: {
                        sunum: foundListings.slice(0, 2).map(ilan => ({
                            baslik: ilan.Başlık, fiyat: new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(ilan.Fiyat), resim: ilan['Görsel Linki'], link: ilan['Detay Linki']
                        }))
                    },
                    tum_ilanlar: foundListings
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

        // 2. ADIM: KULLANICI İLANLARI GÖRDÜKTEN SONRA "DEVAM ET" DEDİĞİNDE
        if (message === "Devam Et") {
            const responseBody = {
                adim: "telefon_formu_goster",
                eylem: "form_goster", // Sadece formu göster
                cevap: "Tüm listeyi ve detayları size gönderebilmem için lütfen telefon numaranızı girin."
            };
            return { statusCode: 200, body: JSON.stringify(responseBody) };
        }

        // DİĞER TÜM DURUMLARDA OpenAI'ye DANIŞ
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo",
            messages: [{ role: "system", content: systemPrompt }, { role: "user", content: `KONUŞMA GEÇMİŞİ:${history}\n\nKULLANICI MESAJI:${message}` }],
            response_format: { type: "json_object" }
        });

        const aiResponse = JSON.parse(response.choices[0].message.content);
        return { statusCode: 200, body: JSON.stringify(aiResponse) };

    } catch (error) {
        console.error("HATA OLUŞTU:", error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Sunucu tarafında bir hata oluştu.' }) };
    }
};