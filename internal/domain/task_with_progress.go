package domain

type TaskWithProgress struct {
	Task
	Progress          float64
	CurrentValue      float64
	CompletedChildren int
	TotalChildren     int
	Children          []*TaskWithProgress
}
