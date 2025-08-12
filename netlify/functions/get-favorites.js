// /.netlify/functions/get-favorites.js (DÜZELTİLMİŞ SÜRÜM)

const { createClient } = require('@supabase/supabase-js');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Netlify ortam değişkenlerini al
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Auth0'nun genel anahtarını almak için bir istemci oluştur
const jwks = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
});

// Anahtarı getiren yardımcı fonksiyon
function getKey(header, callback) {
  jwks.getSigningKey(header.kid, function(err, key) {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

exports.handler = async function(event) {
  try {
    // 1. Auth0 Token'ını al ve doğrula
    const authHeader = event.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Yetkilendirme başlığı eksik veya hatalı.' }) };
    }
    const token = authHeader.substring(7);

    const decodedToken = await new Promise((resolve, reject) => {
      jwt.verify(token, getKey, {
        audience: AUTH0_AUDIENCE,
        issuer: `https://${AUTH0_DOMAIN}/`,
        algorithms: ['RS256']
      }, (err, decoded) => {
        if (err) return reject(err);
        resolve(decoded);
      });
    });

    const userId = decodedToken.sub;

    // 2. Supabase İstemcisini Başlat
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 3. Veritabanından Favorileri Çek
    const { data, error } = await supabase
      .from('favorites')
      .select('ilan_id')
      .eq('user_id', userId);

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify(data)
    };

  } catch (error) {
    console.error('Fonksiyon hatası:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({ error: `Favoriler alınamadı: ${error.message}` })
    };
  }
};