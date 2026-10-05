# NOTES

## Resumo

- Corrigi **8 problemas**. A maioria afetava a cobrança de tokens ou a fila; os mais graves são o consumo que perdia somas (5), a mensagem repetida que cobrava de novo (6) e a mensagem inválida em loop infinito (8).
- Deixei **13 riscos documentados**, cada um com a solução que eu daria.
- Implementei o que o README pediu: PATCH e DELETE de agentes, histórico paginado, métricas, limite mensal funcionando, testes e Swagger completo.

Cada correção está num commit separado, com um teste que falhava antes dela. Os testes passaram de 12 para 89.

## Decisões técnicas

| Decisão | Alternativa que considerei | Por que escolhi |
|---|---|---|
| DELETE como soft delete (`active = false`), respondendo 204, também quando repetido | Apagar a linha | As FKs de execuções e consumo não têm `ON DELETE`, então o DELETE falharia. Além disso, histórico de execução e consumo é dado de cobrança. Dá para desfazer com o PATCH |
| PATCH com `PartialType(CreateAgentDto, { skipNullProperties: false })` | Escrever outro DTO à mão | Reaproveita as validações e o Swagger da criação. Sem o `skipNullProperties: false`, `{"name": null}` passava pela validação e virava 500 no banco (coluna NOT NULL); agora é 400 |
| Histórico com `page` e `limit` (até 100), filtro por status e ordem por `created_at` e `id` | Paginação por cursor | É mais simples para quem consome e permite pular de página. O `id` desempata execuções criadas no mesmo instante. Criei o índice `(agent_id, created_at, id)`: com 50 mil execuções, a consulta lê 20 linhas em vez de ler 1.000 e ordenar |
| Métricas numa única query (`COUNT(*) FILTER` e `SUM`) | Uma consulta para cada número | Os quatro números saem da mesma consulta, então refletem o mesmo instante do banco. Com consultas separadas, uma execução que terminasse no meio entraria na soma e não na contagem |
| Média de tokens = tokens ÷ execuções concluídas | Dividir por todas as execuções | Só a execução concluída consome tokens. Dividir pelo total misturaria custo com taxa de falha (ver Dúvidas) |
| Soma do consumo com um UPSERT atômico em SQL | `SELECT ... FOR UPDATE` numa transação | Uma instrução só, sem ler o total na aplicação. O `upsert()` do TypeORM sobrescreve o valor em vez de somar, então escrevi o SQL, com parâmetros |
| Limite mensal checado na API (429) e de novo no worker (FAILED) | Reservar os tokens na entrada | Cobre o caso comum que o README pede. A reserva resolveria também as execuções simultâneas, que o README deixou fora do escopo |
| Manter 201 no POST de execução | 202 Accepted | Como o processamento é assíncrono, 202 seria o mais correto, mas trocar o código quebraria quem já consome a API |
| Testes unitários e HTTP no padrão dos specs que já existiam; onde não havia padrão (testes de DTO e HTTP), criei um e usei em todos | Testes de integração com banco real | O README pede testes do que criei e de cenários de erro. O que só o banco real prova (SQL e concorrência), validei no Docker, com os números abaixo; o teste de integração fica como próximo passo |

## Problemas que corrigi

Estão na ordem dos commits: comecei pelo mais simples e seguro (configuração e validações), que também serviu para firmar o padrão dos testes, e deixei a mudança mais arriscada no worker por último.

| # | Problema | Gravidade |
|---|---|---|
| 1 | Configuração vazia virava prefetch ilimitado | Média |
| 2 | Validações faltando nos DTOs | Média |
| 3 | `?month=` aceitava qualquer texto | Baixa |
| 4 | Agente inativo recebia e executava tarefas | Alta |
| 5 | Consumo mensal perdia somas com execuções simultâneas | Alta |
| 6 | Mensagem repetida cobrava de novo | Alta |
| 7 | Fila acumulada estourava o limite mensal | Alta |
| 8 | Mensagem inválida entrava em loop infinito | Alta |

