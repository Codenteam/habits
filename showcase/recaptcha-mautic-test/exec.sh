# Run the workflow through executer.ts and config.json with hot reload
npx tsx watch --include "test/recaptcha-mautic-test/**/*" src/executer.ts server --config test/recaptcha-mautic-test/config.json