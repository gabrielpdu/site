// ViaCEP integration with cache for address auto-fill
const cepCache = new Map<string, any>();

export async function consultarCep(cep: string) {
  const cleanCep = cep.replace(/\D/g, '');
  if (cleanCep.length !== 8) return null;

  if (cepCache.has(cleanCep)) {
    return cepCache.get(cleanCep);
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
    if (!res.ok) throw new Error('Falha ao consultar CEP');
    const data = await res.json();
    if (data.erro) return null;
    cepCache.set(cleanCep, data);
    return data;
  } catch (err) {
    console.error('Erro ao consultar ViaCEP:', err);
    return null;
  }
}
