sequenceDiagram
    participant U as Utilisateur
    participant C as Checkout
    participant S as Stripe
    participant B as Backend
    participant D as Database
    participant N as Notification Service
    
    U->+C: Click on Upgrade
    C->+U: Show Checkout Form
    U->+C: Fill Payment Details
    C->+S: Create Payment Intent
    S->+C: Return Client Secret
    C->+U: Confirm Payment
    U->+C: Confirm Payment
    C->+S: Confirm Payment
    S->+C: Payment Succeeded
    C->+B: Webhook Payment Succeeded
    
    Note over B: Validate Payment Intent
    B->+D: Create/Update Subscription
    B->+D: Create ApiKey with permissions
    B->+D: Update User subscription status
    
    B->+N: Send Welcome Email
    B->+N: Send Subscription Confirmation
    
    N->+U: Send Welcome Email
    N->+U: Send Subscription Confirmation
    
    B->+C: Update UI with success
    C->+U: Show Success Message
    
    Note over U: User can now access features
    U->+API: Make API Calls
    API->+Rate Limiter: Check Rate Limit
    Rate Limiter->+API: Allow/Deny
    API->+U: Return Response
    
    loop Every Billing Cycle
        B->+S: Create Invoice
        S->+B: Invoice Created
        B->+B: Process Invoice
        B->+D: Update Subscription Status
        B->+N: Send Invoice Email
        N->+U: Send Invoice Email
    end
    
    loop On Subscription Change
        U->+C: Request Upgrade/Downgrade
        C->+B: Process Subscription Change
        B->+D: Update Subscription
        B->+D: Update ApiKey Permissions
        B->+N: Send Change Confirmation
        N->+U: Send Change Confirmation
    end