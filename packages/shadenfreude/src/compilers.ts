import { Vector2 } from "three"
import { isExpression } from "./expressions"
import { glslRepresentation } from "./glslRepresentation"
import {
  assignment,
  block,
  concatenate,
  flatten,
  identifier,
  isSnippet,
  Parts,
  sluggify,
  Snippet,
  statement
} from "./lib/concatenator3000"
import idGenerator from "./lib/idGenerator"
import { isNode, Node } from "./tree"

export type ProgramType = "vertex" | "fragment"

const nodeBeginComment = (v: Node) =>
  `/*** BEGIN: ${v._config.name} (${v._config.id}) ***/`

const nodeEndComment = (v: Node) =>
  `/*** END: ${v._config.name} (${v._config.id}) ***/\n`

/**
 * Traverses the specified nodes and returns a list of all objects that can
 * be dependencies of something else (nodes, expressions, snippets, etc.)
 *
 * @param sources
 * @returns
 */
const getDependencies = (...sources: any[]): any[] =>
  sources
    .flat(Infinity)
    .map((s) =>
      isNode(s)
        ? s
        : isExpression(s)
        ? [s.values, getDependencies(...s.values)]
        : isSnippet(s)
        ? s
        : undefined
    )
    .flat(Infinity)
    .filter((d) => !!d)

const compileSnippet = (
  s: Snippet,
  program: "vertex" | "fragment",
  state: ReturnType<typeof compilerState>
) => {
  if (!state.isFresh(s)) return

  if (isExpression(s.chunk))
    s.chunk.values.forEach((v) => {
      isNode(v) && compileVariable(v, program, state)
      isSnippet(v) && compileSnippet(v, program, state)
    })

  state.header.push(`/*** SNIPPET: ${s.name} ***/`, s.chunk)
}

export const compileVariable = (
  v: Node,
  program: ProgramType,
  state = compilerState()
) => {
  if (!state.isFresh(v)) return []

  if (v._config.only && v._config.only !== program) {
    /* We are now in pruning mode. */
    state.pruning = true
  }

  /* Build a list of dependencies from the various places that can have them: */
  const dependencies = getDependencies(
    v.value,
    v._config[`${program}Header`],
    v._config[`${program}Body`]
  )

  /* Render node and snippet dependencies */
  dependencies.forEach((dep) => {
    isNode(dep) && compileVariable(dep, program, state)
    isSnippet(dep) && compileSnippet(dep, program, state)
  })

  /* Prepare this node */
  v._config.id = state.nextId()
  v._config.slug = identifier(v.type, sluggify(v._config.name), v._config.id)

  /* If we're in pruning mode, add nothing to the program. */
  /* TODO: unless this is a varying node! */
  if (state.pruning) return

  /* HEADER */
  const header = flatten(
    /* If this node is configured to use a varying, declare it */
    v._config.varying && `varying ${v.type} v_${v._config.slug};`,

    /* Render the actual header chuink */
    v._config[`${program}Header`]
  )

  state.header.push(
    /* Render header chunk */
    header.length && [nodeBeginComment(v), header, nodeEndComment(v)]
  )

  /* BODY */
  state.body.push(
    nodeBeginComment(v),

    /* Declare the variable */
    statement(v.type, v._config.slug),

    block(
      /* Make local value variable available */
      v._config.varying && program === "fragment"
        ? statement(v.type, "value", "=", `v_${v._config.slug}`)
        : statement(v.type, "value", "=", glslRepresentation(v.value)),

      /* The body chunk, if there is one */
      v._config[`${program}Body`],

      /* Assign local value variable back to global variable */
      assignment(v._config.slug, "value"),

      /* If we're in vertex and have a varying, assign to it, too */
      v._config.varying &&
        program === "vertex" &&
        assignment(`v_${v._config.slug}`, "value")
    ),

    nodeEndComment(v)
  )
}

/**  Compile a program from the given node */
export const compileProgram = (root: Node, program: ProgramType) => {
  const state = compilerState()
  compileVariable(root, program, state)

  return concatenate(state.header, "void main()", block(state.body))
}

export const compileShader = (root: Node) => {
  const vertexShader = compileProgram(root, "vertex")
  const fragmentShader = compileProgram(root, "fragment")

  const uniforms = {
    u_time: { value: 0 },
    u_resolution: { value: new Vector2() }
  }

  const update = (dt: number) => {
    uniforms.u_time.value += dt
    uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight)
  }

  return [{ vertexShader, fragmentShader, uniforms }, update] as const
}

const compilerState = () => {
  const seen = new Set<Node | Snippet>()
  const header = [] as Parts
  const body = [] as Parts
  const nextId = idGenerator()

  return {
    isFresh: (v: Node | Snippet) => (seen.has(v) ? false : seen.add(v) && true),

    header,
    body,
    nextId,
    pruning: false
  }
}
