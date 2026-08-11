export interface StringNode {
  readonly kind: "string"
  readonly sourceKind: string
}

export interface ObjectProperty {
  readonly key: string
  readonly node: GenerationNode
}

export interface ObjectNode {
  readonly kind: "object"
  readonly sourceKind: string
  readonly properties: readonly ObjectProperty[]
}

export type GenerationNode = StringNode | ObjectNode
