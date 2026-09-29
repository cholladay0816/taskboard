package server

import (
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"github.com/tcarac/taskboard/internal/db"
)

func TestBoardColumnAPIValidatesColorAndReorder(t *testing.T) {
	database, err := db.OpenAt(filepath.Join(t.TempDir(), "board.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()
	srv := New(db.NewStore(database), nil)

	request := func(method, url, body string, want int) {
		t.Helper()
		recorder := httptest.NewRecorder()
		srv.ServeHTTP(recorder, httptest.NewRequest(method, url, strings.NewReader(body)))
		if recorder.Code != want {
			t.Fatalf("%s %s returned %d, want %d: %s", method, url, recorder.Code, want, recorder.Body.String())
		}
	}
	request(http.MethodPut, "/api/board-columns/todo", `{"name":"Queue","color":"not-a-color"}`, http.StatusBadRequest)
	request(http.MethodPut, "/api/board-columns/todo", `{"name":"Queue","color":"#11aaCC"}`, http.StatusNoContent)
	request(http.MethodPost, "/api/board-columns/reorder", `{"ids":["todo","todo","blocked","done"]}`, http.StatusBadRequest)
	request(http.MethodPost, "/api/board-columns/reorder", `{"ids":["done","blocked","in_progress","todo"]}`, http.StatusNoContent)
	request(http.MethodGet, "/api/board", "", http.StatusOK)
}
