package db

import (
	"path/filepath"
	"testing"
	"time"

	"github.com/tcarac/taskboard/internal/models"
)

func TestArchiveCompletedTickets(t *testing.T) {
	database, err := OpenAt(filepath.Join(t.TempDir(), "tickets.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()
	store := NewStore(database)
	project, err := store.CreateProject(models.CreateProjectRequest{Name: "Test", Prefix: "TEST"})
	if err != nil {
		t.Fatal(err)
	}
	create := func(status string) *models.Ticket {
		t.Helper()
		ticket, err := store.CreateTicket(models.CreateTicketRequest{ProjectID: project.ID, Title: status, Status: status})
		if err != nil {
			t.Fatal(err)
		}
		return ticket
	}
	old := create("done")
	recent := create("done")
	exact := create("done")
	archived := create("done")
	open := create("todo")
	cutoff := time.Now().UTC().Add(-72 * time.Hour).Truncate(time.Second)
	for _, ticket := range []struct {
		id string
		at time.Time
	}{
		{old.ID, cutoff.Add(-time.Hour)},
		{recent.ID, cutoff.Add(time.Hour)},
		{exact.ID, cutoff},
		{archived.ID, cutoff.Add(-time.Hour)},
		{open.ID, cutoff.Add(-time.Hour)},
	} {
		if _, err := database.Exec("UPDATE tickets SET completed_at = ? WHERE id = ?", ticket.at, ticket.id); err != nil {
			t.Fatal(err)
		}
	}
	if err := store.ArchiveTicket(archived.ID); err != nil {
		t.Fatal(err)
	}

	count, err := store.ArchiveCompletedTickets(cutoff)
	if err != nil || count != 1 {
		t.Fatalf("archive count = %d, err = %v; want 1", count, err)
	}
	count, err = store.ArchiveCompletedTickets(cutoff)
	if err != nil || count != 0 {
		t.Fatalf("second archive count = %d, err = %v; want 0", count, err)
	}
	for _, ticket := range []struct {
		id       string
		archived bool
	}{
		{old.ID, true}, {recent.ID, false}, {exact.ID, false}, {archived.ID, true}, {open.ID, false},
	} {
		got, err := store.GetTicket(ticket.id)
		if err != nil || got == nil || got.Archived != ticket.archived {
			t.Fatalf("ticket %s: got %+v, err %v", ticket.id, got, err)
		}
	}
}

func TestCompletionTimeTracksStatusTransitions(t *testing.T) {
	database, err := OpenAt(filepath.Join(t.TempDir(), "tickets.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()
	store := NewStore(database)
	project, err := store.CreateProject(models.CreateProjectRequest{Name: "Test", Prefix: "TEST"})
	if err != nil {
		t.Fatal(err)
	}
	ticket, err := store.CreateTicket(models.CreateTicketRequest{ProjectID: project.ID, Title: "Task", Status: "done"})
	if err != nil || ticket.CompletedAt == nil {
		t.Fatalf("create done ticket: %+v, %v", ticket, err)
	}
	initial := *ticket.CompletedAt
	ticket, err = store.UpdateTicket(ticket.ID, models.UpdateTicketRequest{Title: ptr("Edited"), Status: ptr("done")})
	if err != nil || ticket.CompletedAt == nil || !ticket.CompletedAt.Equal(initial) {
		t.Fatalf("editing done ticket changed completion time: %+v, %v", ticket, err)
	}
	ticket, err = store.MoveTicket(ticket.ID, models.MoveTicketRequest{Status: "todo"})
	if err != nil || ticket.CompletedAt != nil {
		t.Fatalf("reopening should clear completion: %+v, %v", ticket, err)
	}
	ticket, err = store.MoveTicket(ticket.ID, models.MoveTicketRequest{Status: "done"})
	if err != nil || ticket.CompletedAt == nil || ticket.CompletedAt.Before(initial) {
		t.Fatalf("recompletion should set completion time: %+v, %v", ticket, err)
	}
	ticket, err = store.UpdateTicket(ticket.ID, models.UpdateTicketRequest{Status: ptr("blocked")})
	if err != nil || ticket.CompletedAt != nil {
		t.Fatalf("update away from done should clear completion: %+v, %v", ticket, err)
	}
}

func ptr(s string) *string { return &s }
