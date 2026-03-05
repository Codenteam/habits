import smtplib
from email.mime.text import MIMEText

# Connect to Greenmail SMTP
server = smtplib.SMTP('localhost', 3025)

# Create a test email (important)
msg = MIMEText("This is an urgent security alert! Your account may have been compromised. Please take immediate action.")
msg['Subject'] = 'URGENT: Security Alert - Immediate Action Required'
msg['From'] = 'security@example.com'
msg['To'] = 'test@localhost'

# Send the email
server.send_message(msg)
print("Test email 1 (important) sent!")

# Send another email (semi-important)
msg2 = MIMEText("Meeting scheduled for tomorrow at 2pm to discuss Q1 results.")
msg2['Subject'] = 'Meeting Request: Q1 Review'
msg2['From'] = 'manager@example.com'
msg2['To'] = 'test@localhost'
server.send_message(msg2)
print("Test email 2 (semi-important) sent!")

server.quit()
print("Done!")
