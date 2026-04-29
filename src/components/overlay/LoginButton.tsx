/**
 * LoginButton.tsx — GitHub OAuth 로그인 버튼 (9~10주차)
 * 현재는 UI 자리만 유지. OAuth 연동 시 href를 BE 주소로 교체.
 */
import { useUIStore } from '@/store/useUIStore'

export default function LoginButton() {
  const user = useUIStore((s) => s.user)

  if (user) {
    return (
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <img src={`https://github.com/${user.login}.png?size=28`} alt={user.login}
          className="w-7 h-7 rounded-full border border-white/20" />
        <span className="text-[11px] font-mono text-white/50">{user.login}</span>
      </div>
    )
  }

  return (
    <a
      href={`${import.meta.env.VITE_API_BASE_URL ?? ''}/oauth2/authorization/github`}
      className="
        absolute top-4 right-4 z-20
        flex items-center gap-1.5 px-3 py-1.5
        bg-white/6 hover:bg-white/12
        border border-white/10 hover:border-white/20
        rounded-lg text-[11px] font-mono text-white/50 hover:text-white/80
        transition-all duration-150
      "
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.483 0-.237-.009-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844a9.59 9.59 0 012.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"/>
      </svg>
      GitHub 로그인
    </a>
  )
}
