#!/bin/bash
#
# Habits Installation Script
# https://codenteam.com/intersect/habits
#
# Usage:
#   Install:
#     curl -o- https://codenteam.com/intersect/habits/install.sh | bash
#   
#   Uninstall:
#     curl -o- https://codenteam.com/intersect/habits/install.sh | bash -s -- --uninstall
#
# This script:
#   1. Checks if Node.js and npm are installed
#   2. Offers to install Node.js if missing
#   3. Installs the 'habits' package globally
#   4. Verifies the installation
#

set -e

# Check for uninstall flag
UNINSTALL=false
for arg in "$@"; do
    case $arg in
        --uninstall|-u)
            UNINSTALL=true
            shift
            ;;
    esac
done

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Minimum Node.js version required
MIN_NODE_VERSION="18.0.0"

# Package name
PACKAGE_NAME="habits"

print_banner() {
    echo -e "${CYAN}"
    echo "  _    _       _     _ _       "
    echo " | |  | |     | |   (_) |      "
    echo " | |__| | __ _| |__  _| |_ ___ "
    echo " |  __  |/ _\` | '_ \\| | __/ __|"
    echo " | |  | | (_| | |_) | | |_\\__ \\"
    echo " |_|  |_|\\__,_|_.__/|_|\\__|___/"
    echo -e "${NC}"
    echo -e "${BOLD}Lightweight Automation Runner and Builder${NC}"
    echo -e "AGPL-3.0 Licensed | https://codenteam.com/intersect/habits"
    echo ""
}

print_step() {
    echo -e "${BLUE}==>${NC} ${BOLD}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     OS="linux";;
        Darwin*)    OS="macos";;
        CYGWIN*|MINGW*|MSYS*) OS="windows";;
        *)          OS="unknown";;
    esac
    echo "$OS"
}

# Detect package manager (for Linux)
detect_package_manager() {
    if command -v apt-get &> /dev/null; then
        echo "apt"
    elif command -v dnf &> /dev/null; then
        echo "dnf"
    elif command -v yum &> /dev/null; then
        echo "yum"
    elif command -v pacman &> /dev/null; then
        echo "pacman"
    elif command -v apk &> /dev/null; then
        echo "apk"
    elif command -v zypper &> /dev/null; then
        echo "zypper"
    else
        echo "unknown"
    fi
}

# Compare versions: returns 0 if $1 >= $2
version_gte() {
    [ "$(printf '%s\n' "$2" "$1" | sort -V | head -n1)" = "$2" ]
}

# Check if Node.js is installed and meets version requirements
check_node() {
    if ! command -v node &> /dev/null; then
        return 1
    fi
    
    local node_version
    node_version=$(node -v | sed 's/v//')
    
    if version_gte "$node_version" "$MIN_NODE_VERSION"; then
        return 0
    else
        return 2
    fi
}

# Check if npm is installed
check_npm() {
    command -v npm &> /dev/null
}

# Install Node.js based on OS
install_nodejs() {
    local os
    os=$(detect_os)
    
    print_step "Installing Node.js..."
    
    case "$os" in
        macos)
            if command -v brew &> /dev/null; then
                print_step "Installing via Homebrew..."
                brew install node
            else
                print_warning "Homebrew not found. Installing via official installer..."
                install_nodejs_nvm
            fi
            ;;
        linux)
            local pkg_manager
            pkg_manager=$(detect_package_manager)
            
            case "$pkg_manager" in
                apt)
                    print_step "Installing via apt (NodeSource)..."
                    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
                    sudo apt-get install -y nodejs
                    ;;
                dnf|yum)
                    print_step "Installing via NodeSource..."
                    curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
                    sudo $pkg_manager install -y nodejs
                    ;;
                pacman)
                    print_step "Installing via pacman..."
                    sudo pacman -S --noconfirm nodejs npm
                    ;;
                apk)
                    print_step "Installing via apk..."
                    sudo apk add --no-cache nodejs npm
                    ;;
                zypper)
                    print_step "Installing via zypper..."
                    sudo zypper install -y nodejs npm
                    ;;
                *)
                    print_warning "Unknown package manager. Falling back to nvm..."
                    install_nodejs_nvm
                    ;;
            esac
            ;;
        windows)
            print_error "Windows detected. Please install Node.js manually from:"
            echo "    https://nodejs.org/en/download/"
            echo ""
            echo "After installation, re-run this script."
            exit 1
            ;;
        *)
            print_warning "Unknown OS. Attempting nvm installation..."
            install_nodejs_nvm
            ;;
    esac
}

# Install Node.js via nvm (fallback method)
install_nodejs_nvm() {
    print_step "Installing Node.js via nvm..."
    
    # Install nvm
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    
    # Load nvm
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    
    # Install latest LTS
    nvm install --lts
    nvm use --lts
    
    print_success "Node.js installed via nvm"
    print_warning "You may need to restart your terminal or run:"
    echo "    source ~/.bashrc  # or ~/.zshrc"
}

# Install habits package
install_habits() {
    print_step "Installing habits package globally..."
    
    # Use npm to install globally
    npm install -g "$PACKAGE_NAME@latest"
    
    print_success "Habits installed successfully!"
}

