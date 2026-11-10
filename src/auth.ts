// Acesso único do dono da fazenda. É uma trava local do aparelho, não uma conta online.
const USER = 'fazenda boaz';
const PASSWORD = 'daviboaz123';

export const checkLogin = (user: string, password: string) => user.trim().toLowerCase() === USER && password === PASSWORD;
