import { useFrame } from "@react-three/fiber"
import React, { forwardRef, useRef } from "react"
import mergeRefs from "react-merge-refs"
import { AddEquation, CustomBlending } from "three"
import CustomShaderMaterial, { iCSMProps } from "three-custom-shader-material"
import CustomShaderMaterialImpl from "three-custom-shader-material/vanilla"
import { compileShader, makeShaderModule } from "three-shadermaker"

const time = () =>
  makeShaderModule({
    uniforms: {
      u_time: { type: "float", value: 0 }
    },

    frameCallback: (material, dt) => {
      material.uniforms.u_time.value += dt
    }
  })

const billboard = () =>
  makeShaderModule({
    vertexHeader: `
      vec3 billboard(vec2 v, mat4 view){
        vec3 up = vec3(view[0][1], view[1][1], view[2][1]);
        vec3 right = vec3(view[0][0], view[1][0], view[2][0]);
        vec3 p = right * v.x + up * v.y;
        return p;
      }
    `,

    vertexMain: /*glsl*/ `
      csm_Position = billboard(csm_Position.xy, viewMatrix);
    `
  })

const lifeTime = () =>
  makeShaderModule({
    varyings: {
      v_timeStart: { type: "float", value: "time.x" },
      v_timeEnd: { type: "float", value: "time.y" },
      v_age: { type: "float", value: "u_time - v_timeStart" },
      v_progress: { type: "float", value: "v_age / (v_timeEnd - v_timeStart)" }
    },

    vertexHeader: `
      attribute vec2 time;
    `,

    fragmentMain: `
      /* Discard this instance if it is not in the current time range */
      if (u_time < v_timeStart || u_time > v_timeEnd) {
        discard;
      }
    `
  })

const animateColor = () =>
  makeShaderModule({
    varyings: {
      v_colorStart: { type: "vec4", value: "colorStart" },
      v_colorEnd: { type: "vec4", value: "colorEnd" }
    },

    vertexHeader: `
      attribute vec4 colorStart;
      attribute vec4 colorEnd;
    `,

    fragmentMain: `
      /* Get diffuse color */
      vec4 diffuse4 = vec4(diffuse, 1.0);

      /* Apply the diffuse color */
      csm_DiffuseColor = mix(diffuse4 * v_colorStart, diffuse4 * v_colorEnd, v_progress);

      /* Mix in the texture */
      #ifdef USE_MAP
        csm_DiffuseColor *= texture2D(map, vUv);
      #endif
    `
  })

const animateScale = ({ t = "v_progress" } = {}) =>
  makeShaderModule({
    vertexHeader: `
      attribute vec3 scaleStart;
      attribute vec3 scaleEnd;
    `,

    vertexMain: `
      csm_Position *= mix(scaleStart, scaleEnd, ${t});
    `
  })

const velocityAndAcceleration = ({ target = "csm_Position" } = {}) =>
  makeShaderModule({
    vertexHeader: `
      attribute vec3 velocity;
      attribute vec3 acceleration;
    `,

    vertexMain: `
      ${target}
        += vec3(v_age * velocity + 0.5 * v_age * v_age * acceleration)
           * mat3(instanceMatrix);
    `
  })

type ParticlesMaterialProps = Omit<iCSMProps, "ref"> & {
  billboard?: boolean
}

export const ParticlesMaterial = forwardRef<
  CustomShaderMaterialImpl,
  ParticlesMaterialProps
>(({ billboard: isBillboard = false, ...props }, ref) => {
  const material = useRef<CustomShaderMaterialImpl>(null!)

  const { callback, ...shader } = compileShader(
    time(),
    lifeTime(),

    isBillboard && billboard(),
    animateScale({ t: "smoothstep(0.0, 1.0, sin(v_progress * PI))" }),
    velocityAndAcceleration(),

    animateColor()
  )

  useFrame((state, dt) => {
    callback(material.current, dt)
  })

  return (
    <CustomShaderMaterial
      ref={mergeRefs([ref, material])}
      blending={CustomBlending}
      blendEquation={AddEquation}
      depthTest={true}
      depthWrite={false}
      {...shader}
      {...props}
    />
  )
})
