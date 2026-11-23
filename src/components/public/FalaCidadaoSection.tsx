import React, { useState } from 'react';
import { CheckCircle2, Send } from 'lucide-react';
import { NEWS_TERRITORIES } from '../../data/initialData';
import { useFortMidia } from '../../context/FortMidiaContext';
import { CitizenCategory, CimbajuCity } from '../../types/fortmidia';

const CATEGORIES: CitizenCategory[] = [
  'Infraestrutura e Vias',
  'Segurança Pública',
  'Saúde e Educação',
  'Transporte e Mobilidade',
  'Pauta Comunitária',
];

export const FalaCidadaoSection: React.FC = () => {
  const { submitCitizenReport } = useFortMidia();

  const [citizenName, setCitizenName] = useState('');
  const [contact, setContact] = useState('');
  const [city, setCity] = useState<CimbajuCity>('Franco da Rocha');
  const [neighborhood, setNeighborhood] = useState('');
  const [category, setCategory] = useState<CitizenCategory>('Infraestrutura e Vias');
  const [urgency, setUrgency] = useState<'Normal' | 'Alta' | 'Crítica'>('Alta');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [lastProtocol, setLastProtocol] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!citizenName.trim() || !contact.trim() || !title.trim() || !description.trim()) {
      setError('Preencha nome, contato, título e relato para enviar à redação.');
      return;
    }

    const created = submitCitizenReport({
      citizenName: citizenName.trim(),
      contact: contact.trim(),
      city,
      neighborhood: neighborhood.trim() || 'Centro',
      category,
      urgency,
      title: title.trim(),
      description: description.trim(),
    });

    setLastProtocol(created.protocol);
    setError('');
    setCitizenName('');
    setContact('');
    setNeighborhood('');
    setTitle('');
    setDescription('');
  };

  return (
    <section id="fala-cidadao" className="bg-[#0A0A0A] py-16 lg:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          {/* Context & Editorial Commitment */}
          <div className="lg:col-span-5">
            <p className="text-xs font-medium text-[#FF6600]">Jornalismo Participativo · CIMBAJU</p>
            <h2 className="mt-1 font-display text-2xl sm:text-4xl font-bold tracking-tight text-white [text-wrap:balance]">
              Canal Fala Cidadão
            </h2>
            <p className="mt-4 text-sm sm:text-base leading-relaxed text-zinc-300">
              Viu um problema no seu bairro, uma demanda urgente de saúde, transporte ou segurança, ou quer sugerir uma pauta local? Envie diretamente para nossa mesa de apuração 24/7.
            </p>

            <div className="mt-8 space-y-5 border-t border-white/10 pt-6 text-sm text-zinc-300">
              <div>
                <div className="font-display font-semibold text-white">
                  01. Triagem Automatizada na Redação
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Todos os envios recebem protocolo imediato e entram na fila de prioridade do editor-chefe para verificação em campo.
                </p>
              </div>
              <div>
                <div className="font-display font-semibold text-white">
                  02. Conexão Direta com Câmaras e Prefeituras
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Casos confirmados alimentam as reportagens do Portal FortNews e as sabatinas ao vivo do programa De Frente com o Prefeito.
                </p>
              </div>
              <div>
                <div className="font-display font-semibold text-white">
                  03. Sigilo da Fonte Garantido
                </div>
                <p className="mt-1 text-xs text-zinc-400">
                  Seus dados de contato são restritos ao painel editorial interno para checagem jornalística.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Submission Form */}
          <div className="lg:col-span-7 min-w-0">
            <div className="glass-surface rounded-xl border border-white/10 p-4 sm:p-8">
              {lastProtocol ? (
                <div className="py-8 text-center">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                  <p className="mt-4 font-mono text-xs text-[#D4AF37] tabular-nums">
                    Protocolo {lastProtocol}
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-bold text-white">
                    Relato recebido pela Redação FortNews
                  </h3>
                  <p className="mt-2 max-w-md mx-auto text-sm text-zinc-300">
                    Sua sugestão de pauta já está disponível no Painel Administrativo (Módulo de Pautas & Jornalismo) para triagem do editor-chefe.
                  </p>
                  <button
                    type="button"
                    onClick={() => setLastProtocol(null)}
                    className="mt-6 rounded-lg bg-[#FF6600] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#FF5500] cursor-pointer"
                  >
                    Enviar Novo Relato
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="border-b border-white/10 pb-3">
                    <h3 className="font-display text-lg font-bold text-white">
                      Enviar denúncia ou sugestão de pauta
                    </h3>
                    <p className="text-xs text-zinc-400">
                      Atendimento editorial integrado para as 5 cidades da região.
                    </p>
                  </div>

                  {error && (
                    <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-300">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Seu Nome *
                      </label>
                      <input
                        type="text"
                        value={citizenName}
                        onChange={(e) => setCitizenName(e.target.value)}
                        placeholder="Nome completo"
                        className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        WhatsApp ou E-mail *
                      </label>
                      <input
                        type="text"
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        placeholder="(11) 99999-0000"
                        className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Cidade
                      </label>
                      <select
                        value={city}
                        onChange={(e) => setCity(e.target.value as CimbajuCity)}
                        className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white focus:border-[#FF6600] focus:outline-none"
                      >
                        {NEWS_TERRITORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Bairro / Região
                      </label>
                      <input
                        type="text"
                        value={neighborhood}
                        onChange={(e) => setNeighborhood(e.target.value)}
                        placeholder="Ex: Vila Lanfranchi"
                        className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                        Urgência
                      </label>
                      <select
                        value={urgency}
                        onChange={(e) =>
                          setUrgency(e.target.value as 'Normal' | 'Alta' | 'Crítica')
                        }
                        className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white focus:border-[#FF6600] focus:outline-none"
                      >
                        <option value="Normal">Normal</option>
                        <option value="Alta">Alta</option>
                        <option value="Crítica">Crítica</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Área Temática
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as CitizenCategory)}
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white focus:border-[#FF6600] focus:outline-none"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Título da Ocorrência ou Pauta *
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Resumo claro do ocorrido"
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                      Relato Detalhado *
                    </label>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Descreva local exato, horário, impacto na comunidade e se há registro oficial..."
                      className="w-full rounded-lg border border-white/15 bg-[#0A0A0A] px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:border-[#FF6600] focus:outline-none"
                    />
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <span className="text-xs text-zinc-400 break-words">
                      Direto para a mesa de apuração · comercial@fortmidia.com.br
                    </span>
                    <button
                      type="submit"
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg bg-[#fa6607] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#e55a00] cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Send className="h-4 w-4" aria-hidden="true" />
                      Enviar ao Fala Cidadão
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
