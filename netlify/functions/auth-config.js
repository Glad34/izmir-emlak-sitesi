// netlify/functions/auth-config.js
exports.handler = async () => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      domain: process.env.AUTH0_DOMAIN,
      clientId: process.env.AUTH0_CLIENT_ID,
      audience: process.env.AUTH0_AUDIENCE
    })
  };
};