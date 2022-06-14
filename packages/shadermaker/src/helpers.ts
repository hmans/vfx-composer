import { ShaderModule } from "./types"

export const makeShaderModule = (
  config: Partial<ShaderModule>
): ShaderModule => ({
  name: "unnamed",
  uniforms: {},
  vertexHeader: "",
  vertexMain: "",
  fragmentHeader: "",
  fragmentMain: "",
  ...config
})

export const float = (v: number) => v.toFixed(5)
