# Karel.js

Compilador y evaluador de Karel en Javascript

## Cómo descargar Karel.js

- Clona el repositorio en tu máquina usando
  `git clone https://github.com/omegaup/karel.js.git`.
- Haz `git submodule update --init` al repo, para incluir CodeMirror en tu
  copia del proyecto.

## Cómo correr Karel.js en tu máquina

- `npm install && npm start`

## Cómo correr Karel.js de línea de comandos

- `sudo npm install -g`
- `kareljs compile archivo.karel` compila el programa y genera un
  archivo `.kx`.
- `kareljs run archivo.kx < entrada.in` ejecuta el programa con el mundo
  especificado por `entrada.in`.

## Troubleshooting

- Si `npm install` marca error en la librería `node-canvas`, probablemente estés
  corriendo desde un OS que necesita instalar ciertas dependencias. Consulta la siguiente
  [documentación](https://github.com/Automattic/node-canvas?tab=readme-ov-file#compiling)
