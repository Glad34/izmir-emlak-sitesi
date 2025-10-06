const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

exports.handler = async function (event, context) {
  try {
    const data = JSON.parse(event.body);

    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    // YENİ "Mahalle" alanı eklendi
    await sheet.addRow({
      'Tarih': new Date().toLocaleString('tr-TR'),
      'İsim': data.isim,
      'Konum': data.konum,
      'Mahalle': data.mahalle, // YENİ EKLENDİ
      'Telefon': data.telefon,
      'Amaç': data.amac,
      'Mülk Tipi': data.mulkTipi,
      'Bütçe': data.butce,
      'Oda Sayısı': data.odaSayisi,
    });

    return { statusCode: 200, body: JSON.stringify({ message: "Veri başarıyla eklendi." }) };

  } catch (error) {
    console.error("E-tabloya yazma hatası:", error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Veri kaydedilemedi.' }) };
  }
};