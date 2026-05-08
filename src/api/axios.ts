import axios from 'axios'

// 개발: '' (빈 문자열) → Vite 프록시가 /repos, /auth 등을 localhost:8080으로 포워딩
// 운영: VITE_API_BASE_URL 에 EC2 주소 설정 (예: https://api.gitgalaxy.com)
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  // withCredentials: Vite 프록시 사용 시 same-origin이므로 불필요
  // PROD 배포 시 CORS 설정에 맞게 활성화
  headers: {
    'Content-Type': 'application/json',
  },
})

// 요청 인터셉터 — 추후 JWT 토큰 첨부 예정
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 응답 인터셉터 — 공통 에러 처리
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // 401은 미로그인 상태로 정상 처리 — 콘솔 에러 생략
    if (error.response?.status !== 401) {
      console.error('[API Error]', error.response?.status, error.message)
    }
    return Promise.reject(error)
  },
)
