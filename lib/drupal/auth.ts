export function getDrupalAuthHeaders(): Record<string, string> | undefined {
  const jwt = process.env.DRUPAL_JWT_TOKEN
  if (jwt && jwt.trim() !== "") {
    return { Authorization: `Bearer ${jwt.trim()}` }
  }

  const username = process.env.DRUPAL_BASIC_USERNAME
  const password = process.env.DRUPAL_BASIC_PASSWORD
  if (username && password) {
    const token = Buffer.from(`${username}:${password}`).toString("base64")
    return { Authorization: `Basic ${token}` }
  }

  return undefined
}

