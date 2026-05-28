import Link from 'next/link'
import { FileQuestion, Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="card text-center px-8 py-12 max-w-md w-full">

        {/* 아이콘 */}
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center">
            <FileQuestion className="w-10 h-10 text-blue-400" />
          </div>
        </div>

        {/* 상태 코드 */}
        <p className="text-5xl font-bold text-gray-200 mb-2">404</p>

        {/* 메시지 */}
        <h1 className="text-xl font-semibold text-gray-800 mb-2">
          페이지를 찾을 수 없습니다
        </h1>
        <p className="text-sm text-gray-500 mb-8">
          요청하신 페이지가 존재하지 않거나
          <br />
          삭제되었을 수 있습니다.
        </p>

        {/* 버튼 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary">
            <Home className="w-4 h-4" />
            홈으로
          </Link>
          <Link href="/posts" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            게시글 목록
          </Link>
        </div>

      </div>
    </div>
  )
}
