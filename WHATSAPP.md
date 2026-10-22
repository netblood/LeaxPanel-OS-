# WHATSAPP.md

# WhatsApp Instance Management

LeaxPanel provides management of WhatsApp Business API instances for customer communication.

## WhatsApp Business API

LeaxPanel integrates with the official WhatsApp Business API to manage WhatsApp instances.

### Configuration

Go to **WhatsApp → Instances** in the dashboard to:

1. **Create new instance** - Set up a new WhatsApp Business API instance
2. **Configure template messages** - Define message templates for approval
3. **Manage contacts** - Import and organize customer contacts
4. **Set up automated responses** - Away messages, quick replies
5. **Monitor conversations** - View conversation history and status

### Instance Settings

| Setting | Description |
| --- | --- |
| **Instance Name** | Human-readable name for the instance |
| **Phone Number** | WhatsApp Business registered phone number |
| **API Token** | WhatsApp Business API access token |
| **Webhook URL** | LeaxPanel webhook for receiving webhook events |
| **Status** | Online/Offline/Error status indicator |
| **Last Seen** | Timestamp of last WhatsApp connection |

### Message Templates

Create and manage message templates for:

- **Business verification** - Required by WhatsApp
- **Customer support** - Automated responses
- **Marketing messages** - Promotional content (with opt-in)
- **Notifications** - Order updates, appointment reminders

Each template must be submitted to WhatsApp for approval before use.

### Managing Contacts

- Import contacts from CSV
- Tag contacts for segmentation
- Set contact preferences (opt-in/opt-out)
- View contact engagement history

### Broadcast Messages

Send messages to multiple contacts simultaneously:

- **Segmented broadcasts** - Target by tags, labels, or status
- **Scheduled broadcasts** - Send at optimal times
- **Template-based** - Use approved message templates

## WhatsApp API Endpoints (via LeaxPanel API)

| Endpoint | Description |
| --- | --- |
| `GET /api/whatsapp/instances` | List WhatsApp instances |
| `POST /api/whatsapp/instances` | Create new instance |
| `GET /api/whatsapp/instances/:id` | Get instance details |
| `PUT /api/whatsapp/instances/:id` | Update instance |
| `POST /api/whatsapp/instances/:id/connect` | Connect instance |
| `POST /api/whatsapp/instances/:id/disconnect` | Disconnect instance |
| `POST /api/whatsapp/instances/:id/send-message` | Send message |
| `GET /api/whatsapp/messages` | List messages |
| `POST /api/whatsapp/messages` | Send new message |

See [API.md](API.md) for full documentation.

## Troubleshooting

| Issue | Solution |
| --- | --- |
| `Instance not connecting` | Verify API token, check phone number format, ensure webhook is configured |
| `Message send failed` | Check template approval, recipient opt-in status, message format |
| `Webhook not receiving` | Verify webhook URL, check firewall, validate signature |
| `Rate limit exceeded` | Reduce message frequency, upgrade WhatsApp tier |
| `Phone number not verified` | Complete WhatsApp Business API verification process |

## Best Practices

1. **Always obtain opt-in** before sending marketing messages
2. **Respect message templates** - Only use approved templates
3. **Monitor delivery rates** - Track message delivery and read receipts
4. **Keep templates updated** - Submit for approval before expiration
5. **Provide opt-out option** - Allow users to unsubscribe at any time

## Security

- API tokens are encrypted at rest
- Webhook signatures are validated
- All communications logged to `audit_logs`
- Rate limiting per instance
- No raw phone numbers stored longer than 30 days

---

## API Usage Examples

### Create WhatsApp Instance

```bash
curl -X POST http://localhost:3000/api/whatsapp/instances \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support",
    "phone_number": "+1234567890",
    "api_token": "your_whatsapp_api_token"
  }'
```

### Send Message

```bash
curl -X POST http://localhost:3000/api/whatsapp/instances/:id/send-message \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1234567890",
    "template_name": "hello_template",
    "context": {"name": "Customer"}
  }'
```