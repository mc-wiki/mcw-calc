import type { ZodRawShape } from 'zod'
import { z, ZodType } from 'zod'

export function string(param?: z.core.$ZodStringParams | ((schema: z.ZodString) => z.ZodString)) {
  return z.preprocess(
    (val: string) => {
      if (val === 'null') return null
      return val
    },
    typeof param === 'function' ? param(z.string()) : z.string(param),
  )
}
export const number = z.coerce.number
export const bigint = z.coerce.bigint
export function boolean(
  param?: z.core.$ZodBooleanParams | ((schema: z.ZodBoolean) => z.ZodBoolean),
) {
  return z.preprocess(
    (val: string, ctx) => {
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
    },
    typeof param === 'function' ? param(z.boolean()) : z.boolean(param),
  )
}
export const date = z.coerce.date

export function array<T extends ZodType>(
  type: T,
  separator: string | RegExp = ',',
  param?: z.core.$ZodArrayParams | ((schema: z.ZodArray<T>) => z.ZodArray<T>),
) {
  return z.preprocess(
    (val: string, ctx) => {
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
    typeof param === 'function' ? param(z.array(type)) : z.array(type, param),
  )
}

export function object(type: ZodRawShape) {
  return z
    .string()
    .transform((val) => JSON.parse(val))
    .pipe(z.object(type))
}
