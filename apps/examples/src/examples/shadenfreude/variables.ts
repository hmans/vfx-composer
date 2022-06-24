import { GLSLType, Variable } from "./types"

export function variable<T>(type: GLSLType, value?: T): Variable<T> {
  return {
    name: `var_${Math.floor(Math.random() * 100000)}`,
    type,
    value
  }
}
