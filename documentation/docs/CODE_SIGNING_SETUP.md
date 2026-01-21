# Code Signing Setup for Windows Executables

## Overview

This document provides instructions for setting up digital code signing for Windows executables built with electron-builder. Code signing enhances security and user trust by verifying the authenticity of the software.

## Prerequisites

- A valid code signing certificate from a trusted Certificate Authority (CA) like DigiCert, GlobalSign, or Comodo.
- The certificate should be in PFX/P12 format.
- Basic knowledge of environment variables and command-line tools.

## Certificate Setup

1. Obtain a code signing certificate:
   - Purchase from a trusted CA
   - Ensure it's valid for code signing (not just SSL)
   - Export to PFX/P12 format if not already

2. Store the certificate securely:
   - Save to a secure location on your build machine
   - Never commit certificates to version control

## Environment Variables

Set the following environment variables before building:

### Windows
- `CSC_LINK`: Path to your PFX/P12 certificate file
- `CSC_KEY_PASSWORD`: Password for the certificate

Example (PowerShell):
```powershell
$env:CSC_LINK = "C:\path\to\certificate.pfx"
$env:CSC_KEY_PASSWORD = "your_certificate_password"
```

Example (Command Prompt):
```cmd
set CSC_LINK=C:\path\to\certificate.pfx
set CSC_KEY_PASSWORD=your_certificate_password
```

### macOS
- `CSC_LINK`: Path to P12 certificate
- `CSC_KEY_PASSWORD`: Certificate password

### Linux
Code signing on Linux is not natively supported. Use Windows or macOS for signed builds.

## Building Signed Executables

1. Set the environment variables as described above.

2. Run the signed build script:
   ```bash
   npm run package:win:signed
   ```

   Or directly:
   ```bash
   electron-builder --win
   ```

## Best Practices

- SHA256 hashing is used for signing via signtool options
- Timestamps are applied using DigiCert's timestamp server
- Publisher name is automatically extracted from the certificate
- Always use the latest version of electron-builder for security

## Troubleshooting

- If signing fails, verify the certificate path and password
- Ensure the certificate is not expired
- Check that electron-builder has access to the certificate file
- For CI/CD, use secure environment variable storage

## Security Notes

- Never hardcode certificate passwords in scripts
- Store certificates in secure, access-controlled locations
- Rotate certificates regularly
- Use hardware security modules (HSM) for production environments

## Verification

After building, verify the signature:
1. Right-click the executable
2. Go to Properties > Digital Signatures
3. Check the certificate details and timestamp

This ensures your Windows executables are properly signed and trusted by users.