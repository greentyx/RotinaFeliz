# 🌟 RotinaFeliz — SaaS Web (HTML + Firebase)

Aplicação web SaaS para rotinas visuais de crianças com TEA. HTML puro + CSS + JavaScript + Firebase.

---

## 🎨 Design para TEA

| Princípio | Implementação |
|-----------|--------------|
| Interface simples | Máx. 2-3 elementos de ação por tela |
| Botões grandes | Mínimo 60×60px no Modo Criança |
| Cores suaves | Azul #4A90D9, Verde #5BB974, fundo #F7F5FF |
| Feedback imediato | Animação bounce + confetti + pontos |
| Poucos textos | Emojis automáticos por tipo de tarefa |
| Sem distrações | Modo Criança sem sidebar/navegação |

---

## Tecnologias utilizadas

- **HTML, CSS e JavaScript** — interface do usuário
- **Firebase** — autenticação e banco de dados em tempo real (Firestore)
- **Cloudinary** — armazenamento e upload de imagens
- **Stripe** — processamento de pagamentos e assinaturas
- **Vercel** — hospedagem e deploy

---

## Estrutura do projeto

```
RotinaFeliz-v2/
├── assets/          # Ícones e imagens do app
├── css/             # Estilos globais
├── js/              # Scripts (Firebase, PWA, pagamento, etc.)
├── pages/           # Páginas internas (perfil, login, app, etc.)
├── api/             # Funções serverless (webhook do Stripe)
├── manifest.json    # Configuração do PWA
├── sw.js            # Service Worker
└── index.html       # Página inicial
```

---

## Funcionalidades

- Cadastro e login com Google (Firebase Auth)
- Criação de rotinas e tarefas para crianças
- Upload de foto de perfil via Cloudinary
- Plano gratuito e Plano Família (via assinatura no Stripe)
- Funciona como PWA — pode ser instalado no celular
- Webhook integrado para atualização automática do plano após pagamento

---

## Deploy

O projeto é hospedado na **Vercel**. Para colocar no ar, é necessário configurar as variáveis de ambiente referentes ao Firebase e ao Stripe no painel da Vercel antes de fazer o deploy.
