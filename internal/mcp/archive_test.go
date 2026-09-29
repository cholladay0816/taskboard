package mcp

import (
	"encoding/json"
	"path/filepath"
	"testing"

	"github.com/tcarac/taskboard/internal/db"
)

func TestArchiveCompletedTicketsTool(t *testing.T) {
	database, err := db.OpenAt(filepath.Join(t.TempDir(), "tickets.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()
	server := NewServer(db.NewStore(database))
	found := false
	for _, definition := range server.toolDefinitions() {
		if definition.Name == "archive_completed_tickets" {
			found = definition.InputSchema.Type == "object"
		}
	}
	if !found {
		t.Fatal("archive tool missing from tools/list")
	}
	result, err := server.callTool("archive_completed_tickets", json.RawMessage(`{}`))
	if err != nil {
		t.Fatal(err)
	}
	if result.(map[string]int64)["archivedCount"] != 0 {
		t.Fatalf("unexpected archive result: %v", result)
	}
}