### 1. Configuração vazia virava prefetch ilimitado
- **O que acontecia:** o worker lia `Number(process.env.RABBITMQ_PREFETCH ?? 5)`. Com a variável vazia, `'' ?? 5` continua `''`, e `Number('')` é 0. No RabbitMQ, prefetch 0 quer dizer sem limite: o worker puxa a fila inteira para a memória.
- **O que fiz:** o worker e a API passaram a ler a configuração pelo `env.ts`, que já tratava valor vazio ou inválido. Acrescentei o mesmo tratamento para os textos (nome da fila e URLs).
- **Commit:** `fix: read worker and queue settings through env config`.

### 2. Validações faltando nos DTOs
- **O que acontecia:**
  - o `monthlyTokenLimit` aceitava 0 e negativo;
  - `3000000000` passava na validação, mas não cabe na coluna `integer`, então o banco recusava e a API respondia 500;
  - nome, prompt e input só com espaços eram aceitos. Um input em branco contava 0 tokens e passava na checagem do limite mesmo com o consumo já igual ao limite.
- **O que fiz:**
  - `@Min(1)` e `@Max(2147483647)` no limite;
  - `trim` e tamanho mínimo no nome e no prompt;
  - no input, exijo pelo menos um caractere visível, sem alterar o texto.

  Erro do cliente agora é sempre 400, nunca 500.
- **Commits:** `fix: validate token limit range and blank strings in agent DTO` e `fix: reject blank execution input`.

### 3. Mês inválido no consumo
- **O que acontecia:** `GET /agents/:id/usage?month=banana` respondia 200 com 0 tokens.
- **O que fiz:** um DTO para a query, com o formato `YYYY-MM` (mês de 01 a 12). Agora responde 400.
- **Commit:** `fix: validate month query param on usage endpoint`.

### 4. Agente inativo recebia execuções
- **O que acontecia:** nem a API nem o worker olhavam o campo `active`. O Summarizer, que já vem inativo no seed, executava normalmente.
- **Como vi:** o POST de execução no Summarizer respondeu 201, e a execução foi concluída, cobrando 13 tokens.
- **O que fiz:**
  - a API responde 409 antes de gravar e de publicar;
  - o worker confere de novo antes de processar, porque o agente pode ser desativado enquanto a mensagem espera na fila. Nesse caso, a execução vira FAILED com o motivo, sem cobrar.
- **Commits:** `fix: refuse executions for inactive agents` (a API) e, para o worker, `fix: fail queued executions of inactive or over-limit agents`, junto com o problema 7.

### 5. Consumo mensal perdia somas (lost update)
- **O que acontecia:** para somar os tokens, o código lia o total, somava na memória e salvava. O worker processa até 5 mensagens ao mesmo tempo (prefetch 5). Duas execuções liam o mesmo total, e uma soma apagava a outra.
- **Como vi:** disparei 10 execuções em paralelo e comparei a soma real (`SUM(total_tokens)` das concluídas) com o `tokens_used`. A soma real era 150; o registrado foi 105 e, numa segunda rodada, 60.
- **O que fiz:** troquei por um UPSERT atômico, que soma dentro do próprio banco:
  ```sql
  INSERT INTO agent_monthly_usage (agent_id, month, tokens_used) VALUES ($1, $2, $3)
  ON CONFLICT (agent_id, month)
  DO UPDATE SET tokens_used = agent_monthly_usage.tokens_used + EXCLUDED.tokens_used, updated_at = now()
  ```
  O Postgres trava a linha durante o UPDATE, então ninguém lê um valor desatualizado. O primeiro registro do mês também fica resolvido: se dois INSERTs chegam juntos, um insere e o outro soma.
- **Depois:** com 10, 20 e 30 execuções em paralelo, o registrado bateu com a soma real (160, 320 e 480).
- **Commit:** `fix: make monthly token usage increment atomic`.

