# Form Submission with reCAPTCHA and Mautic Integration Test

This test demonstrates a workflow for handling form submissions with reCAPTCHA verification and Mautic CRM integration.

## Overview

The workflow processes contact form submissions through the following steps:

1. **Webhook Trigger** - Receives form submissions via HTTP POST
2. **Input Validation** - Validates required fields (email, name, message) and reCAPTCHA token
3. **reCAPTCHA Verification** - Verifies the reCAPTCHA token using `n8n-nodes-recaptcha`
4. **Mautic Contact Creation** - Creates/updates contact in Mautic using `n8n-nodes-mautic-advanced`
5. **Tag Management** - Adds tags to the contact for segmentation
6. **Form Submission** - Submits data to a Mautic form
7. **Response** - Returns success/error response to the caller

## Required Modules

| Module | Source | Description |
|--------|--------|-------------|
| `n8n-nodes-recaptcha` | npm | reCAPTCHA verification node for n8n |
| `n8n-nodes-mautic-advanced` | npm | Enhanced Mautic node with comprehensive API coverage |

## Setup

### 1. Install Dependencies

```bash
# Install n8n-nodes-recaptcha
npm install n8n-nodes-recaptcha

# Install n8n-nodes-mautic-advanced
npm install n8n-nodes-mautic-advanced
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|----------|-------------|
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA secret key |
| `MAUTIC_API_URL` | Your Mautic instance URL |
| `MAUTIC_USERNAME` | Mautic API username |
| `MAUTIC_PASSWORD` | Mautic API password |
| `MAUTIC_FORM_ID` | ID of the Mautic form to submit to |

### 3. Configure reCAPTCHA

1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Create a new site (v2 or v3)
3. Copy the **Secret Key** to your `.env` file
4. Use the **Site Key** in your frontend form

### 4. Configure Mautic

1. Create a form in Mautic with fields:
   - `email` (Email field)
   - `firstname` (Text field)
   - `lastname` (Text field)
   - `message` (Textarea field)

2. Note the form ID from Mautic and add it to your `.env` file

## Workflow Structure

```
webhook_trigger
      │
      ▼
validate_input ────────────┐
      │                    │ (error)
      ▼                    ▼
recaptcha_verify      error_handler
      │
      ▼
recaptcha_success_check
      │         │
      │ (true)  │ (false)
      ▼         ▼
prepare_mautic_contact  recaptcha_failed_response
      │
      ▼
mautic_create_contact ─────┐
      │                    │ (error)
      ▼                    ▼
mautic_add_tags       error_handler
      │
      ▼
mautic_submit_form
      │
      ▼
success_response
```

## API Endpoints

### POST /form-submit

Submit a contact form.

**Request Body:**

```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "message": "Hello, I would like more information about your services.",
  "g-recaptcha-response": "03AGdBq24..."
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Form submitted successfully",
  "contactId": "12345"
}
```

**reCAPTCHA Failed Response (400):**

```json
{
  "success": false,
  "error": "reCAPTCHA verification failed",
  "message": "Please complete the reCAPTCHA challenge and try again"
}
```

**Error Response (500):**

```json
{
  "success": false,
  "error": "Internal server error",
  "message": "An error occurred while processing your request"
}
```

## Running Tests

```bash
# Run the test file
npx ts-node test-workflow.ts
```

The test will:
1. Validate the workflow structure
2. Check required modules are specified
3. Verify credential configurations
4. Validate node connections
5. Simulate a successful form submission
6. Test error handling for invalid inputs

## Frontend Integration Example

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://www.google.com/recaptcha/api.js" async defer></script>
</head>
<body>
  <form id="contactForm" action="/form-submit" method="POST">
    <input type="email" name="email" required placeholder="Email">
    <input type="text" name="name" required placeholder="Full Name">
    <textarea name="message" required placeholder="Your message"></textarea>
    
    <!-- reCAPTCHA widget -->
    <div class="g-recaptcha" data-sitekey="YOUR_SITE_KEY"></div>
    
    <button type="submit">Submit</button>
  </form>

  <script>
    document.getElementById('contactForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(e.target);
      
      try {
        const response = await fetch('/form-submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(Object.fromEntries(formData))
        });
        
        const result = await response.json();
        if (result.success) {
          alert('Thank you! Your message has been sent.');
        } else {
          alert('Error: ' + result.message);
        }
      } catch (error) {
        alert('Failed to submit form. Please try again.');
      }
    });
  </script>
</body>
</html>
```

## License

MIT
