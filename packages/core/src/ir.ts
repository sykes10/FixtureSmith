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

export interface NumberBoundary {
  readonly inclusive: boolean
  readonly value: number
}

export interface NumberNode {
  readonly kind: "number"
  readonly sourceKind: string
  readonly integer: boolean
  readonly minimum?: NumberBoundary
  readonly maximum?: NumberBoundary
}

export interface BooleanNode {
  readonly kind: "boolean"
  readonly sourceKind: string
}

export interface DateNode {
  readonly kind: "date"
  readonly sourceKind: string
  readonly minimum?: number
  readonly maximum?: number
}

export interface LiteralNode {
  readonly kind: "literal"
  readonly sourceKind: string
  readonly values: readonly unknown[]
}

export interface EnumNode {
  readonly kind: "enum"
  readonly sourceKind: string
  readonly values: readonly (string | number)[]
}

export interface ArrayNode {
  readonly kind: "array"
  readonly sourceKind: string
  readonly element: GenerationNode
  readonly minLength?: number
  readonly maxLength?: number
}

export interface OptionalNode {
  readonly kind: "optional"
  readonly sourceKind: string
  readonly inner: GenerationNode
}

export interface NullableNode {
  readonly kind: "nullable"
  readonly sourceKind: string
  readonly inner: GenerationNode
}

export type GenerationNode =
  | StringNode
  | NumberNode
  | BooleanNode
  | DateNode
  | LiteralNode
  | EnumNode
  | ArrayNode
  | OptionalNode
  | NullableNode
  | ObjectNode
