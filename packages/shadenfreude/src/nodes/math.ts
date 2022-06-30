import {
  glslType,
  inferVariable,
  IVariableWithOutValue,
  ShaderNode,
  Value,
  ValueType,
  Variable
} from "../shadenfreude"
import { FloatNode, Vector3Node } from "./values"

function makeFunctionNode(fun: string) {
  return function<T extends ValueType>({ a }: OperatorProps<T>) {
    return ShaderNode({
      name: `${fun} Function`,
      in: { a: inferVariable(a) },
      out: {
        value: {
          ...inferVariable(a),
          value: `${fun}(in_a)`
        } as Variable<T>
      }
    })
  }
}

export const SinNode = makeFunctionNode("sin")
export const CosNode = makeFunctionNode("cos")

type Operator = "+" | "-" | "*" | "/"

type OperatorProps<T extends ValueType> = {
  a: Value<T> | IVariableWithOutValue<T>
  b: Value<any> | IVariableWithOutValue<any>
}

export const OperatorNode = <T extends ValueType>({
  a,
  b,
  operator
}: OperatorProps<T> & { operator: Operator }) =>
  ShaderNode({
    name: `Perform ${operator} on ${glslType(a)}`,
    inputs: {
      a: inferVariable(a),
      b: inferVariable(b)
    },
    outputs: {
      value: inferVariable(a) as Variable<T>
    },
    vertex: {
      body: `value = a ${operator} b;`
    },
    fragment: {
      body: `value = a ${operator} b;`
    }
  })

export const AddNode = <T extends ValueType>({ a, b }: OperatorProps<T>) =>
  OperatorNode({ operator: "+", a, b })

export const SubtractNode = <T extends ValueType>({ a, b }: OperatorProps<T>) =>
  OperatorNode({ operator: "-", a, b })

export const DivideNode = <T extends ValueType>({ a, b }: OperatorProps<T>) =>
  OperatorNode({ operator: "/", a, b })

export const MultiplyNode = <T extends ValueType>({ a, b }: OperatorProps<T>) =>
  OperatorNode({ operator: "*", a, b })

const a = FloatNode({ value: 1 })
const b = FloatNode({ value: 1 })
const v = Vector3Node()
const add = AddNode({ a: v, b })