# Verify installation
verify_installation() {
    print_step "Verifying installation..."
    
    if command -v habits &> /dev/null; then
        local version
        version=$(habits --version 2>/dev/null || echo "unknown")
        print_success "habits command is available (version: $version)"
        return 0
    else
        print_error "habits command not found in PATH"
        echo ""
        echo "This might happen if npm's global bin directory is not in your PATH."
        echo "Try adding this to your shell profile (~/.bashrc, ~/.zshrc, etc.):"
        echo ""
        
        local npm_bin
        npm_bin=$(npm bin -g 2>/dev/null || echo "\$(npm bin -g)")
        echo "    export PATH=\"\$PATH:$npm_bin\""
        echo ""
        echo "Then restart your terminal and run: habits --help"
        return 1
    fi
}

# Print usage instructions
print_usage() {
    echo ""
    echo -e "${BOLD}Getting Started:${NC}"
    echo ""
    echo "  Start the Base builder (visual workflow editor):"
    echo -e "    ${CYAN}habits base${NC}"
    echo ""
    echo "  Run a workflow with Cortex engine:"
    echo -e "    ${CYAN}habits cortex server --config ./stack.yaml${NC}"
    echo ""
    echo "  Get help:"
    echo -e "    ${CYAN}habits --help${NC}"
    echo ""
    echo -e "${BOLD}Documentation:${NC}"
    echo "  https://codenteam.com/intersect/habits/docs"
    echo ""
    echo -e "${BOLD}Examples:${NC}"
    echo "  https://github.com/codenteam/habits/tree/main/examples"
    echo ""
}

# Uninstall habits
uninstall_habits() {
    echo -e "${BOLD}Habits Uninstaller${NC}"
    echo ""
    
    # Check if habits is installed
    if ! command -v habits &> /dev/null; then
        print_warning "habits command not found - it may already be uninstalled"
        
        # Try to uninstall anyway via npm
        if command -v npm &> /dev/null; then
            print_step "Attempting to remove habits package..."
            npm uninstall -g habits 2>/dev/null || true
        fi
        
        print_success "Uninstallation complete"
        exit 0
    fi
    
    print_step "Found habits installation"
    
    # Get version before uninstalling
    local version
    version=$(habits --version 2>/dev/null || echo "unknown")
    echo "  Version: $version"
    
    # Uninstall
    print_step "Uninstalling habits..."
    npm uninstall -g habits
    
    # Verify removal
    if command -v habits &> /dev/null; then
        print_warning "habits command still exists - might be installed elsewhere"
    else
        print_success "habits successfully uninstalled"
    fi
    
    echo ""
    echo "Thank you for using Habits!"
    echo "Feedback: https://github.com/codenteam/habits/issues"
    exit 0
}

# Main installation flow
main() {
    # Handle uninstall
    if [ "$UNINSTALL" = true ]; then
        uninstall_habits
    fi
    
    print_banner
    
    local os
    os=$(detect_os)
    print_step "Detected OS: $os"
    
    # Check Node.js
    print_step "Checking Node.js installation..."
    
    local node_status
    check_node
    node_status=$?
    
    case $node_status in
        0)
            local node_version
            node_version=$(node -v)
            print_success "Node.js $node_version is installed"
            ;;
        1)
            print_warning "Node.js is not installed"
            echo ""
            read -p "Would you like to install Node.js? (y/N) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                install_nodejs
            else
                print_error "Node.js is required. Please install it manually from:"
                echo "    https://nodejs.org/en/download/"
                exit 1
            fi
            ;;
        2)
            local node_version
            node_version=$(node -v)
            print_warning "Node.js $node_version is installed but version $MIN_NODE_VERSION+ is required"
            echo ""
            read -p "Would you like to upgrade Node.js? (y/N) " -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                install_nodejs
            else
                print_error "Please upgrade Node.js to version $MIN_NODE_VERSION or higher"
                exit 1
            fi
            ;;
    esac
    
    # Check npm
    if ! check_npm; then
        print_error "npm is not installed (should come with Node.js)"
        exit 1
    fi
    print_success "npm is available"
    
    # Install habits
    echo ""
    install_habits
    
    # Verify
    echo ""
    if verify_installation; then
        print_usage
        echo -e "${GREEN}${BOLD}Installation complete!${NC} 🎉"
    else
        echo ""
        print_warning "Installation completed but habits command may not be in PATH yet."
        echo "Follow the instructions above to fix this."
    fi
}

# Handle non-interactive mode (piped input)
if [ ! -t 0 ]; then
    # Handle uninstall in non-interactive mode
    if [ "$UNINSTALL" = true ]; then
        uninstall_habits
    fi
    
    # Running from curl pipe - auto-install Node if missing
    check_node || {
        print_warning "Node.js not found. Attempting automatic installation..."
        install_nodejs
    }
    check_npm || {
        print_error "npm not found after Node.js installation"
        exit 1
    }
    install_habits
    verify_installation || true
    print_usage
    exit 0
fi

# Run main function for interactive mode
main "$@"
