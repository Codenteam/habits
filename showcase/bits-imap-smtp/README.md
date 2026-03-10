To test this Workflow:
- Run the workflow using: pnpm nx cortex habits --config showcase/bits-imap-smtp/stack.yaml (or npx habits)
- send email using send-test-email.ts: npx tsx send-test-email.ts
- Check if the workflow sent using SMTP or not by checking the other server. 


