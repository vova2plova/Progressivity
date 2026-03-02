package domain

import "errors"

var (
	// User / Auth errors
	ErrUserNotFound       = errors.New("user not found")
	ErrUserAlreadyExists  = errors.New("user already exists")
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUnauthorized       = errors.New("unauthorized")
	ErrForbidden          = errors.New("forbidden")

	// Task errors
	ErrTaskNotFound      = errors.New("task not found")
	ErrInvalidTaskTarget = errors.New("invalid task target")
	ErrProgressNotFound  = errors.New("progress entry not found")
	ErrCannotAddProgress = errors.New("cannot add progress to container task")

	// General
	ErrInternalServerError = errors.New("internal server error")
	ErrValidation          = errors.New("validation error")
)
