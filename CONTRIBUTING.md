# Trabajar en Telemetry 1

El repositorio de la web es https://github.com/MynosIII/telemetry-1. Incluye los
datos históricos publicados: no hace falta tener el entorno de investigación
original para ejecutar la web o editar sus páginas.

## Preparar una copia local

Usá Node.js 24 y npm:

```sh
git clone https://github.com/MynosIII/telemetry-1.git
cd telemetry-1
npm ci
npm run dev
```

La web queda en http://localhost:3000. Si necesitás acceso autenticado a OpenF1,
copiá `.env.example` a `.env.local` y completá tus credenciales allí. Los secretos
de producción se administran en Vercel; nunca se suben al repositorio.

## Trabajar en paralelo

Cada persona trabaja en su propia rama y abre un pull request contra `main`:

```sh
git switch main
git pull --ff-only origin main
git switch -c nombre/descripcion-del-cambio
```

Antes de subir cambios:

```sh
npm run verify:history
npm run verify:weekends
npm run verify:tyres
npm run build
git add <archivos-del-cambio>
git commit -m "Descripción del cambio"
git push -u origin nombre/descripcion-del-cambio
```

Abrí el pull request en GitHub y revisá los checks y la vista previa de Vercel.
Para incorporar cambios de otras personas a tu rama, hacé `git fetch origin` y
`git merge origin/main`. Resolvé los conflictos localmente y volvé a verificar.
Evitá forzar pushes a ramas compartidas. Si no tenés permiso de escritura, usá
un fork y enviá un pull request; el propietario puede invitar colaboradores
desde la configuración de acceso del repositorio.

## Despliegues

El proyecto `telemetry-1` de Vercel está conectado con este repositorio, con la
raíz del repositorio como raíz de proyecto y `main` como rama de producción.
Los pushes a `main` despliegan https://telemetry-1.vercel.app. Las ramas y los
pull requests generan vistas previas cuando la integración de Vercel autoriza
al autor. Revisá la vista previa antes de fusionar; `main` publica la web.

GitHub Actions ejecuta los verificadores de datos y la compilación en cada pull
request y push a `main`, sin necesitar secretos de producción. Estos checks no
son una regla de protección de rama: la revisión antes de fusionar es el flujo
de trabajo acordado.

## Datos e investigación

`public/history` contiene los snapshots JSON y CSV utilizados por la web.
Conservá sus fuentes, licencias y distinciones entre resultados oficiales y
estimaciones del modelo. Los scripts de regeneración están documentados en
`README.md` y requieren las fuentes y el entorno del proyecto de investigación;
no son necesarios para desarrollar la interfaz. No regeneres todo el archivo
para un cambio exclusivamente visual.

Los juegos enlazados tienen repositorios y despliegues separados, documentados
en `README.md`.
