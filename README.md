# Super Senha – DDS

Jogo de dedução inspirado no Super Senha, criado para um **DDS (Diálogo Diário de Segurança) dinâmico**.
Trabalha **percepção de risco** e **trabalho em equipe**: a senha aparece por poucos segundos e os
colaboradores precisam juntar o que cada um percebeu para descobri-la.

## Como jogar

1. O facilitador define o **tempo de exibição** (padrão: 15 s) e o **número de tentativas** (padrão: 10).
2. Ao iniciar, 5 cores diferentes são sorteadas entre as 7 disponíveis:
   Vermelho, Azul, Amarelo, Verde, Rosa, Preto e Marrom.
3. A senha fica na tela pelo tempo definido e depois some.
4. A equipe diz as cores em sequência e o facilitador digita (clique ou teclas **1 a 7**).
5. Ao conferir, aparecem os pinos de resposta:
   - **Preto**: acertou a cor e a posição
   - **Branco**: acertou a cor, mas está em outra posição
6. A rodada termina quando a equipe acerta ou as tentativas acabam. Há perguntas de reflexão para o DDS no final.

**Atalhos:** `1`–`7` escolhem a cor · `Backspace` apaga · `Enter` confere.
O botão no topo alterna entre **tema claro e escuro**.

## Estrutura

```
index.html   → estrutura das telas
style.css    → visual, temas claro/escuro e responsividade
script.js    → sorteio, contagem regressiva, conferência e histórico
```

## Publicar no GitHub Pages

1. Envie os arquivos para um repositório.
2. Em **Settings → Pages**, escolha a branch `main` e a pasta `/ (root)`.
3. O jogo fica disponível no endereço exibido pelo GitHub.

## Tecnologias

HTML5, CSS3 e JavaScript puro, sem dependências.

---

Desenvolvido por **CodeDog**.
