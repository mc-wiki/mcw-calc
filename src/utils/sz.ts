import type { ZodRawShape } from 'zod'
import { z, ZodType } from 'zod'

export function string(param?: z.core.$ZodStringParams) {
  return z.preprocess((val) => {
    if (val === 'null') return null
    return val
  }, z.string(param))
}
export const number = z.coerce.number
export const bigint = z.coerce.bigint
export function boolean(param?: z.core.$ZodBooleanParams) {
  return z.preprocess((val, ctx) => {
    if (val === undefined) return undefined
    if (typeof val === 'boolean') return val
    if (typeof val != 'string') {
      ctx.issues.push({
        code: 'invalid_type',
        expected: 'string',
        input: val,
        message: `Expected string, received${typeof val}`,
      })
      return false
    }
    return val === 'true'
  }, z.boolean(param))
}
export const date = (_param?: z.core.$ZodDateParams) => z.coerce.date()

export function array<T extends ZodType>(
  type: T,
  separator: string | RegExp = ',',
  param?: z.core.$ZodArrayParams,
) {
  return z.preprocess(
    (val, ctx) => {
      if (val === undefined) return undefined
      if (val === null) return null
      if (Array.isArray(val)) return val
      if (typeof val !== 'string') {
        ctx.issues.push({
          code: 'invalid_type',
          expected: 'string',
          input: val,
          message: `Expected string, received${typeof val}`,
        })
        return false
      }
      return val.split(separator)
    },
    z.array(type, param),
  )
}

export function object(type: ZodRawShape) {
  return z
    .string()
    .transform((val) => JSON.parse(val))
    .pipe(z.object(type))
}
