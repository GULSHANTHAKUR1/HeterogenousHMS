import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Intercept requests to inject doctor authorization token and patient access grant
api.interceptors.request.use(
  (config) => {
    // 1. Doctor authentication token (Bearer)
    const token = localStorage.getItem('hms_doctor_token');
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 2. Patient access grant token
    // If the request targets a patient route, automatically resolve and inject patient grant token
    const patientMatch = config.url && config.url.match(/patients\/([^/?#]+)/i);
    if (patientMatch) {
      const targetPid = decodeURIComponent(patientMatch[1]).trim().toUpperCase();
      const grantToken =
        sessionStorage.getItem(`hms_grant_${targetPid}`) ||
        sessionStorage.getItem('current_grant_token');
      if (grantToken && !config.headers['x-patient-grant-token']) {
        config.headers['x-patient-grant-token'] = grantToken;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept responses for centralized error handling
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const responseData = error.response?.data;
    const message = responseData?.message || error.message || 'An unexpected network error occurred';
    const customError = new Error(message);
    customError.response = error.response;
    customError.status = error.response?.status;
    customError.code = responseData?.code || responseData?.error || 'UNKNOWN_ERROR';
    customError.cooldownRemainingSeconds = responseData?.cooldownRemainingSeconds;
    customError.remainingAttempts = responseData?.remainingAttempts;
    customError.details = responseData?.details;

    // Handle token expiration: clear invalid doctor token
    if (error.response?.status === 401 && customError.code === 'TOKEN_EXPIRED') {
      localStorage.removeItem('hms_doctor_token');
    }

    // Handle expired or revoked patient grant: clear expired patient grant
    if (error.response?.status === 403 && ['GRANT_EXPIRED', 'GRANT_REVOKED'].includes(customError.code)) {
      const patientMatch = error.config?.url && error.config.url.match(/patients\/([^/?#]+)/i);
      if (patientMatch) {
        const targetPid = decodeURIComponent(patientMatch[1]).trim().toUpperCase();
        sessionStorage.removeItem(`hms_grant_${targetPid}`);
      }
    }

    return Promise.reject(customError);
  }
);

export default api;
