### Start Hub VM

```bash
# Create and provision the Lima VM (Ubuntu 22.04) for running Hub. Safe to re-run.
bash packages/manage/hub/vagrant/lima-up.sh
```

### Reprovision Hub VM

```bash
# Re-run install.sh on an existing VM (reinstalls Docker, Node.js, Caddy, systemd unit).
bash packages/manage/hub/vagrant/lima-up.sh --reprovision
```

### Stop Hub VM

```bash
# Stop the Lima VM (habits-hub) without deleting it.
bash packages/manage/hub/vagrant/lima-up.sh --stop
```

### Destroy Hub VM

```bash
# Permanently delete the Lima VM and all its data.
bash packages/manage/hub/vagrant/lima-up.sh --destroy
```

### Sync Hub to VM

```bash
# rsync Hub source to the Lima VM, build TypeScript, and restart the habits-hub service.
bash packages/manage/hub/vagrant/sync.sh
```

### Sync Hub to Remote Server

```bash
# rsync Hub source to any SSH host (e.g. root@1.2.3.4), build, and restart.
bash packages/manage/hub/vagrant/sync.sh {{sshTarget}}
```

### Sync Hub + Rebuild Admin

```bash
# Sync Hub source AND rebuild the habits-admin Docker image on the target.
bash packages/manage/hub/vagrant/sync.sh --rebuild-admin
```

### Setup Hub DNS (macOS)

```bash
# One-time macOS setup: installs dnsmasq and configures *.hub.codenteam.localhost to resolve to the Lima VM IP.
bash packages/manage/hub/vagrant/dns-setup.sh
```

### SSH into Hub VM

```bash
# Open an interactive shell inside the Lima VM.
limactl shell habits-hub
```

### View Hub Service Logs

```bash
# Stream live logs from the habits-hub systemd service inside the VM.
ssh -F ~/.lima/habits-hub/ssh.config lima-habits-hub "sudo journalctl -u habits-hub -f --no-pager"
```
