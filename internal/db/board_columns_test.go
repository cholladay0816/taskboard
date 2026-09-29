package db

import (
	"path/filepath"
	"testing"

	"github.com/tcarac/taskboard/internal/models"
)

func TestBoardColumnsPersistAndKeepTicketsVisible(t *testing.T) {
	database, err := OpenAt(filepath.Join(t.TempDir(), "board.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()
	store := NewStore(database)

	columns, err := store.ListBoardColumns()
	if err != nil || len(columns) != 4 || columns[2].ID != "blocked" {
		t.Fatalf("default columns = %+v, err = %v", columns, err)
	}
	custom, err := store.CreateBoardColumn("Review")
	if err != nil || custom.Position != 4 {
		t.Fatalf("new column = %+v, err = %v", custom, err)
	}
	if err := store.UpdateBoardColumn(custom.ID, "Ready to ship", "#12ABcd"); err != nil {
		t.Fatal(err)
	}
	ids := []string{custom.ID, "todo", "blocked", "in_progress", "done"}
	if err := store.ReorderBoardColumns(ids); err != nil {
		t.Fatal(err)
	}
	if err := store.ReorderBoardColumns([]string{custom.ID, "todo", "todo", "in_progress", "done"}); err == nil {
		t.Fatal("duplicate column should be rejected")
	}
	project, err := store.CreateProject(models.CreateProjectRequest{Name: "Demo", Prefix: "DEMO"})
	if err != nil {
		t.Fatal(err)
	}
	ticket, err := store.CreateTicket(models.CreateTicketRequest{ProjectID: project.ID, Title: "Ship", Status: custom.ID})
	if err != nil {
		t.Fatal(err)
	}
	board, err := store.GetBoard("")
	if err != nil || board.Columns[0].ID != custom.ID || board.Columns[0].Name != "Ready to ship" || board.Columns[0].Color != "#12ABcd" || len(board.Columns[0].Tickets) != 1 {
		t.Fatalf("board after update = %+v, err = %v", board, err)
	}
	if err := store.DeleteBoardColumn(custom.ID); err == nil {
		t.Fatal("deleting a column with tickets should fail")
	}
	if _, err := store.MoveTicket(ticket.ID, models.MoveTicketRequest{Status: "todo"}); err != nil {
		t.Fatal(err)
	}
	if err := store.DeleteBoardColumn(custom.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := store.CreateTicket(models.CreateTicketRequest{ProjectID: project.ID, Title: "Orphan", Status: custom.ID}); err == nil {
		t.Fatal("tickets in a deleted column should be rejected")
	}
	if _, err := store.MoveTicket(ticket.ID, models.MoveTicketRequest{Status: "blocked"}); err != nil {
		t.Fatal(err)
	}
	if err := store.DeleteBoardColumn("todo"); err != nil {
		t.Fatal(err)
	}
	defaultTicket, err := store.CreateTicket(models.CreateTicketRequest{ProjectID: project.ID, Title: "New default"})
	if err != nil || defaultTicket.Status != "blocked" {
		t.Fatalf("default after deleting todo = %+v, err = %v", defaultTicket, err)
	}
}
