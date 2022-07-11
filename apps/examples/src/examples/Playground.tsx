import {
  Add,
  Bitangent,
  code,
  Cross,
  CustomShaderMaterialMaster,
  Dissolve,
  Float,
  Mix,
  Mul,
  Multiply,
  Normalize,
  Pipe,
  Pow,
  Remap,
  Simplex3DNoise,
  Sin,
  Smoothstep,
  Step,
  Sub,
  Tangent,
  Time,
  Value,
  Vec3,
  VertexNormal,
  VertexPosition
} from "shadenfreude"
import { Color, DoubleSide, MeshStandardMaterial } from "three"
import CustomShaderMaterial from "three-custom-shader-material"
import { DustExample } from "./DustExample"
import { useShader } from "./useShader"

const UpdateVertexNormal = (
  modifier: (v: Value<"vec3">) => Value<"vec3">,
  offset = 0.001
) => {
  const tangent = Tangent(VertexNormal)
  const bitangent = Bitangent(VertexNormal, tangent)

  const neighbor1 = Add(VertexPosition, Mul(tangent, offset))
  const neighbor2 = Add(VertexPosition, Mul(bitangent, offset))

  const displacedNeighbor1 = modifier(neighbor1)
  const displacedNeighbor2 = modifier(neighbor2)

  const displacedTangent = Sub(displacedNeighbor1, VertexPosition)
  const displacedBitangent = Sub(displacedNeighbor2, VertexPosition)

  return Normalize(Cross(displacedTangent, displacedBitangent))
}

export default function Playground() {
  const shader = useShader(() => {
    const ScaledNoise = (scale = 1, timeScale = 1) =>
      Remap(
        Simplex3DNoise(
          Add(Multiply(VertexPosition, scale), Multiply(Time, timeScale))
        ),
        -1,
        1,
        0,
        1
      )

    /* Calculate noises */
    const bigwaves = ScaledNoise(0.008, 0.1)
    const waves = ScaledNoise(0.025, 0.1)
    const ripples = ScaledNoise(5, 0.8)
    const foam = Step(0.5, ScaledNoise(0.1, 0.1))

    const ApplyWaves = (v: Value<"vec3">) =>
      Pipe(
        Vec3(v),
        ($) => Add($, Multiply(bigwaves, 8)),
        ($) => Add($, Multiply(waves, 4)),
        ($) => Add($, Multiply(ripples, 0.2))
      )

    return CustomShaderMaterialMaster({
      position: ApplyWaves(VertexPosition),
      normal: UpdateVertexNormal(ApplyWaves),

      diffuseColor: Pipe(Vec3(new Color("#99b")), ($) =>
        Add($, Mul(foam, 0.03))
      ),

      alpha: 0.9
    })
  }, [])

  console.log(shader.vertexShader)
  // console.log(shader.fragmentShader)

  return (
    <group position-y={-8}>
      {/* <Fog /> */}
      <DustExample />
      <mesh>
        <boxGeometry args={[500, 5, 500, 100, 1, 100]} />

        <CustomShaderMaterial
          baseMaterial={MeshStandardMaterial}
          {...shader}
          transparent
          side={DoubleSide}
          // wireframe
        />
      </mesh>
    </group>
  )
}
