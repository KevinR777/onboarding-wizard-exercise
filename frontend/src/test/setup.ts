import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// RTL's automatic per-test cleanup registers itself via a global `afterEach`,
// which only exists if Vitest's `globals: true` is set. This project
// deliberately doesn't use `globals: true` (explicit imports everywhere), so
// cleanup has to be wired up explicitly here instead — otherwise DOM from
// every test in a file piles up in document.body across tests.
afterEach(() => {
  cleanup()
})
