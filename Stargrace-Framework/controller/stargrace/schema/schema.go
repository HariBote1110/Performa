package schema

type MessageType string

const (
	MessageTypeRender MessageType = "render"
	MessageTypeEvent  MessageType = "event"
)

type ComponentType string

const (
	ComponentVStack ComponentType = "vstack"
	ComponentHStack ComponentType = "hstack"
	ComponentList   ComponentType = "list"
	ComponentScroll ComponentType = "scrollview"
	ComponentLine   ComponentType = "linechart"
	ComponentText   ComponentType = "text"
	ComponentInput  ComponentType = "textfield"
	ComponentButton ComponentType = "button"
)

type Document struct {
	Type MessageType `json:"type" plist:"type"`
	Root *Node       `json:"root" plist:"root"`
}

type Event struct {
	Type   MessageType `json:"type" plist:"type"`
	Action string      `json:"action" plist:"action"`
	Value  string      `json:"value,omitempty" plist:"value,omitempty"`
}

type Node struct {
	Kind        ComponentType `json:"kind" plist:"kind"`
	ID          string        `json:"id,omitempty" plist:"id,omitempty"`
	Text        string        `json:"text,omitempty" plist:"text,omitempty"`
	Placeholder string        `json:"placeholder,omitempty" plist:"placeholder,omitempty"`
	Value       string        `json:"value,omitempty" plist:"value,omitempty"`
	Values      []float64     `json:"values,omitempty" plist:"values,omitempty"`
	Action      string        `json:"action,omitempty" plist:"action,omitempty"`
	Spacing     *float64      `json:"spacing,omitempty" plist:"spacing,omitempty"`
	Children    []*Node       `json:"children,omitempty" plist:"children,omitempty"`
}
