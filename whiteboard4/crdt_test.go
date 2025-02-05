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

// TestMerge ensures that merging two CRDTs works correctly
func TestMerge(t *testing.T) {
	crdt1 := NewCRDT()
	crdt1.AddShape("shape1", "rectangle")

	crdt2 := NewCRDT()
	crdt2.AddShape("shape2", "circle")

	crdt1.Merge(crdt2)
	shapes := crdt1.GetShapes()

	if len(shapes) != 2 {
		t.Errorf("Expected 2 shapes, got %d", len(shapes))
	}
	if shapes["shape2"] != "circle" {
		t.Errorf("Expected 'circle', got %s", shapes["shape2"])
	}
}
