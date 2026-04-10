# 🌟 RotinaFeliz — SaaS Web (HTML + Firebase)

Aplicação web SaaS para rotinas visuais de crianças com TEA. HTML puro + CSS + JavaScript + Firebase.

---

## 📁 Estrutura do projeto

```
rotina-feliz/
├── index.html          ← Landing page (hero, features, FAQ, footer completo)
├── register.html       ← Redireciona para pages/login.html?tab=register
├── 404.html            ← Página de erro amigável
│
├── pages/
│   ├── login.html      ← Login + Cadastro (abas)
│   ├── app.html        ← Painel dos pais (rotinas + tarefas + dashboard)
│   ├── child.html      ← 🧒 Modo Criança (rotina visual + gamificação)
│   └── profile.html    ← 👤 Perfil do usuário (editar nome, senha, excluir conta)
│
├── js/
│   └── firebase.js     ← ⚡ Configuração centralizada do Firebase (substitua aqui!)
│
└── css/
    └── style.css       ← CSS global compartilhado
```

---

## 🚀 Setup em 5 passos

### 1. Criar projeto Firebase

1. Acesse [console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **"Adicionar projeto"** → nome: `rotina-feliz`
3. Ative os serviços:
   - **Authentication** → Email/Senha → Ativar
   - **Firestore Database** → Criar banco → Modo produção → Região: `southamerica-east1`
   - **Storage** → Começar → Modo produção

### 2. Obter as credenciais

1. No console Firebase → Configurações do projeto (⚙️)
2. Role até **"Seus aplicativos"** → Clique em **"</>"** (Web)
3. Registre o app → copie o objeto `firebaseConfig`

### 3. Substituir credenciais

Abra **`js/firebase.js`** e substitua o bloco `firebaseConfig`:

```js
const firebaseConfig = {
  apiKey:            "SUA_API_KEY",
  authDomain:        "SEU_PROJECT.firebaseapp.com",
  projectId:         "SEU_PROJECT_ID",
  storageBucket:     "SEU_PROJECT.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId:             "SEU_APP_ID"
};
```

> ⚠️ **Atenção:** `pages/login.html`, `pages/app.html`, `pages/child.html` e `pages/profile.html`
> ainda têm cada um seu próprio bloco `firebaseConfig` inline (por compatibilidade com módulos ES).
> Substitua em cada arquivo também, ou refatore para importar de `../js/firebase.js`.

### 4. Configurar regras Firestore

No console Firebase → Firestore → Aba **Regras** → cole:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /routines/{routineId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }
    match /tasks/{taskId} {
      allow read, write: if request.auth != null;
    }
    match /progress/{progressId} {
      allow read, write: if request.auth != null
        && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.userId == request.auth.uid;
    }
  }
}
```

### 5. Configurar regras Storage

No console Firebase → Storage → Aba **Regras** → cole:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tasks/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

---

## 🌐 Como hospedar (grátis)

### Opção A — Firebase Hosting (recomendado)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # selecione o projeto criado
firebase deploy
```

### Opção B — Vercel / Netlify

Arraste a pasta `rotina-feliz/` para o painel de deploy. Pronto!

---

## 🗺️ Fluxo de navegação

```
index.html (Landing)
    ↓ "Criar conta grátis"
pages/login.html (Login / Cadastro)
    ↓ autenticado
pages/app.html (Painel dos Pais)
    ├── 📋 Rotinas → criar, editar, excluir
    ├── ✅ Tarefas → adicionar com imagem, reordenar
    ├── 📊 Dashboard → pontos, histórico 7 dias
    ├── 👤 Perfil → pages/profile.html
    └── 🧒 Modo Criança → pages/child.html
```

---

## 🗄️ Estrutura Firestore

```
users/{uid}
  uid, email, name, role, createdAt

routines/{id}
  userId, name, createdAt

tasks/{id}
  routineId, title, imageUrl, order, createdAt

progress/{id}
  taskId, userId, date (yyyy-MM-dd), completed, points, createdAt
```

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

## 🔧 Índices necessários no Firestore

1. Coleção `tasks` → campos: `routineId (ASC)`, `order (ASC)`
2. Coleção `progress` → campos: `userId (ASC)`, `date (ASC)`, `completed (ASC)`
3. Coleção `routines` → campos: `userId (ASC)`, `createdAt (DESC)`

---

## 🚀 Próximos passos pós-MVP

- [ ] Sistema de planos (Stripe ou PagSeguro)
- [ ] Múltiplos perfis de crianças por conta
- [ ] Notificações push via Firebase Cloud Messaging
- [ ] Exportar PDF de progresso
- [ ] Modo offline com Service Worker (PWA)
- [ ] App mobile via PWA (manifest + service worker)
