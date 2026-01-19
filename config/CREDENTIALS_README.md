# Credential Management Guide

## Overview

StoryCore-Engine uses a secure credential management system to externalize sensitive information from code and configuration files. This guide explains how to set up and use credentials securely.

## Quick Start

### Option 1: Environment Variables (Recommended)

1. Copy the example environment file:
   ```bash
   cp config/.env.example config/.env
   ```

2. Edit `config/.env` and replace placeholder values with actual credentials:
   ```bash
   DATABASE_PASSWORD=your_actual_password
   JWT_SECRET=your_actual_jwt_secret
   STORYCORE_API_KEY=your_actual_api_key
   ```

3. Load environment variables before running the application:
   ```bash
   # On Linux/Mac
   source config/.env
   
   # On Windows (PowerShell)
   Get-Content config/.env | ForEach-Object {
       if ($_ -match '^([^=]+)=(.*)$') {
           [Environment]::SetEnvironmentVariable($matches[1], $matches[2])
       }
   }
   ```

### Option 2: Configuration File

1. Copy the example credentials file:
   ```bash
   cp config/credentials.json.example config/credentials.json
   ```

2. Edit `config/credentials.json` and replace placeholder values with actual credentials.

3. The application will automatically load credentials from this file.

## Security Best Practices

### DO:
- ✅ Use environment variables for production deployments
- ✅ Keep credential files outside version control (already in .gitignore)
- ✅ Use different credentials for development, staging, and production
- ✅ Rotate credentials regularly
- ✅ Use strong, randomly generated passwords and secrets
- ✅ Limit credential access to only those who need it

### DON'T:
- ❌ Commit credential files to version control
- ❌ Share credentials via email or chat
- ❌ Use the same credentials across environments
- ❌ Hardcode credentials in source code
- ❌ Use weak or default passwords
- ❌ Store credentials in plain text on shared systems

## Credential Types

### Database Credentials
- **DATABASE_PASSWORD**: PostgreSQL database password
- **DATABASE_URL**: Full database connection string (includes username and password)

### Application Secrets
- **JWT_SECRET**: Secret key for JWT token generation (minimum 32 characters)
- **STORYCORE_API_KEY**: API key for external service authentication

### Cloud Provider Credentials (Optional)
- **AWS_ACCESS_KEY_ID**: AWS access key for cloud services
- **AWS_SECRET_ACCESS_KEY**: AWS secret access key

## Using the Credential Manager

### Python Code Example

```python
from pathlib import Path
from src.credential_manager import CredentialManager

# Initialize credential manager
manager = CredentialManager(config_path=Path("config/credentials.json"))

# Register required credentials
manager.register_credential(
    name="database_password",
    env_var="DATABASE_PASSWORD",
    required=True,
    description="PostgreSQL database password"
)

# Load credentials
try:
    credentials = manager.load_credentials()
    db_password = manager.get("database_password")
except CredentialError as e:
    print(f"Credential error: {e}")
    exit(1)
```

### Generating Templates

Use the credential manager CLI to generate templates:

```bash
# Generate JSON template
python src/credential_manager.py generate config/credentials.json

# Validate existing config
python src/credential_manager.py validate config/credentials.json
```

## Scanning for Hardcoded Credentials

Use the credential scanner to detect hardcoded credentials in your codebase:

```bash
# Scan entire codebase
python src/credential_scanner.py .

# Scan specific directory
python src/credential_scanner.py src/

# Scan specific file
python src/credential_scanner.py config/production_config.yaml
```

## Troubleshooting

### Missing Credential Error

If you see an error like:
```
CredentialError: Required credentials are missing. Please provide them via environment variables or config file.
```

**Solution**: Ensure all required credentials are set in either:
1. Environment variables (check with `echo $CREDENTIAL_NAME`)
2. Configuration file (`config/credentials.json`)

### Invalid Configuration File

If you see an error about invalid JSON:
```
CredentialError: Invalid JSON in config file
```

**Solution**: Validate your JSON syntax using:
```bash
python src/credential_manager.py validate config/credentials.json
```

### Placeholder Values Detected

If validation warns about placeholder values:
```
Placeholder value detected for 'database_password': <DATABASE_PASSWORD_VALUE>
```

**Solution**: Replace all `<PLACEHOLDER_VALUE>` entries with actual credentials.

## Production Deployment

### Docker

Add credentials as environment variables in your Docker configuration:

```dockerfile
# Dockerfile
ENV DATABASE_PASSWORD=${DATABASE_PASSWORD}
ENV JWT_SECRET=${JWT_SECRET}
```

```bash
# docker-compose.yml
services:
  storycore:
    environment:
      - DATABASE_PASSWORD=${DATABASE_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
```

### Kubernetes

Use Kubernetes Secrets:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: storycore-credentials
type: Opaque
stringData:
  database-password: your_actual_password
  jwt-secret: your_actual_jwt_secret
```

### Cloud Providers

- **AWS**: Use AWS Secrets Manager or Parameter Store
- **Azure**: Use Azure Key Vault
- **GCP**: Use Google Secret Manager

## Support

For questions or issues with credential management:
1. Check this documentation
2. Review error messages carefully (they never expose credential values)
3. Validate your configuration with the credential manager CLI
4. Contact the development team

## Related Files

- `src/credential_scanner.py` - Scans for hardcoded credentials
- `src/credential_manager.py` - Manages secure credential loading
- `config/credentials.json.example` - Template for JSON configuration
- `config/.env.example` - Template for environment variables
- `.gitignore` - Ensures credential files are not committed
