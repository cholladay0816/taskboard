//go:build windows

package cli

import "os/exec"

func configureDaemonProcess(cmd *exec.Cmd) {
	// Windows does not provide the Unix setsid process attribute.
}
