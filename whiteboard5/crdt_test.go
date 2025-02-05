package main

import (
	"testing"
)

// TestAddShape ensures that shapes are correctly added to the CRDT
func TestAddShape(t *testing.T) {
	crdt := NewCRDT()
	crdt.AddShape("shape1", "rectangle")

	shapes := crdt.GetShapes()
	if shapes["shape1"] != "rectangle" {
		t.Errorf("Expected 'rectangle', got %s", shapes["shape1"])
	}
}

func TestWhiteboardAddText(t *testing.T) {
	crdt := NewCRDT()
	crdt.AddText("text1", "Hello, world!")

	texts := crdt.GetTexts()
	if texts["text1"] != "Hello, world!" {
		t.Errorf("Expected 'Hello, world!', got %s", texts["text1"])
	}
}

// TestWhiteboardCollaboration ensures that multiple users can add shapes and texts without conflicts.
func TestWhiteboardCollaboration(t *testing.T) {
	crdt := NewCRDT()
	crdt.AddShape("shape1", "rectangle")
	crdt.AddShape("shape2", "circle")
	crdt.AddText("text1", "Hello")
	crdt.AddText("text2", "World")

	shapes := crdt.GetShapes()
	texts := crdt.GetTexts()

	if len(shapes) != 2 {
		t.Errorf("Expected 2 shapes, got %d", len(shapes))
	}
	if shapes["shape1"] != "rectangle" || shapes["shape2"] != "circle" {
		t.Errorf("Shape data mismatch: %+v", shapes)
	}
	if texts["text1"] != "Hello" || texts["text2"] != "World" {
		t.Errorf("Text data mismatch: %+v", texts)
	}
}
