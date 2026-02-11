# Security Policy

## Supported Versions

The following versions of StoryCore-Engine are currently supported with security updates:

| Version | Supported |
|---------|-----------|
| 1.0.x   | ✅ Yes    |
| < 1.0   | ❌ No     |

## Reporting a Vulnerability

### Responsible Disclosure

We take the security of StoryCore-Engine seriously. If you believe you have found a security vulnerability, please report it to us responsibly.

**Please do NOT report security vulnerabilities through public GitHub issues or discussions.**

### How to Report

1. **Email**: Send an email to the maintainers with a detailed description of the vulnerability
2. **GitHub Security Advisories**: Use [GitHub's Security Advisory](https://github.com/zedarvates/StoryCore-Engine/security/advisories) feature

### What to Include

When reporting a vulnerability, please include:

- Description of the vulnerability
- Steps to reproduce (if applicable)
- Potential impact
- Any known mitigations
- Your contact information (optional)

### Response Timeline

- **Acknowledgment**: Within 48 hours of receiving your report
- **Initial Assessment**: Within 5 business days
- **Resolution Timeline**: Depending on severity (see below)

### Severity Classification

| Severity | Response Time | Resolution Target |
|----------|---------------|-------------------|
| Critical (RCE, data breach) | 24 hours | 7 days |
| High | 48 hours | 14 days |
| Medium | 5 business days | 30 days |
| Low | 10 business days | 60 days |

## Security Best Practices

### For Users

1. **Keep Updated**: Always use the latest version of StoryCore-Engine
2. **Local Execution**: StoryCore runs locally - keep your machine secure
3. **API Keys**: Never commit API keys or secrets to version control
4. **Environment Variables**: Use `.env` files and add them to `.gitignore`

### For Contributors

1. **No Secrets in Code**: Use environment variables or configuration files
2. **Validate Inputs**: All user inputs must be validated and sanitized
3. **Use HTTPS**: All network requests should use secure connections
4. **Dependencies**: Keep dependencies updated and monitor for CVEs

## Dependencies Security

We use the following tools to monitor dependencies:

- **Python**: `pip-audit`, Dependabot
- **Node.js**: npm audit, Dependabot
- **GitHub**: Dependabot for automated security updates

## Architecture Security Considerations

### Data Privacy

- All processing happens locally on your machine
- No data is sent to external servers (except user-configured API services)
- Your scripts, images, and projects stay on your device

### Network Security

- ComfyUI and Ollama run locally
- WebSocket connections are local-only by default
- CORS should only be enabled when necessary

### Authentication

- JWT-based authentication for API endpoints
- Support for API keys
- Session management with secure cookies

## Related Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [GitHub Security Advisories](https://docs.github.com/en/security/dependabot/working-with-dependabot/configuring-dependabot-security-updates)
- [Python Security Best Practices](https://python-security.readthedocs.io/)

---

**Thank you for helping keep StoryCore-Engine and its users safe!**

