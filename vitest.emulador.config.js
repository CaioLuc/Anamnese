import { defineConfig } from 'vitest/config'

// Testes de firestore.rules e das Cloud Functions de 2FA contra o Firebase Emulator Suite.
// Rodar com `npm run test:rules` (sobe Auth, Firestore e Functions via `firebase emulators:exec`).
export default defineConfig({
  test: {
    include: ['tests/emulador/**/*.test.js'],
    environment: 'node',
    // Os dois arquivos limpam o mesmo emulador: rodar em série
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 60000,
  },
})
