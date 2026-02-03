# Feedback Proxy Backend - Quick Start Guide

This guide will help you get the Feedback Proxy backend up and running in 5 minutes.

## Prerequisites

- Python 3.9 or higher
- pip (Python package manager)
- GitHub account (for creating API token)

## Step 1: Install Dependencies

All required dependencies are already in the main `requirements.txt`. If you haven't installed them yet:

```bash
# From the project root
pip install -r requirements.txt
```

The key dependencies for the backend are:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `pydantic-settings` - Configuration management

## Step 2: Create GitHub API Token

1. Go to https://github.com/settings/tokens
2. Click **"Generate new token (classic)"**
3. Give it a descriptive name (e.g., "StoryCore Feedback Proxy")
4. Select the **`repo`** scope (required for creating issues)
5. Click **"Generate token"**
6. **Copy the token** (you won't be able to see it again!)

## Step 3: Configure Environment Variables

```bash
# Navigate to backend directory
cd backend

# Copy the example environment file
cp .env.example .env

# Edit .env and add your GitHub token
# On Windows: notepad .env
# On Mac/Linux: nano .env
```

Edit the `.env` file and replace `your_github_token_here` with your actual token:

```bash
GITHUB_API_TOKEN=ghp_your_actual_token_here
```

## Step 4: Start the Server

### Option A: Using the convenience script (recommended)

```bash
# From the project root
python backend/start_server.py
```

### Option B: Using uvicorn directly

```bash
# From the project root
uvicorn backend.feedback_proxy:app --reload --host 0.0.0.0 --port 8000
```

### Option C: Using the Python module

```bash
# From the project root
python -m backend.feedback_proxy
```

## Step 5: Verify It's Working

### Test 1: Check the health endpoint

Open your browser and go to:
```
http://localhost:8000/health
```

You should see:
```json
{
  "status": "healthy",
  "service": "StoryCore-Engine Feedback Proxy",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000000"
}
```

### Test 2: View the API documentation

Open your browser and go to:
```
http://localhost:8000/docs
```

You'll see the interactive Swagger UI where you can test the API.

### Test 3: Run the connection test script

```bash
# From the project root
python backend/test_connection.py
```

This will run automated tests to verify the server is working correctly.

## What's Next?

The backend is now running and ready to receive feedback submissions! Here's what you can do:

1. **Integrate with the UI**: Update the Creative Studio UI to point to `http://localhost:8000/api/v1/report`

2. **Test the API**: Use the Swagger UI at `http://localhost:8000/docs` to test report submissions

3. **Monitor logs**: The server logs all requests and errors to the console

4. **Deploy to production**: See the main README.md for production deployment instructions

## Troubleshooting

### "GITHUB_API_TOKEN not configured" warning

**Solution**: Make sure you created the `.env` file in the `backend/` directory with your GitHub token.

### Port 8000 already in use

**Solution**: Use a different port:
```bash
python backend/start_server.py --port 8001
```

### CORS errors in browser

**Solution**: Add your UI's origin to the `CORS_ORIGINS` in `.env`:
```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:5173,http://your-ui-origin
```

### Module import errors

**Solution**: Make sure you're running commands from the project root, not from inside the `backend/` directory.

## Development Tips

### Auto-reload is enabled by default

When you make changes to the code, the server will automatically restart. You'll see:
```
INFO:     Detected file change, reloading...
```

### View detailed logs

The server logs all requests, errors, and important events. Watch the console output for debugging.

### Test with curl

```bash
# Test health endpoint
curl http://localhost:8000/health

# Test report submission (create test_payload.json first)
curl -X POST http://localhost:8000/api/v1/report \
  -H "Content-Type: application/json" \
  -d @test_payload.json
```

## Configuration Options

All configuration is done via environment variables in `.env`:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GITHUB_API_TOKEN` | **Yes** | - | Your GitHub personal access token |
| `CORS_ORIGINS` | No | `http://localhost:3000,http://localhost:5173` | Allowed CORS origins (comma-separated) |
| `RATE_LIMIT_THRESHOLD` | No | `10` | Max requests per IP per hour |
| `MAX_PAYLOAD_SIZE_MB` | No | `10` | Maximum payload size in MB |
| `GITHUB_REPO_OWNER` | No | `zedarvates` | GitHub repository owner |
| `GITHUB_REPO_NAME` | No | `StoryCore-Engine` | GitHub repository name |

## Next Steps in Development

This is Phase 3, Task 13.1. The following tasks will add more functionality:

- **Task 13.2**: Complete the `/report` endpoint implementation
- **Task 14.1**: Add JSON schema validation
- **Task 15.1**: Implement GitHub API integration
- **Task 16.1**: Add rate limiting

For now, the server returns mock responses, but the infrastructure is ready for the full implementation.

## Need Help?

- Check the main `README.md` in the `backend/` directory for detailed documentation
- Review the API documentation at `http://localhost:8000/docs`
- Check the logs for error messages
- Refer to the design document at `.kiro/specs/feedback-diagnostics/design.md`

---

**Congratulations!** Your Feedback Proxy backend is now running. 🎉
