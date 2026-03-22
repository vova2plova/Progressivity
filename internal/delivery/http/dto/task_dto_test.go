package dto

import (
	"testing"
	"time"
)

func TestCreateTaskRequest_ToDomainTask_AcceptsDateOnlyDeadline(t *testing.T) {
	deadline := "2026-03-22"

	task, err := (&CreateTaskRequest{
		Title:    "Read book",
		Deadline: &deadline,
	}).ToDomainTask()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if task.Deadline == nil {
		t.Fatal("expected deadline to be set")
	}

	expected := time.Date(2026, time.March, 22, 0, 0, 0, 0, time.UTC)
	if !task.Deadline.Equal(expected) {
		t.Fatalf("expected deadline %s, got %s", expected, task.Deadline)
	}
}

func TestCreateProgressRequest_ToDomainProgressEntry_AcceptsDateOnlyRecordedAt(t *testing.T) {
	recordedAt := "2026-03-22"

	entry, err := (&CreateProgressRequest{
		Value:      10,
		RecordedAt: &recordedAt,
	}).ToDomainProgressEntry()
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	expected := time.Date(2026, time.March, 22, 0, 0, 0, 0, time.UTC)
	if !entry.RecordedAt.Equal(expected) {
		t.Fatalf("expected recorded_at %s, got %s", expected, entry.RecordedAt)
	}
}

func TestCreateProgressRequest_ToDomainProgressEntry_RejectsInvalidRecordedAt(t *testing.T) {
	recordedAt := "22/03/2026"

	_, err := (&CreateProgressRequest{
		Value:      10,
		RecordedAt: &recordedAt,
	}).ToDomainProgressEntry()
	if err == nil {
		t.Fatal("expected an error for invalid recorded_at")
	}
}
