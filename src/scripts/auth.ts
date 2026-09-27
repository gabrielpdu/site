// Mock repair status data for CamargoTech Customer Portal
export interface Reparo {
  id: string;
  cliente: string;
  aparelho: string;
  modelo: string;
  status: 'Diagnóstico' | 'Aguardando Aprovação' | 'Em Reparo' | 'Testes Finais' | 'Pronto para Retirada';
  percentual: number;
  dataEntrada: string;
  previsaoEntrega: string;
  valor: string;
  laudoTecnico: string;
}

export const MOCK_REPAROS: Record<string, Reparo> = {
  'CT-2024-001': {
    id: 'CT-2024-001',
    cliente: 'Carlos Eduardo Silva',
    aparelho: 'Notebook',
    modelo: 'Dell Inspiron 15 3000',
    status: 'Em Reparo',
    percentual: 60,
    dataEntrada: '25/09/2026',
    previsaoEntrega: '28/09/2026',
    valor: 'R$ 280,00',
    laudoTecnico: 'Troca de pasta térmica prata e instalação de SSD NVMe 512GB com migração de sistema.'
  },
  'CT-2024-002': {
    id: 'CT-2024-002',
    cliente: 'Mariana Costa',
    aparelho: 'Smartphone',
    modelo: 'Samsung Galaxy S22',
    status: 'Pronto para Retirada',
    percentual: 100,
    dataEntrada: '24/09/2026',
    previsaoEntrega: '26/09/2026',
    valor: 'R$ 490,00',
    laudoTecnico: 'Substituição do display AMOLED original com vedação de proteção contra poeira e água.'
  },
  'CT-2024-003': {
    id: 'CT-2024-003',
    cliente: 'Lucas Mendes',
    aparelho: 'PC Gamer',
    modelo: 'Ryzen 7 5700X + RTX 3070',
    status: 'Testes Finais',
    percentual: 85,
    dataEntrada: '23/09/2026',
    previsaoEntrega: '27/09/2026',
    valor: 'R$ 350,00',
    laudoTecnico: 'Recuperação de trilha da placa-mãe B550 e substituição de capacitores na linha de alimentação.'
  }
};
