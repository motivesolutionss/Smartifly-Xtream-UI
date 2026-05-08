package com.smartifly.tv.domain.model

sealed class AuthLoginException(
    override val message: String,
    open val retryableTransport: Boolean = false,
) : Exception(message)

class NoPortalSelectedAuthException :
    AuthLoginException("Select a service first.")

class InvalidCredentialsAuthException :
    AuthLoginException("Username or password is incorrect.")

class ServiceUnavailableAuthException(
    override val retryableTransport: Boolean = false,
) : AuthLoginException(
    message = "Selected service is unavailable right now.",
    retryableTransport = retryableTransport,
)

class AuthTimeoutException :
    AuthLoginException(
        message = "Connection to the selected service timed out.",
        retryableTransport = true,
    )

class MalformedXtreamResponseAuthException :
    AuthLoginException("The selected service returned an invalid response.")
