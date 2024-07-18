import { Crypto } from '@peculiar/webcrypto'
import { vi } from 'vitest'

import 'mock-local-storage'

vi.stubGlobal('crypto', new Crypto())
