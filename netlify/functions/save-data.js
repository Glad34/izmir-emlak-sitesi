// Bu fonksiyon Google Sheets API'si ile etkileşim kuracak.
// Önce `google-spreadsheet` paketini kurmanız gerekecek: npm install google-spreadsheet
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

// Google Cloud'dan aldığınız Service Account bilgilerini buraya gireceksiniz.
// Bu bilgileri Netlify Environment Variables'a eklemek en güvenlisidir.
const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // .env'den alırken \n karakterlerini düzelt
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

// Google Sheet'inizin ID'si (URL'den alabilirsiniz)
const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

exports.handler = async function (event, context) {
  try {
    const data = JSON.parse(event.body);

    await doc.loadInfo(); // Sayfa bilgilerini yükle
    const sheet = doc.sheetsByIndex[0]; // İlk sayfayı seç

    // Gelen veriye göre yeni satır ekle veya mevcut satırı güncelle
    if (data.type === 'INITIAL_SUBMIT') {
      const newRow = await sheet.addRow({
        'Tarih': new Date().toLocaleString('tr-TR'),
        'Müşteri ID': data.musteriId, // Benzersiz bir ID oluşturup gönderdik
        'İsim': data.isim,
        'Amaç': data.amac,
        'Mülk Tipi': data.mulkTipi,
        'Bütçe': data.butce,
        'Oda Sayısı': data.odaSayisi,
      });
      return { statusCode: 200, body: JSON.stringify({ message: "Veri başarıyla eklendi." }) };
    } 
    else if (data.type === 'PHONE_SUBMIT') {
      await sheet.loadCells(); // Hücreleri yükle
      const rows = await sheet.getRows();
      // Müşteri ID'sine göre doğru satırı bul
      for (const row of rows) {
        if (row.get('Müşteri ID') === data.musteriId) {
          row.set('Telefon', data.telefon); // Telefon hücresini güncelle
          await row.save(); // Satırı kaydet
          break;
        }
      }
      return { statusCode: 200, body: JSON.stringify({ message: "Telefon numarası güncellendi." }) };
    }

    return { statusCode: 400, body: "Geçersiz istek tipi." };

  } catch (error) {
    console.error("E-tabloya yazma hatası:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Veri kaydedilemedi.' }) };
  }
};