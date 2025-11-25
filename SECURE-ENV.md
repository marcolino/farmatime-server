# Description of the flow used to securely store (to git remote) .env secrets file

We use git-crypt to encrypt .env, and assume a solo developer.

### Summary:
- Generate a single git-crypt symmetric key once.
- Keep .env encrypted inside Git.
- Keep .env.template (only keys from .env) as plaintext for documentation.
- Store secret key outside the repo for disaster recovery.

Unlock automatically on your own machine.


### 1️⃣ Initial Setup (ONE TIME)
1. Generate a git-crypt symmetric key:
```bash
$ git-crypt init -f
```

This creates .git/git-crypt/keys/default (your real encryption key).

2. Export your encryption key to a file you can keep safely:
```bash
$ git-crypt export-key my-git-crypt.key
```

Store my-git-crypt.key somewhere SAFE:
- Password manager (1Password, Bitwarden, Keepass…), or
- USB key, offline
- Encrypted disk volume

Note:

🔥 NEVER commit my-git-crypt.key

🔥 NEVER store it in the repo


### 2️⃣ Configure which files are encrypted

Create .gitattributes with this content:

```bash
.env filter=git-crypt diff=git-crypt
```

Add & commit:

```bash
$ git add .gitattributes
$ git commit -m "Encrypt .env with git-crypt"
```

### 3️⃣ Keep your local .env unencrypted and usable

Because it's encrypted only inside Git, but always decrypted on your machine once unlocked.

### 4️⃣ Commit everything (git-crypt encrypts .env automatically)
```bash
$ git add .env.template .env
$ git commit -m "Add secrets"
$ git push
```

.env will be encrypted in the repo.

### 5️⃣ Automatically unlock on your machine

Run once:

```bash
$ git-crypt unlock
```

Because you initialized the repo, your system already has the encryption key in .git/crypt/keys/default.
No password needed.



## 🟦 FLOW A — Fresh repo clone → fill .env manually

You just cloned the repo, and do NOT have any stored key.

1. Clone repo
```bash
$ git clone <repo>
$ cd repo
```

2. Set up .env from template
```bash
$ cp .env.template .env
```

Fill it manually.

3. Generate a new git-crypt key (solo dev = always regenerate)
```bash
$ git-crypt init -f
$ git-crypt export-key my-git-crypt.key
```

Store my-git-crypt.key safely.

4. Re-encrypt .env
```bash
$ git add .env
$ git commit -m "Regenerated .env + new git-crypt key"
$ git push
```

You now have a new working encryption key.



## 🟩 FLOW B — Fresh repo clone with existing git-crypt key → auto-restore .env

You have your stored my-git-crypt.key.
You want to recover repo + decrypted .env.

1. Clone repo
```bash
$ git clone <repo>
$ cd repo
``

2. Unlock using your saved key
```bash
$ git-crypt unlock /path/to/my-git-crypt.key
```

Instantly .env becomes decrypted on disk
