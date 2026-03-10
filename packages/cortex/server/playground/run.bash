# Run: bash packages/cortex/server/playground/run.bash -r
# Run with a different example: bash packages/cortex/server/playground/run.bash -r --config=--config ./showcase/marketing-campaign/config.json
# Run with a different example: bash packages/cortex/server/playground/run.bash --rebuild --config=--config ./showcase/marketing-campaign/config.json

# Possible examples: n8n-top-6

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Get the habits root directory (4 levels up from playground)
HABITS_ROOT="$(cd "$SCRIPT_DIR/../../../.." && pwd)"

# Default values
REBUILD=false
CONFIG="openai-output-test"
PRODUCTION=false

# Parse named arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -r|--rebuild)
      REBUILD=true
      shift
      ;;
    --rebuild=*)
      REBUILD="${1#*=}"
      shift
      ;;
    -c|--config)
      CONFIG="$2"
      shift 2
      ;;
    --config=*)
      CONFIG="${1#*=}"
      shift
      ;;
    -p|--production)
      PRODUCTION=true
      shift
      ;;
    -h|--help)
      echo "Usage: bash run.bash [options]"
      echo ""
      echo "Options:"
      echo "  -r, --rebuild        Rebuild the cortex package and Docker image"
      echo "  -c, --config=PATH    Specify the config file to run (default: openai-output-test)"
      echo "  -p, --production     Use published npm package instead of local build"
      echo "  -h, --help           Show this help message"
      echo ""
      echo "Examples:"
      echo "  bash run.bash -r"
      echo "  bash run.bash --config=<Path>"
      echo "  bash run.bash -r -c <Path>"
      echo "  bash run.bash -p --config=<Path>"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Rebuild if --rebuild flag is passed
if [[ "$REBUILD" == "true" ]]; then
  echo "🔨 Rebuilding cortex..."
  cd "$HABITS_ROOT"
  pnpm nx pack @ha-bits/cortex

  cd "$SCRIPT_DIR"
  docker build -t cortex-server .
  docker rm -f cortex-server-container 2>/dev/null || true

fi

# Start container if not running
if ! docker ps -q -f name=cortex-server-container | grep -q .; then
  docker rm -f cortex-server-container 2>/dev/null || true
  docker run -d --name cortex-server-container \
    -v "$SCRIPT_DIR/../examples:/app/examples" \
    -v "$HABITS_ROOT/dist/packages/cortex:/app/dist" \
    -p 13000:13000 \
    cortex-server
  echo "Container started"
else
  echo "Container already running"
fi

# Killall to free up port (if needed) - using different methods to ensure process is killed
# First try pkill for node processes, then try fuser, then lsof as fallback
docker exec cortex-server-container sh -c "pkill -f 'node.*server' 2>/dev/null || true"
docker exec cortex-server-container sh -c "fuser -k 13000/tcp 2>/dev/null || true"
docker exec cortex-server-container sh -c "kill -9 \$(lsof -ti:13000) 2>/dev/null || true"

# Small delay to ensure port is released
sleep 1

# Execute the command in the running container
if [[ "$PRODUCTION" == "true" ]]; then
  echo "🚀 Running in production mode (using published npm package)..."
  docker exec -it cortex-server-container npx --yes @ha-bits/cortex@latest server --config ${CONFIG}
else
  echo "🔧 Running in development mode (using local build)..."
  docker exec -it cortex-server-container npx /app/dist server --config ${CONFIG}
fi