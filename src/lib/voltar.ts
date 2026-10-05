// Para onde mandar o cliente depois do login (?voltar=...).
// Só aceita caminhos internos da Área do Cliente — nunca outro domínio
// (evita open redirect como "//site-malicioso.com" ou "https://...").
const PADRAO = '/area-cliente';
const PERMITIDO = /^\/area-cliente(\/[A-Za-z0-9_-]+)*\/?(\?[A-Za-z0-9_=&%.-]*)?$/;

export function destinoAposLogin(valor: string | null | undefined): string {
  return valor && valor.length <= 300 && PERMITIDO.test(valor) ? valor : PADRAO;
}
