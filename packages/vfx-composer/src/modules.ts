import {
  $,
  Add,
  GLSLType,
  Input,
  InstanceMatrix,
  mat3,
  Mat3,
  Mul,
  pipe,
  Pow,
  Value,
  vec3,
  Vec3
} from "shader-composer"
import {
  Billboard as BillboardUnit,
  ParticleAge,
  ParticleProgress
} from "./units"

export type Module<T extends GLSLType> = (input: Input<T>) => Input<T>

export type ModulePipe<T extends GLSLType> = Module<T>[]

export const pipeModules = <T extends GLSLType>(
  initial: Input<T>,
  ...modules: Module<T>[]
) => pipe(initial, ...(modules as [Module<T>]))

export const LifetimeModule = () => (color: Input<"vec3">) =>
  Vec3(color, {
    fragment: {
      body: $`if (${ParticleProgress} < 0.0 || ${ParticleProgress} > 1.0) discard;`
    }
  })

export const AccelerationModule = (acceleration: Value<"vec3">) => (
  position: Input<"vec3">
) =>
  pipe(
    acceleration,
    (v) => Mul(v, Mat3($`mat3(${InstanceMatrix})`)),
    (v) => Mul(v, Pow(ParticleAge, 2)),
    (v) => Mul(v, 0.5),
    (v) => Add(position, v)
  )

export const ScaleModule = (scale: Input<"float"> = 1) => (
  position: Input<"vec3">
) => Mul(position, scale)

export const MultiplyWith = (factor: Input<any>) => <T extends GLSLType>(
  input: Input<T>
) => Mul(input, factor)

export const Translate = (offset: Input<"vec3">) => (position: Input<"vec3">) =>
  pipe(
    offset,
    (v) => Mul(v, mat3(InstanceMatrix)),
    (v) => Add(position, v)
  )

export const Velocity = (velocity: Input<"vec3">) =>
  Translate(Mul(velocity, ParticleAge))

export const Acceleration = (acceleration: Input<"vec3">) =>
  Translate(
    pipe(
      acceleration,
      (v) => Mul(v, Pow(ParticleAge, 2)),
      (v) => Mul(v, 0.5)
    )
  )

/**
 * Apply a downward force, just like gravity.
 *
 * @param amount The gravity force (default: 9.81).
 */
export const Gravity = (amount: Input<"float"> = 9.81) =>
  Acceleration(vec3(0, -amount, 0))

export const Billboard = () => (position: Input<"vec3">) =>
  BillboardUnit(position)
