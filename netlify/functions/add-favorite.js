// netlify/functions/add-favorite.js
import { createClient } from '@supabase/supabase-js';

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { user } = context.clientContext;
    if (!user) {
      return { statusCode: 401, body: JSON.stringify({ error: 'Lütfen giriş yapınız.' }) };
    }

    const { ilanId } = JSON.parse(event.body);
    if (!ilanId) {
      return { statusCode: 400, body: JSON.stringify({ error: 'İlan ID gerekli.' }) };
    }

    // Supabase client'ını GÜVENLİ service_role anahtarı ile oluştur
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY // anon key yerine service_role key kullanıyoruz
    );

    const { data, error } = await supabase
      .from('favorites')
      .insert({ 
        user_id: user.sub,
        ilan_id: ilanId 
      });

    if (error) {
      // Olası bir RLS (Row Level Security) hatasını daha anlaşılır kıl
      if (error.message.includes('violates row-level security policy')) {
          return { statusCode: 403, body: JSON.stringify({ error: 'Bu işlem için yetkiniz yok. RLS politikalarınızı kontrol edin.' }) };
      }
      throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Favorilere eklendi!' }),
    };

  } catch (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};