### 6. Mensagem repetida cobrava de novo
- **O que acontecia:**
  - o RabbitMQ entrega cada mensagem pelo menos uma vez. Se o worker cair depois de somar os tokens e antes de confirmar a mensagem, ela volta. O worker não olhava o status e processava de novo uma execução já concluída, cobrando duas vezes;
  - "marcar COMPLETED" e "somar tokens" eram duas escritas separadas, sem transação.
- **O que fiz:** o worker ignora execuções que já estão COMPLETED ou FAILED, e conclui e cobra na mesma transação. Uma coisa depende da outra: só é seguro pular uma execução COMPLETED se COMPLETED garantir que os tokens foram somados.
- **Depois:** publiquei a mesma mensagem mais 3 vezes. O consumo continuou em 22, e o worker registrou `already COMPLETED, skipping`.
- **Limite:** parte da premissa de uma mensagem por execução, que é o que a API publica hoje. Se um dia houver republicação, a checagem vira um UPDATE condicional.
- **Commit:** `fix: make worker idempotent and complete executions in a transaction`.

### 7. Fila acumulada estourava o limite
- **O que acontecia:** o limite só era checado na criação, e o consumo só sobe quando a execução termina. Com o worker parado (deploy, queda, LLM lento), várias execuções passavam na checagem e, quando processadas, estouravam o limite.
- **Como vi:** agente com limite 20 e worker parado. Mandei 3 execuções com input de 10 palavras, e a API aceitou as três, porque na criação só dá para contar os tokens do input. No fim, cada uma custou 25 tokens (10 do input e 15 da resposta simulada), e o consumo final foi 75.
- **O que fiz:** o worker confere o limite de novo antes de processar e marca FAILED com o motivo (`Monthly token limit exceeded: used X of Y tokens`), sem cobrar. A regra virou uma função só, usada pela API e pelo worker.
- **Depois:** com 8 execuções iguais na fila e limite 20, foram 5 COMPLETED e 3 FAILED, com consumo de 125, ou seja, 5 × 25 (sem a correção, seriam 8 × 25 = 200). As 5 primeiras passaram juntas porque rodaram ao mesmo tempo; é o limite abaixo.
- **Limite:** as execuções que rodam ao mesmo tempo (até 5, pelo prefetch) passam juntas pela checagem. A solução completa é reservar os tokens na entrada (risco D2).
- **Commit:** `fix: fail queued executions of inactive or over-limit agents`.

### 8. Mensagem inválida em loop infinito
- **O que acontecia:**
  - qualquer erro no worker devolvia a mensagem para a fila na hora, sem limite de tentativas. Uma mensagem com `executionId` inválido falhava para sempre;
  - com `{}` era pior: o TypeORM ignora condição `undefined`, então a busca trazia a primeira execução da tabela e reprocessava uma execução antiga.
- **Como vi:**
  - publiquei `{"executionId":"abc"}` direto na fila e houve 4.544 tentativas em 3 segundos;
  - com `{}`, uma execução já concluída foi reprocessada e cobrou mais 24 tokens.
- **O que fiz:**
  - o worker valida a mensagem (JSON com `executionId` em formato UUID) e descarta a inválida, registrando no log;
  - para erros que podem ser passageiros, dou uma nova tentativa. Se a mensagem reentregue falhar de novo, a execução vira FAILED;
  - se nem o FAILED puder ser gravado (banco fora), a mensagem volta para a fila, para não perder a execução.
- **Depois:** as mensagens ruins foram descartadas uma vez cada, sem nenhuma nova tentativa.
- **Limite:**
  - o `redelivered` do RabbitMQ só diz "sim" ou "não", então a regra é uma nova tentativa, não N;
  - não há espera entre as tentativas: com o banco fora, a mensagem vai e volta até ele voltar;
  - não criei uma DLQ porque declarar a fila que já existe com `x-dead-letter-exchange` faz o RabbitMQ recusar a declaração (`PRECONDITION_FAILED`). Seria preciso migrar a fila.
