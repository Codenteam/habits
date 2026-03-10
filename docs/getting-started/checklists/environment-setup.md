## <Icon name="wrench" /> Environment Setup Checklist

### Install Node Version Manager (nvm)
- [ ] **macOS/Linux:** Install nvm:  `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash`
- [ ] **Windows:** Use [nvm-windows](https://github.com/coreybutler/nvm-windows) or download Node.js directly from [nodejs.org](https://nodejs.org/)
- [ ] Restart terminal or run: `source ~/.bashrc` (or `~/.zshrc`)
- [ ] Verify nvm: `nvm --version`

### Install Node.js 24
- [ ] Install Node.js 24: `nvm install 24`
- [ ] Set as default: `nvm alias default 24`
- [ ] Verify Node.js: `node --version` (should show v24.x.x)
