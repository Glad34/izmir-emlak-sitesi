// netlify/functions/get-favorites.js
import { createClient } from '@supabase/supabase-js';

export const handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Giriş yapmalısınız.' }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data, error } = await supabase
      .from('favorites')
      .select('ilan_id') // Sadece ilan_id sütununu seç
      .eq('user_id', user.sub); // Giriş yapmış kullanıcının ID'si ile eşleşenleri bul

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify(data), // Bulunan favorileri dizi olarak gönder
    };
  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};