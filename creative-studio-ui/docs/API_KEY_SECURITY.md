# API Key Security Considerations

## Overview

This document outlines the security measures implemented in the Creative Studio UI for protecting LLM API keys, along with important security considerations and best practices.

## Table of Contents

1. [Security Architecture](#security-architecture)
2. [Encryption Implementation](#encryption-implementation)
3. [Security Limitations](#security-limitations)
4. [Best Practices](#best-practices)
5. [Threat Model](#threat-model)
6. [Incident Response](#incident-response)
7. [Compliance Considerations](#compliance-considerations)

## Security Architecture

### Multi-Layer Protection

The Creative Studio UI implements a defense-in-depth approach to API key security:

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│  • Masked display (••••••••1234)                        │
│  • No plain-text in DOM                                 │
│  • No console logging                                   │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                  Application Layer                       │
│  • In-memory encryption/decryption                      │
│  • Session-based encryption keys                        │
│  • Automatic key cleanup                                │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                   Storage Layer                          │
│  • AES-GCM 256-bit encryption                           │
│  • Encrypted localStorage                               │
│  • Session-specific keys in sessionStorage              │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│                 Transmission Layer                       │
│  • HTTPS only                                           │
│  • Direct provider communication                        │
│  • No third-party intermediaries                        │
└─────────────────────────────────────────────────────────┘
```

### Security Components

1. **Encryption Module** (`llmConfigStorage.ts`)
   - Implements Web Crypto API for encryption
   - Manages encryption key lifecycle
   - Handles secure key derivation

2. **Configuration Dialog** (`LLMConfigDialog.tsx`)
   - Masks API key input
   - Validates before storage
   - Provides security warnings

3. **LLM Service** (`llmService.ts`)
   - Secure API key transmission
   - HTTPS enforcement
   - Error handling without key exposure

## Encryption Implementation

### Algorithm: AES-GCM

**Why AES-GCM?**
- Industry-standard authenticated encryption
- Built into Web Crypto API (no external dependencies)
- Provides both confidentiality and integrity
- Resistant to tampering and forgery attacks

**Parameters:**
- **Key Length**: 256 bits (maximum security)
- **IV Length**: 12 bytes (96 bits, recommended for GCM)
- **Tag Length**: 128 bits (default, provides strong authentication)

### Encryption Process

```typescript
// 1. Generate or retrieve session-specific encryption key
const key = await getEncryptionKey();

// 2. Generate random initialization vector (IV)
const iv = crypto.getRandomValues(new Uint8Array(12));

// 3. Encrypt API key
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv },
  key,
  apiKeyData
);

// 4. Combine IV and encrypted data for storage
const combined = iv + encrypted;

// 5. Encode as base64 for localStorage
const stored = base64Encode(combined);
```

### Key Management

**Session-Based Keys:**
- Encryption keys are generated per browser session
- Keys stored in sessionStorage (cleared on tab close)
- New session = new encryption key = re-encryption required

**Key Derivation:**
- Keys generated using `crypto.subtle.generateKey()`
- Exported as JWK for session storage
- Re-imported on each encryption/decryption operation

**Key Lifecycle:**
```
Session Start → Generate Key → Store in sessionStorage
                      ↓
              Use for Encrypt/Decrypt
                      ↓
Session End → Clear sessionStorage → Key Lost
```

### Decryption Process

```typescript
// 1. Retrieve session encryption key
const key = await getEncryptionKey();

// 2. Decode from base64
const combined = base64Decode(stored);

// 3. Split IV and encrypted data
const iv = combined.slice(0, 12);
const encrypted = combined.slice(12);

// 4. Decrypt API key
const decrypted = await crypto.subtle.decrypt(
  { name: 'AES-GCM', iv },
  key,
  encrypted
);

// 5. Convert to string
const apiKey = textDecode(decrypted);
```

## Security Limitations

### Browser Storage Vulnerabilities

**localStorage is NOT secure storage:**

1. **Physical Access**
   - Anyone with physical access to the computer can access localStorage
   - Browser developer tools can view all localStorage data
   - No OS-level access controls

2. **Cross-Site Scripting (XSS)**
   - XSS attacks can read localStorage
   - Malicious scripts can access encrypted data
   - Encryption provides limited protection if attacker has session access

3. **Browser Extensions**
   - Extensions can access localStorage of any page
   - Malicious extensions can steal encrypted keys
   - Users often install extensions without security review

4. **Shared Computers**
   - Multiple users on same computer can access each other's data
   - Browser profiles provide limited isolation
   - Incognito mode doesn't persist data but doesn't prevent access

### Encryption Limitations

**Session-Based Keys:**
- Keys stored in sessionStorage (also accessible via XSS)
- Closing tab clears keys but doesn't delete encrypted data
- Re-opening requires re-encryption with new key

**No Hardware Security:**
- No TPM or secure enclave integration
- Keys stored in browser memory (can be dumped)
- No protection against memory inspection

**Limited Threat Protection:**
- Protects against: Casual browsing of localStorage
- Does NOT protect against: Determined attackers, XSS, malicious extensions

### Network Security

**HTTPS Dependency:**
- All security depends on HTTPS
- Man-in-the-middle attacks can intercept keys
- Certificate validation is critical

**Provider Security:**
- API keys transmitted to providers
- Provider security is outside our control
- Provider breaches could expose keys

## Best Practices

### For Users

**API Key Management:**
1. ✅ Use API keys with minimal required permissions
2. ✅ Create separate keys for different applications
3. ✅ Rotate keys regularly (monthly recommended)
4. ✅ Monitor API usage for anomalies
5. ✅ Revoke keys immediately if compromised

**Browser Security:**
1. ✅ Keep browser updated to latest version
2. ✅ Use reputable browser extensions only
3. ✅ Clear browser data on shared computers
4. ✅ Use private browsing for sensitive work
5. ✅ Enable browser security features

**Physical Security:**
1. ✅ Lock computer when away
2. ✅ Use full-disk encryption
3. ✅ Don't use on public/shared computers
4. ✅ Log out of browser when done
5. ✅ Use strong OS passwords

### For Developers

**Code Security:**
1. ✅ Never log API keys (even encrypted)
2. ✅ Validate all inputs before encryption
3. ✅ Use constant-time comparison for keys
4. ✅ Clear sensitive data from memory
5. ✅ Implement Content Security Policy (CSP)

**Error Handling:**
1. ✅ Generic error messages (no key exposure)
2. ✅ Log errors without sensitive data
3. ✅ Fail securely (deny by default)
4. ✅ Validate encryption/decryption success
5. ✅ Handle edge cases gracefully

**Testing:**
1. ✅ Test encryption/decryption round-trips
2. ✅ Verify key masking in UI
3. ✅ Check for key leaks in logs
4. ✅ Test session key lifecycle
5. ✅ Validate error handling

### For Organizations

**Production Deployment:**
1. ✅ Implement server-side key management
2. ✅ Use secure token exchange
3. ✅ Implement rate limiting
4. ✅ Monitor API usage
5. ✅ Audit access logs

**Security Policies:**
1. ✅ Require key rotation
2. ✅ Enforce least privilege
3. ✅ Implement access controls
4. ✅ Conduct security training
5. ✅ Perform regular audits

## Threat Model

### Threats We Protect Against

✅ **Casual Browsing**
- Threat: User accidentally views localStorage
- Protection: Encryption prevents reading plain-text keys

✅ **Accidental Exposure**
- Threat: Keys visible in UI or logs
- Protection: Masking and no logging

✅ **Session Hijacking (Partial)**
- Threat: Attacker gains access after session ends
- Protection: Session-based keys prevent decryption

### Threats We DON'T Fully Protect Against

❌ **Determined Attacker with Physical Access**
- Can access browser memory, dump keys
- Can install keyloggers or screen capture
- Can access localStorage and sessionStorage

❌ **Cross-Site Scripting (XSS)**
- Can read localStorage and sessionStorage
- Can intercept API calls
- Can steal keys in memory

❌ **Malicious Browser Extensions**
- Can access all browser storage
- Can intercept network requests
- Can modify page content

❌ **Compromised Browser**
- Can access all data
- Can intercept all operations
- Can bypass all protections

### Risk Assessment

| Threat | Likelihood | Impact | Mitigation |
|--------|-----------|--------|------------|
| Casual browsing | High | Low | Encryption |
| Accidental exposure | Medium | Medium | Masking |
| XSS attack | Low | High | CSP, input validation |
| Malicious extension | Low | High | User education |
| Physical access | Medium | High | OS security |
| Provider breach | Low | Critical | Key rotation |

## Incident Response

### If API Key is Compromised

**Immediate Actions (within 1 hour):**

1. **Revoke the compromised key**
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/settings/keys
   - Custom: Contact your provider

2. **Generate new API key**
   - Use different key name
   - Set appropriate permissions
   - Document creation date

3. **Update application**
   - Enter new key in configuration
   - Verify connection works
   - Test functionality

4. **Clear browser storage**
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

**Follow-up Actions (within 24 hours):**

5. **Review API usage logs**
   - Check for unauthorized usage
   - Identify suspicious patterns
   - Document findings

6. **Assess impact**
   - Calculate unauthorized usage
   - Identify affected resources
   - Estimate costs

7. **Update security**
   - Change related passwords
   - Review access controls
   - Update security policies

8. **Document incident**
   - Record timeline
   - Document actions taken
   - Note lessons learned

### Monitoring for Compromise

**Warning Signs:**
- Unexpected API usage spikes
- API calls from unknown IPs
- Unusual error rates
- Account balance changes
- Provider security alerts

**Monitoring Tools:**
- Provider dashboards
- Usage analytics
- Cost alerts
- Security notifications
- Access logs

## Compliance Considerations

### Data Protection Regulations

**GDPR (EU):**
- API keys may contain personal data
- Users have right to deletion
- Implement data minimization
- Document processing activities

**CCPA (California):**
- Users have right to know what data is stored
- Users can request deletion
- Implement opt-out mechanisms
- Maintain privacy policy

**SOC 2:**
- Document security controls
- Implement access logging
- Conduct regular audits
- Maintain security policies

### Industry Standards

**OWASP Top 10:**
- Protect against injection attacks
- Implement authentication
- Secure sensitive data
- Use security logging
- Implement access controls

**NIST Cybersecurity Framework:**
- Identify assets and risks
- Protect sensitive data
- Detect security events
- Respond to incidents
- Recover from breaches

### Recommendations for Compliance

1. **Document everything**
   - Security architecture
   - Encryption methods
   - Key management
   - Incident response

2. **Implement logging**
   - Access attempts
   - Configuration changes
   - Error events
   - Security incidents

3. **Regular audits**
   - Code reviews
   - Security assessments
   - Penetration testing
   - Compliance checks

4. **User transparency**
   - Privacy policy
   - Security documentation
   - Data handling practices
   - User rights

## Conclusion

The Creative Studio UI implements reasonable security measures for protecting API keys in a browser-based application. However, browser storage has inherent limitations that cannot be fully overcome with client-side encryption alone.

**For Development/Personal Use:**
The current implementation provides adequate protection against casual threats and accidental exposure.

**For Production/Enterprise Use:**
Consider implementing server-side API key management with secure token exchange to provide stronger security guarantees.

**Remember:**
- No client-side storage is truly secure
- Defense in depth is essential
- User education is critical
- Regular monitoring is necessary
- Incident response planning is vital

---

**Last Updated:** January 2026  
**Version:** 1.0.0  
**Security Contact:** security@storycore-engine.com
