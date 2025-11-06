# Django API Documentation

## Base URL
`http://localhost:8000/api/`

## Authentication Endpoints

### Register User
- **POST** `/api/auth/register/`
- **Body**: 
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secure_password",
  "password_confirm": "secure_password",
  "first_name": "John",
  "last_name": "Doe"
}
```
- **Response**: JWT tokens + user data

### Login User
- **POST** `/api/auth/login/`
- **Body**:
```json
{
  "username": "john_doe",
  "password": "secure_password"
}
```
- **Response**: JWT tokens + user data

### Get Profile
- **GET** `/api/auth/profile/`
- **Headers**: `Authorization: Bearer <access_token>`
- **Response**: User profile data

### Update Profile
- **PUT** `/api/auth/profile/update/`
- **Headers**: `Authorization: Bearer <access_token>`
- **Body**: Updated user data

### Refresh Token
- **POST** `/api/auth/token/refresh/`
- **Body**:
```json
{
  "refresh": "<refresh_token>"
}
```

## Payment Endpoints

### Create Payment Intent
- **POST** `/api/payments/create-payment-intent/`
- **Headers**: `Authorization: Bearer <access_token>`
- **Body**:
```json
{
  "amount": 2000,
  "currency": "eur"
}
```
- **Response**: Stripe client_secret for frontend

### Confirm Payment
- **POST** `/api/payments/confirm-payment/`
- **Headers**: `Authorization: Bearer <access_token>`
- **Body**:
```json
{
  "payment_intent_id": "pi_xxx"
}
```

## React Integration Example

### API Service
```javascript
// api/auth.js
const API_BASE = 'http://localhost:8000/api';

export const authAPI = {
  register: async (userData) => {
    const response = await fetch(`${API_BASE}/auth/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return response.json();
  },
  
  login: async (credentials) => {
    const response = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    return response.json();
  },
  
  getProfile: async (token) => {
    const response = await fetch(`${API_BASE}/auth/profile/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    return response.json();
  }
};

export const paymentAPI = {
  createPaymentIntent: async (amount, token) => {
    const response = await fetch(`${API_BASE}/payments/create-payment-intent/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount })
    });
    return response.json();
  }
};
```

## Setup Instructions

1. **Start Django API**:
   ```bash
   cd django-backend
   python3 manage.py runserver 8000
   ```

2. **Start React Frontend**:
   ```bash
   npm run dev
   ```

3. **Configure Stripe**:
   - Add your Stripe keys to `settings.py`
   - Install Stripe Elements in React frontend

## Next Steps
- Add real Stripe keys
- Implement booking models
- Add email notifications
- Deploy to production