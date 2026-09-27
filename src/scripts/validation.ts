import { z } from 'zod';

export const ContatoSchema = z.object({
  nome: z.string().min(2, 'O nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('Insira um e-mail válido'),
  telefone: z.string().regex(/^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/, 'Informe um telefone válido com DDD (Ex: 11 99999-9999)'),
  aparelho: z.enum(['celular', 'notebook', 'pc', 'outro'], {
    errorMap: () => ({ message: 'Selecione o tipo de aparelho' })
  }),
  servico: z.string().min(1, 'Selecione um serviço desejado'),
  descricao: z.string().min(10, 'Descreva o problema com pelo menos 10 caracteres').max(2000, 'Descrição muito longa'),
  lgpd: z.boolean().refine(val => val === true, {
    message: 'Você deve concordar com a Política de Privacidade (LGPD)'
  })
});

export type ContatoData = z.infer<typeof ContatoSchema>;

export const LoginSchema = z.object({
  cpfOuOs: z.string().min(4, 'Informe o número da OS ou seu CPF'),
  senha: z.string().min(4, 'A senha deve ter no mínimo 4 caracteres')
});

export type LoginData = z.infer<typeof LoginSchema>;
