# Radar de Oportunidades — protótipo de alta fidelidade

Protótipo navegável do trabalho final de Engenharia de Software (Henrique Dias, Leonardo Gamarra, Matheus Krzesinski e Nicolas Barbarini). Feito em HTML, CSS e JavaScript puros, sem backend: os dados ficam no `localStorage` do navegador.

## Como abrir

**No Windows:** dê dois cliques em `iniciar.bat`. Ele procura o Python 3, escolhe uma porta livre a partir da 8000, sobe um servidor local e abre o navegador sozinho. Para encerrar, feche a janela preta (ou Ctrl+C).

O servidor do `iniciar.bat` desativa o cache, então qualquer mudança nos arquivos aparece ao recarregar a página.

**Sem o .bat (qualquer sistema):** os arquivos precisam ser servidos por HTTP. Na pasta do projeto:

```bash
python -m http.server 8000 --directory prototipo
```

Depois abra <http://localhost:8000/>. Com esse servidor, se uma mudança de estilo não aparecer, use **Ctrl+F5**.

Requisito: Python 3 instalado (<https://www.python.org/downloads/>, marcando "Add python.exe to PATH").

## Telas

| Perfil | Tela | Arquivo | O que demonstra |
|---|---|---|---|
| — | Entrada | `index.html` | Login do estudante (cartão UFRGS) e do ofertante (e-mail), solicitação de cadastro de empresa com validação de CNPJ, recuperação de senha |
| Estudante | Meu perfil | `perfil.html` | Cadastro estudantil (curso, semestre, áreas, disponibilidade, PcD, currículo); vira filtros sugeridos no mural |
| Estudante | Mural | `mural.html` | **Caso de uso 2**: filtros por área, tipo, carga, dias, modalidade, região e remuneração; candidatura |
| Estudante | Minhas candidaturas | `candidaturas.html` | Etapas do processo, envio e reenvio de documentos, termo de compromisso de estágio |
| Estudante | Entrevistas | `agenda.html` | **Caso de uso 1**: escolher horário, conflitos com aulas, conversa, desistência, fluxos alternativos |
| Ambos | Mensagens | `mensagens.html` (`?perfil=ofertante`) | Conversa estudante ↔ ofertante, anexos, mensagem para grupo |
| Ofertante | Minhas vagas | `vagas.html` | Cadastrar e editar vaga em 4 passos com regras da Lei do Estágio; encerrar inscrições com motivo |
| Ofertante | Candidatos | `candidatos.html` | Triagem por etapa, conferência de documentos, pré-seleção, aprovação e retorno |
| Ofertante | Agenda de entrevistas | `agenda-ofertante.html` | Montar e alterar agenda (clique e arraste), cancelar entrevista com explicação |

A chave **Estudante | Ofertante** no cabeçalho troca de visão. O menu do avatar tem **Reiniciar demonstração**, que volta todas as telas ao estado inicial.

## Contas de demonstração

- **Estudante:** João Silva (botão "Entrar com a conta de demonstração", aba Estudante).
- **Ofertante:** Mariana Souza, da TechSul Sistemas (mesmo botão, aba Ofertante).

O login só valida o formato dos campos; nenhuma credencial é conferida ou enviada.

## Testar do zero (suas próprias contas)

Na tela de entrada, use **"Criar conta de teste"** (quadro roxo "Testar do zero") para criar:

- **um estudante** (nome, cartão de 8 dígitos, curso e semestre);
- **um ofertante** (empresa ou unidade da universidade, responsável e e-mail). Unidades da universidade podem publicar bolsas institucionais.

As contas de teste vivem num **ambiente separado da demonstração** (chaves `radar:zero:*` no navegador): começam sem candidaturas, entrevistas, mensagens ou vagas, e o cabeçalho mostra o selo **Teste do zero**. As vagas das empresas fictícias continuam no mural para o estudante ter onde se candidatar.

Caminho completo entre as duas contas:

1. Ofertante cadastra uma vaga (Minhas vagas).
2. Estudante completa o perfil, encontra a vaga no mural e se candidata.
3. Estudante envia os documentos (Minhas candidaturas). Para a empresa conferir, troque para o ofertante logo depois do envio.
4. Ofertante, em Candidatos, aprova os documentos e pré-seleciona. **Simular inscritos** gera concorrentes fictícios.
5. Ofertante publica horários na Agenda de entrevistas; estudante escolhe um horário.
6. Os dois conversam em Mensagens; ofertante aprova; estudante assina o termo de compromisso.

Candidaturas em empresas fictícias avançam pelo botão **Simular eventos** (a "empresa" publica uma agenda de entrevistas e responde mensagens automaticamente).

Para voltar a uma conta de teste, entre com o mesmo cartão (estudante) ou e-mail (ofertante), ou use os atalhos "Suas contas de teste". A chave Estudante | Ofertante troca entre as duas contas. **Recomeçar do zero** (menu do avatar) apaga os dados do teste e mantém as contas. **Sair** e "Entrar com a conta de demonstração" voltam à demonstração, que não é afetada.

## Casos de teste do documento

| Caso de uso | CT | Como reproduzir |
|---|---|---|
| Mural | CT01 | Carga horária até 20h → aparecem vagas de 12h e 20h, não as de 30h |
| Mural | CT02 | Dias Ter + Qui → "Nenhuma oportunidade foi encontrada!" com sugestão de remover filtros |
| Mural | CT03 | Modalidade Presencial sem região → vagas presenciais de todas as regiões |
| Mural | CT04 | Presencial + Centro, depois Remota → filtro de região some, só vagas remotas |
| Mural | CT05 | Remuneração mínima R$ 800 → aparecem R$ 800 e acima, não R$ 700 |
| Entrevista | CT01 | Entrevistas → escolher horário → confirmar (o ofertante é notificado) |
| Entrevista | CT02 | Ofertante → Agenda → vaga "Estágio em DevOps" → marcar horários → Publicar agenda |
| Entrevista | CT03 | Ofertante → Agenda → alterar horários → Publicar alterações (estudante recebe aviso) |
| Entrevista | CT04 | Entrevistas → "Falar com o ofertante" → enviar mensagem |
| Entrevista | CT05 | Entrevistas → Finvest (sem horários) → "Solicitar horários ao ofertante" |
| Entrevista | CT06 | Entrevistas → "Desistir da vaga" (mensagem obrigatória) |
| Entrevista | CT07 | Entrevistas → Simular eventos → "Prazo de escolha expira" |

## Dica para a apresentação

Abra a visão do estudante e a do ofertante **em duas abas lado a lado**: as telas se atualizam sozinhas quando a outra muda (agenda, mensagens, candidaturas e notificações).

Um roteiro que passa por quase tudo:

1. Estudante entra, completa o perfil e vê o mural já filtrado.
2. Candidata-se ao "Estágio em DevOps" e envia os documentos em Minhas candidaturas.
3. Ofertante, em Candidatos, recusa um documento com motivo; o estudante reenvia.
4. Ofertante aprova os documentos, pré-seleciona e aprova.
5. Estudante assina o termo de compromisso; a universidade valida.

## Organização do código

- `js/comum.js` — cabeçalho, perfis, notificações, toast e datas (usado por todas as telas)
- `js/dados.js` — vagas e ofertantes (classes `Oportunidade`, `Ofertante`); também carrega vagas criadas pelo ofertante
- `js/*-dados.js` — dados fictícios de cada tela (agenda, candidaturas, ofertante, triagem)
- `js/<tela>.js` e `css/<tela>.css` — lógica e estilo de cada tela; `css/style.css` tem os estilos compartilhados

Os comentários no topo de cada arquivo indicam o caso de uso e os critérios de aceitação que ele implementa.

## Limitações conhecidas

- A conta de ofertante é sempre a TechSul; mensagens e solicitações para outros ofertantes recebem respostas simuladas.
- Na vaga "Estágio em desenvolvimento web", o resultado final do João fica fora do protótipo; o ciclo completo de aprovação é demonstrado pela vaga "Estágio em DevOps".
- Em Minhas candidaturas, os documentos enviados são aprovados automaticamente em ~2,5 s se o estudante continuar na página (simulando o ofertante). Para mostrar a conferência pela empresa, troque de tela logo após o envio.
- Downloads (termo em PDF) e "Adicionar ao calendário" são simulados.
