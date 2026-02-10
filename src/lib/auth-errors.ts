/**
 * Translates Supabase Auth error messages to friendly Spanish.
 */
const errorMap: Record<string, string> = {
    "Invalid login credentials": "Correo o contraseña incorrectos",
    "Email not confirmed": "El correo no ha sido confirmado",
    "User already registered": "Este correo ya está registrado",
    "Password should be at least 6 characters":
        "La contraseña debe tener al menos 6 caracteres",
    "Signup requires a valid password":
        "Se requiere una contraseña válida",
    "Unable to validate email address: invalid format":
        "Formato de correo electrónico inválido",
    "Email rate limit exceeded":
        "Demasiados intentos. Intenta de nuevo más tarde",
    "For security purposes, you can only request this after":
        "Por seguridad, debes esperar antes de intentar de nuevo",
    "New password should be different from the old password.":
        "La nueva contraseña debe ser diferente a la anterior",
    "User not found": "No se encontró una cuenta con este correo",
    "Email link is invalid or has expired":
        "El enlace ha expirado o es inválido",
    "Token has expired or is invalid":
        "La sesión ha expirado. Inicia sesión de nuevo",
    "Auth session missing!":
        "Sesión no encontrada. Inicia sesión de nuevo",
};

export function translateAuthError(message: string): string {
    // Check exact match first
    if (errorMap[message]) return errorMap[message];

    // Check partial match
    for (const [key, value] of Object.entries(errorMap)) {
        if (message.toLowerCase().includes(key.toLowerCase())) {
            return value;
        }
    }

    // Fallback
    return "Ocurrió un error. Intenta de nuevo.";
}
