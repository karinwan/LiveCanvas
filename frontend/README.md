# Frontend Service

## Type Support for `.vue` Imports in TS

TypeScript cannot handle type information for `.vue` imports by default, so we replace the `tsc` CLI with `vue-tsc` for type checking. In editors, we need [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin) to make the TypeScript language service aware of `.vue` types.

If the standalone TypeScript plugin doesn't feel fast enough to you, Volar has also implemented a [Take Over Mode](https://github.com/johnsoncodehk/volar/discussions/471#discussioncomment-1361669) that is more performant. You can enable it by the following steps:

1. Disable the built-in TypeScript Extension
   1. Run `Extensions: Show Built-in Extensions` from VSCode's command palette
   2. Find `TypeScript and JavaScript Language Features`, right click and select `Disable (Workspace)`
2. Reload the VSCode window by running `Developer: Reload Window` from the command palette.


## Setup and Installation
1. Install Dependencies

```sh
npm install
```

2. Start the Development Server

```sh
npm run dev
```

<!-- ### Type-Check, Compile and Minify for Production

```sh
npm run build
``` -->

## Running Tests
1. Run All Tests

```sh
npm run test
```
2.  Run Tests with Coverage
```sh
npm run test:coverage
```

## Linting
We use ESLint as our linter. Please run the linter with the following command:

```sh
npm run lint
```
To automatically fix linting issues, run:
```sh
npm run lint:fix
```
The configuration is in ./frontend/.eslint.config.mjs

## Deloyment

1. Build the Project for Production
```sh
npm run build
```
2.Create a Docker Image

```sh
docker build -t {name of the image} .
```

3. Run the Container

```sh
docker run -d --name {name of your docker instance} -p 8080:80 {name of the docker you created}
```
## Development Guide
### Project Structure
```
frontend/
├── src/
│   ├── api/ 
│   ├── components/ 
│   ├── composables/
│   ├── locales/
│   ├── pages/
│   ├── router/
│   ├── service/
│   ├── store/
│   ├── App.vue
│   ├── i18n.ts
│   ├── main.js
│   ├── style.css
│   ├── theme.ts
│
├── public/
├── nginx/
│
├── eslint.config.mjs
├── Dockerfile
├── package.json
├── index.html
├── vitest.config.ts
```
## Best Practices
1. Use reusable and modular components.
2. Follow Vue.js best practices for state management.
3. Write unit tests for components.
4. Ensure code follows ESLint rules.
5. Optimize assets and lazy load components where needed

## Troubleshooting
1. Port conflicts: Change the port using npm run dev -- --port=3000
2. Dependency errors: Run npm install again.
3. Linting errors: Run npm run lint:fix to fix common issues.

For more information, refer to the Vue.js documentation: [Vue.js Doc](https://vuejs.org/)