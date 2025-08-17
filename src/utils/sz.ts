import type {RawCreateParams, ZodRawShape} from 'zod';
import {  z,  ZodType } from 'zod'

export function string(param?: RawCreateParams) {
  return z.preprocess((val) => {
    if (val === 'null') return null
    return val
  }, z.string(param))
}
export const number = (param?: RawCreateParams) => z.coerce.number(param)
export const bigint = (param?: RawCreateParams) => z.coerce.bigint(param)
export function boolean(param?: RawCreateParams) {
  return z.preprocess((val, ctx) => {
    if (val === undefined) return undefined
    if (typeof val === 'boolean') return val
    if (typeof val != 'string') {
      ctx.addIssue({
        code: z.ZodIssueCode.invalid_type,
        expected: 'string',
        received: typeof val,
        message: `Expected string, received${typeof val}`,
      })
      return false
    }
    return val === 'true'
  }, z.boolean(param))
}
export const date = (_param?: RawCreateParams) => z.coerce.date()

export function array<T extends ZodType>(
  type: T,
  separator: string | RegExp = ',',
  param?: RawCreateParams,
) {
  return z.preprocess(
    (val, ctx) => {
      if (val === undefined) return undefined
      if (val === null) return null
      if (Array.isArray(val)) return val
      if (typeof val !== 'string') {
        ctx.addIssue({
          code: z.ZodIssueCode.invalid_type,
          expected: 'string',
          received: typeof val,
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
