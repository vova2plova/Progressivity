package domain

// TaskWithProgress extends Task with recursively calculated progress fields.
type TaskWithProgress struct {
	Task
	Progress          float64
	CurrentValue      float64
	CompletedChildren int
	TotalChildren     int
	Children          []*TaskWithProgress
}

const maxProgressPercent = 100.0

// CalculateProgress recursively computes progress for the entire task tree.
//
// Rules:
//   - Leaf + target_value:  progress = currentValue / targetValue * 100
//   - Leaf binary (no target): progress = 100% if completed, 0% otherwise
//   - Container: progress = avg(children.progress)
func CalculateProgress(node *TaskWithProgress) {
	if len(node.Children) == 0 {
		// Leaf node
		if node.TargetValue != nil && *node.TargetValue > 0 {
			node.Progress = node.CurrentValue / *node.TargetValue * maxProgressPercent
			switch {
			case node.Progress > maxProgressPercent:
				node.Status = TaskStatusOvercompleted
			case node.Progress >= maxProgressPercent:
				node.Status = TaskStatusCompleted
			case node.Progress > 0:
				node.Status = TaskStatusInProgress
			}
		} else if node.Status == TaskStatusCompleted || node.Status == TaskStatusOvercompleted {
			node.Progress = maxProgressPercent
		}
		return
	}

	// Container node
	var sum float64
	var completed int
	for _, child := range node.Children {
		CalculateProgress(child)
		sum += child.Progress
		if child.Progress >= maxProgressPercent {
			completed++
		}
	}
	node.TotalChildren = len(node.Children)
	node.CompletedChildren = completed
	if node.TotalChildren > 0 {
		node.Progress = sum / float64(node.TotalChildren)
	}
}
