// Configuração dinâmica do Expo: lê o app.json e, quando EXPO_BASE_URL está
// definido (ex.: "/gestao" no site), exporta a versão web para esse caminho.
const base = require('./app.json');

module.exports = () => {
  const expo = { ...base.expo };
  if (process.env.EXPO_BASE_URL) expo.experiments = { ...(expo.experiments || {}), baseUrl: process.env.EXPO_BASE_URL };
  return expo;
};
