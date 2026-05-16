```bash
# Stream live logs from the habits-hub systemd service inside the VM.
ssh -F ~/.lima/habits-hub/ssh.config lima-habits-hub "sudo journalctl -u habits-hub -f --no-pager"
```
