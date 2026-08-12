# create-iros-app

Crée un projet Next.js à partir du boilerplate **[Iros](https://github.com/4develhoper/iros)** :
architecture par features, authentification et base de données déjà branchées.

```bash
bun  create iros-app mon-projet
npm  create iros-app@latest mon-projet
pnpm create iros-app mon-projet
```

Puis :

```bash
cd mon-projet
bun run dev     # http://localhost:3017
```

Le projet démarre avec une landing publique, un tunnel d'inscription/connexion
fonctionnel et un espace protégé de démonstration — sans aucune configuration
préalable.

---

## Ce que la commande fait pour vous

1. Télécharge le template depuis un tag figé du dépôt Iros.
2. Renseigne `package.json` (nom dérivé du dossier, version remise à `0.1.0`).
3. Personnalise `src/config/site.config.ts` avec le nom affiché et la
   description saisis.
4. Génère `.env` depuis `.env.example`, avec un **`BETTER_AUTH_SECRET` tiré
   aléatoirement** et des URL alignées sur le port réel.
5. Crée le dossier `data/` — `better-sqlite3` n'ouvre pas un fichier dans un
   dossier absent.
6. Installe les dépendances, puis applique les migrations Drizzle.
7. Initialise un dépôt Git avec un premier commit.

Trois questions sont posées au passage : le nom du projet (si absent de la
ligne de commande), le nom affiché dans l'interface, et la description.

## Options

| Option         | Effet                                                                    |
| -------------- | ------------------------------------------------------------------------ |
| `--no-install` | N'installe rien et ne migre pas ; les commandes à lancer sont rappelées   |
| `--no-git`     | Ne crée pas de dépôt Git                                                  |
| `--pm <nom>`   | Force le gestionnaire : `bun`, `npm`, `pnpm` ou `yarn`                    |

Sans `--pm`, le gestionnaire est déduit de la commande d'invocation
(`npm_config_user_agent`). Le boilerplate épingle `bun@1.3.14` via
`packageManager` : s'en écarter produit un arbre de dépendances différent.

```bash
bun create iros-app mon-projet --no-install --no-git
```

## Prérequis

| Outil   | Version  | Rôle                                                        |
| ------- | -------- | ----------------------------------------------------------- |
| Node.js | ≥ 20     | Exécution de la CLI et de Next.js 16                         |
| Bun     | ≥ 1.3.14 | Gestionnaire de paquets du projet généré                     |
| Git     | —        | Commit initial ; inutile avec `--no-git`                     |

`better-sqlite3` est un module natif. Un binaire précompilé couvre la plupart
des plateformes ; si la compilation se déclenche, il faut une chaîne C++ —
Visual Studio Build Tools (charge « Développement Desktop en C++ ») sur
Windows, `xcode-select --install` sur macOS.

## Le boilerplate

| Domaine          | Choix                                    |
| ---------------- | ---------------------------------------- |
| Framework        | Next.js 16 (App Router, Turbopack)       |
| UI               | React 19, Tailwind CSS 4                 |
| Langage          | TypeScript strict                        |
| Authentification | Better Auth (e-mail, Google, GitHub)     |
| Base de données  | Drizzle ORM + SQLite                     |
| État local       | Zustand                                  |
| Formulaires      | React Hook Form + Zod + next-safe-form   |
| Qualité          | Biome                                    |

`cacheComponents`, `typedRoutes` et le React Compiler sont activés. Le thème
sombre repose sur une échelle de couleurs inversée : les composants n'écrivent
aucune variante `dark:`.

Documentation complète :
[installation](https://github.com/4develhoper/iros/blob/main/docs/installation.md)
· [conventions](https://github.com/4develhoper/iros#readme)

## Choisir une autre source de template

`IROS_TEMPLATE` remplace le tag par défaut — utile pour essayer une branche de
travail ou une version antérieure :

```bash
IROS_TEMPLATE=github:4develhoper/iros#main node index.mjs mon-projet
```

Les fournisseurs Git (`github:`, `gitlab:`, `bitbucket:`, `sourcehut:`) et les
URL de tarball sont acceptés ; un chemin local ne l'est pas.

## Développement

```bash
git clone https://github.com/4develhoper/create-iros-app
cd create-iros-app
npm install
node index.mjs /tmp/essai-iros      # exécution directe
npm pack --dry-run                  # contenu réel de l'archive publiée
```

## Licence

MIT
