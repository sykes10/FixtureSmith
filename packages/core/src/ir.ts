export interface StringNode {
  readonly kind: "string"
  readonly sourceKind: string
  readonly format?: StringFormat
  readonly minLength?: number
  readonly maxLength?: number
}

export type StringFormat = "email" | "url" | "uuid"

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
