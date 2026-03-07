package ui

import "github.com/yuki/stargrace-framework/controller/stargrace/schema"

type Element struct {
	node *schema.Node
}

func VStack(children ...*Element) *Element {
	return (&Element{
		node: &schema.Node{
			Kind: schema.ComponentVStack,
		},
	}).Child(children...)
}

func HStack(children ...*Element) *Element {
	return (&Element{
		node: &schema.Node{
			Kind: schema.ComponentHStack,
		},
	}).Child(children...)
}

func List(children ...*Element) *Element {
	return (&Element{
		node: &schema.Node{
			Kind: schema.ComponentList,
		},
	}).Child(children...)
}

func ScrollView(children ...*Element) *Element {
	return (&Element{
		node: &schema.Node{
			Kind: schema.ComponentScroll,
		},
	}).Child(children...)
}

func LineChart(values []float64) *Element {
	copied := append([]float64(nil), values...)
	return &Element{
		node: &schema.Node{
			Kind:   schema.ComponentLine,
			Values: copied,
		},
	}
}

func Text(value string) *Element {
	return &Element{
		node: &schema.Node{
			Kind: schema.ComponentText,
			Text: value,
		},
	}
}

func TextField(value string) *Element {
	return &Element{
		node: &schema.Node{
			Kind:  schema.ComponentInput,
			Value: value,
		},
	}
}

func Button(label string) *Element {
	return &Element{
		node: &schema.Node{
			Kind: schema.ComponentButton,
			Text: label,
		},
	}
}

func (e *Element) ID(value string) *Element {
	e.node.ID = value
	return e
}

func (e *Element) Action(value string) *Element {
	e.node.Action = value
	return e
}

func (e *Element) Placeholder(value string) *Element {
	e.node.Placeholder = value
	return e
}

func (e *Element) Value(value string) *Element {
	e.node.Value = value
	return e
}

func (e *Element) Spacing(value float64) *Element {
	e.node.Spacing = &value
	return e
}

func (e *Element) Child(children ...*Element) *Element {
	for _, child := range children {
		if child == nil || child.node == nil {
			continue
		}
		e.node.Children = append(e.node.Children, child.node)
	}
	return e
}

func Document(root *Element) schema.Document {
	var rootNode *schema.Node
	if root != nil {
		rootNode = root.node
	}

	return schema.Document{
		Type: schema.MessageTypeRender,
		Root: rootNode,
	}
}
