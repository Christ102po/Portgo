# PORTGO Semaphore OTP fix

This build adds better Semaphore diagnostics and error handling.

## Railway variables

Set these on the **PORTGO application service**, not on the MySQL service:

```env
SEMAPHORE_API_KEY=your_real_api_key
SEMAPHORE_SENDER_NAME=your_approved_sender_name
```

Paste values without wrapping quotes.

`SEMAPHORE_SENDER_NAME` must exactly match an active/approved Sender Name shown in your Semaphore account. If the account already has a default active Sender Name, the variable can be omitted, but setting it explicitly is recommended.

After saving the variables, redeploy the PORTGO service.

## What to check in Railway logs

At server startup this build performs a Semaphore account/configuration check without sending an SMS or consuming credits.

A working setup prints a line similar to:

```text
[Semaphore] Connected. Account status: Active; credits: 100; sender: PORTGO
```

If there is a problem, it prints:

```text
[Semaphore] Configuration problem: ...
```

When an OTP request fails, search the deployment logs for:

```text
[OTP][SMS FAILED]
```

The browser now also receives a more useful message for common API-key, Sender Name, credit, phone-number, and rate-limit problems.
