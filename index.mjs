#!/usr/bin/env node
/** @format */

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { downloadTemplate } from "giget";
import pc from "picocolors";
import prompts from "prompts";

/** Source du template. Épingler un tag évite de livrer un `main` instable. */
const TEMPLATE = process.env.IROS_TEMPLATE ?? "github:4develhoper/iros#v1.0.5";

/** Port de développement par défaut du boilerplate. */
const PORT = 3017;

/** Dossier retenu lorsque la ligne de commande n'en nomme aucun. */
const DEFAULT_DIR = "mon-app";

/**
 * Analyse minimale de la ligne de commande.
 *
 * @example
 * ```bash
 * create-iros-app mon-app --pm bun --no-git
 * create-iros-app mon-app --yes          # sans aucune question
 * ```
 */
const parseArgv = (argv) => {
  const options = { dir: undefined, install: true, git: true, pm: undefined, yes: false };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--no-install") options.install = false;
    else if (argument === "--no-git") options.git = false;
    else if (argument === "--yes" || argument === "-y") options.yes = true;
    else if (argument === "--pm") options.pm = argv[++index];
    else if (!argument.startsWith("-")) options.dir ??= argument;
  }

  return options;
};

/** Déduit un nom affiché lisible depuis un nom de dossier. */
const toDisplayName = (raw) =>
  basename(raw)
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());

/**
 * Réunit les métadonnées du projet, en interrogeant l'utilisateur si besoin.
 *
 * `--yes` court-circuite les questions : c'est le seul mode utilisable sans
 * terminal interactif, `prompts` s'interrompant sur une entrée redirigée.
 */
const collectAnswers = async (options) => {
  if (options.yes) {
    const dir = options.dir ?? DEFAULT_DIR;
    return { dir, displayName: toDisplayName(dir), description: "" };
  }

  return prompts(
    [
      {
        type: options.dir ? null : "text",
        name: "dir",
        message: "Nom du projet",
        initial: DEFAULT_DIR,
      },
      {
        type: "text",
        name: "displayName",
        message: "Nom affiché dans l'application",
        initial: (_, values) => toDisplayName(options.dir ?? values.dir ?? DEFAULT_DIR),
      },
      { type: "text", name: "description", message: "Description", initial: "" },
    ],
    { onCancel: () => process.exit(1) }
  );
};

/** Devine le gestionnaire de paquets depuis `npm_config_user_agent`. */
const detectPackageManager = () => {
  const agent = process.env.npm_config_user_agent ?? "";
  if (agent.startsWith("bun")) return "bun";
  if (agent.startsWith("pnpm")) return "pnpm";
  if (agent.startsWith("yarn")) return "yarn";
  return "npm";
};

/**
 * Exécute une commande dans le projet et interrompt le script en cas d'échec.
 *
 * Sous Windows, les gestionnaires de paquets sont des scripts `.cmd` que
 * `spawnSync` ne sait lancer qu'à travers un shell. `git`, lui, est un
 * exécutable natif : le passer par le shell casserait ses arguments, car
 * `shell: true` concatène `args` sans échappement — un message de commit
 * multi-mots serait alors découpé en autant de pathspecs.
 */
const run = (command, args, cwd) => {
  const shell = process.platform === "win32" && command !== "git";
  const result = spawnSync(command, args, { cwd, stdio: "inherit", shell });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} a échoué.`);
};

/** Remplace une valeur de chaîne dans un fichier source, à clé constante. */
const replaceInFile = (path, replacements) => {
  let content = readFileSync(path, "utf8");
  for (const [pattern, value] of replacements) content = content.replace(pattern, value);
  writeFileSync(path, content);
};

const main = async () => {
  const options = parseArgv(process.argv.slice(2));

  const answers = await collectAnswers(options);

  const directory = options.dir ?? answers.dir;
  const target = resolve(process.cwd(), directory);
  const packageName = basename(target)
    .toLowerCase()
    .replace(/[^a-z0-9-~][^a-z0-9-._~]*/g, "-");

  if (existsSync(target) && readdirSync(target).length > 0) {
    console.error(pc.red(`Le dossier ${directory} existe déjà et n'est pas vide.`));
    process.exit(1);
  }

  console.log(pc.dim(`\nTéléchargement du template...`));
  // console.log(pc.dim(`\nTéléchargement du template depuis ${TEMPLATE}…`));
  await downloadTemplate(TEMPLATE, { dir: target, force: true });

  // 1. package.json : nom du projet, version remise à zéro.
  const packageJsonPath = join(target, "package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  packageJson.name = packageName;
  packageJson.version = "0.1.0";
  packageJson.private = true;
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`);

  // 2. site.config.ts : identité de la marque.
  replaceInFile(join(target, "src/config/site.config.ts"), [
    [/name: "Boilerplate"/, `name: ${JSON.stringify(answers.displayName)}`],
    [/shortName: "Boilerplate\."/, `shortName: ${JSON.stringify(`${answers.displayName}.`)}`],
    [/description:\s*\n?\s*"[^"]*"/, `description: ${JSON.stringify(answers.description || `${answers.displayName}, propulsé par Iros.`)}`],
  ]);

  // 3. .env : secret d'authentification généré, URL alignées sur le port réel.
  const secret = randomBytes(32).toString("base64");
  const environment = readFileSync(join(target, ".env.example"), "utf8")
    .replace(/BETTER_AUTH_SECRET=".*"/, `BETTER_AUTH_SECRET="${secret}"`)
    .replace(/BETTER_AUTH_URL=".*"/, `BETTER_AUTH_URL="http://localhost:${PORT}"`)
    .replace(/NEXT_PUBLIC_APP_URL=".*"/, `NEXT_PUBLIC_APP_URL="http://localhost:${PORT}"`);
  writeFileSync(join(target, ".env"), environment);

  // 4. `better-sqlite3` n'ouvre pas un fichier dans un dossier absent.
  mkdirSync(join(target, "data"), { recursive: true });

  const packageManager = options.pm ?? detectPackageManager();

  if (options.install) {
    console.log(pc.dim("\nInstallation des dépendances…"));
    run(packageManager, ["install"], target);

    console.log(pc.dim("\nApplication des migrations…"));
    run(packageManager, ["run", "db:migrate"], target);
  }

  // Le dépôt Git est un confort, pas une condition de réussite : une identité
  // Git absente ne doit pas condamner un projet par ailleurs opérationnel.
  if (options.git && !existsSync(join(target, ".git"))) {
    try {
      run("git", ["init"], target);
      run("git", ["add", "-A"], target);
      run("git", ["commit", "-m", "chore: initialisation depuis create-iros-app"], target);
    } catch {
      console.warn(pc.yellow("\nDépôt Git non initialisé — à faire à la main si besoin."));
    }
  }

  const runner = packageManager === "npm" ? "npm run" : packageManager === "yarn" ? "yarn" : `${packageManager} run`;

  console.log(`
${pc.green("✔")} Projet ${pc.bold(packageName)} créé.

  cd ${directory}${options.install ? "" : `\n  ${packageManager} install\n  ${runner} db:migrate`}
  ${runner} dev

  ${pc.dim(`http://localhost:${PORT}`)}
`);
};

main().catch((error) => {
  console.error(pc.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});
