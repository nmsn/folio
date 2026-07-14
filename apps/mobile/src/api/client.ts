import { ApiClient } from '@folio/api-client'

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000'

export const mobileClient = new ApiClient(API_BASE)