- **Commit:** `fix: stop infinite requeue of failing messages`.

## Riscos que identifiquei e não corrigi

| # | Risco | Impacto | Como eu resolveria |
|---|---|---|---|
| D1 | A API grava a execução e depois publica na fila, sem garantia entre as duas coisas. O `publish()` não espera confirmação do RabbitMQ, e o retorno `false` do `sendToQueue` (buffer cheio) é ignorado | A execução fica PENDING para sempre. O seed já tem uma assim | Outbox (gravar a mensagem numa tabela na mesma transação e publicar depois), confirmação de publicação e um job que reenvia as PENDING antigas |
| D2 | Corrida na checagem do limite: duas requisições leem o mesmo consumo | Requisições simultâneas passam juntas | Reserva atômica: `UPDATE ... SET reservado = reservado + n WHERE usado + reservado + n <= limite` |
| D3 | O mês da cobrança é calculado em UTC e na conclusão da execução | Às 21h do dia 30 no Brasil, em UTC já é o mês seguinte | Decisão de negócio: definir o fuso e se vale a criação ou a conclusão |
| D4 | O health check considera o RabbitMQ "up" só porque o canal foi criado | Mostra "up" mesmo com o canal quebrado | Conferir o estado real da conexão e do canal |
| D5 | Se a conexão com o RabbitMQ cai, o processo faz `process.exit(1)` | A API inteira cai, até as rotas que só leem do banco. Vi a API parar de responder com o RabbitMQ parado | Reconexão com backoff, mantendo a API de leitura no ar |
| D6 | As entidades não declaram as FKs nem os nomes de índices que as migrations criam | Um `migration:generate` geraria uma migration que apaga as 2 FKs (testei) | Declarar as relações e os nomes nas entidades, e revisar toda migration gerada |
| D7 | `npm run lint` existe, mas o ESLint não está instalado | O script quebra | Instalar e configurar o ESLint, ou remover o script |
| D8 | Dockerfile com Node 22 (o README diz 20), devDependencies na imagem final, rodando como root e com as migrations no start da API. No compose, `postgres` e `rabbitmq` não têm `restart:` | Imagem maior e menos segura; com 2 réplicas, as migrations rodariam juntas. Depois de reiniciar o Docker, só a API e o worker voltam, e a API fica em loop sem o banco (aconteceu comigo) | Build em etapas, `USER node`, migrations como um passo separado e `restart: unless-stopped` no banco e na fila |
| D9 | O POST de execução responde 201 | O processamento é assíncrono; 202 seria o mais correto | Combinar com quem consome a API antes de trocar |
| D10 | O POST de execução não é idempotente | Um retry do cliente duplica a execução | Header `Idempotency-Key` |
| D11 | O RabbitMQ não tem volume no compose | Recriar o container perde as mensagens da fila | Volume e `hostname` fixo |
| D12 | `GET /agents` sem paginação e nenhuma `CHECK` no banco | A escala e a integridade dependem só da aplicação | Paginação e `CHECK (monthly_token_limit > 0)`, entre outras |
| D13 | `agent_monthly_usage` guarda o consumo como um contador pronto, sem reconciliação | Se ele divergir da soma das execuções, como aconteceu no problema 5, nada percebe nem corrige | Um job que compara o contador com as execuções, ou calcular o consumo direto delas |

## Dúvidas para a entrevista

- Qual fuso define o mês da cobrança? O consumo conta no mês da criação ou da conclusão?
- A média de tokens deveria ser por execução concluída, como fiz, ou por todas?
- O DELETE deve ser reversível, ou vale separar "pausado" de "excluído" com um `deleted_at`?
- Se o limite aumentar, as execuções que falharam por limite devem ser reprocessadas?
- Posso mudar o POST de execução para 202? Quem consome a API hoje?
- Qual é o padrão de idioma do time? O projeto mistura português e inglês nos comentários, e eu segui a divisão que já existia.
