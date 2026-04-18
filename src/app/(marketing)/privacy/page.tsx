export const metadata = {
  title: 'ProductCraft AI — 개인정보처리방침',
}

export default function PrivacyPage() {
  return (
    <div
      className="max-w-3xl mx-auto px-6 py-20"
      style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
    >
      <h1 className="text-4xl tracking-tight mb-2">개인정보처리방침</h1>
      <p className="text-sm font-sans text-stone-500 mb-10">최종 수정일: 2026년 4월 19일</p>

      <div className="space-y-8 font-sans text-sm leading-relaxed text-stone-700">

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">1. 수집하는 개인정보</h2>
          <p>서비스는 다음과 같은 개인정보를 수집합니다.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li><strong>필수:</strong> 이메일 주소, 암호화된 비밀번호 (Supabase Auth 관리)</li>
            <li><strong>선택:</strong> 이름 (회원가입 시)</li>
            <li><strong>자동 수집:</strong> 서비스 이용 내역, 생성 횟수, 업로드 이미지</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">2. 개인정보 이용 목적</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 가입 및 계정 관리</li>
            <li>AI 서비스 제공 (이미지 분석 및 콘텐츠 생성)</li>
            <li>크레딧·플랜 관리 및 결제 처리</li>
            <li>서비스 이용 통계 분석 (비식별화)</li>
            <li>공지사항 및 서비스 변경 안내</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">3. 개인정보 보유 기간</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>회원 정보: 탈퇴 후 30일 이내 삭제</li>
            <li>생성 이력: 플랜에 따라 7일~무제한 보관 후 자동 삭제</li>
            <li>결제 정보: 관련 법령에 따라 5년 보관</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">4. 제3자 제공</h2>
          <p>서비스는 다음 제3자에게 개인정보를 제공합니다.</p>
          <div className="mt-2 rounded-xl border border-stone-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-stone-50 border-b border-stone-200">
                  <th className="text-left px-4 py-2 font-semibold text-stone-600">제공 대상</th>
                  <th className="text-left px-4 py-2 font-semibold text-stone-600">제공 정보</th>
                  <th className="text-left px-4 py-2 font-semibold text-stone-600">목적</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                <tr><td className="px-4 py-2">Anthropic</td><td className="px-4 py-2">업로드 이미지</td><td className="px-4 py-2">AI 텍스트 생성</td></tr>
                <tr><td className="px-4 py-2">Google</td><td className="px-4 py-2">업로드 이미지</td><td className="px-4 py-2">AI 이미지 생성</td></tr>
                <tr><td className="px-4 py-2">Supabase</td><td className="px-4 py-2">이메일, 생성 데이터</td><td className="px-4 py-2">데이터베이스 호스팅</td></tr>
                <tr><td className="px-4 py-2">Toss Payments</td><td className="px-4 py-2">결제 정보</td><td className="px-4 py-2">결제 처리</td></tr>
                <tr><td className="px-4 py-2">CoolSMS</td><td className="px-4 py-2">전화번호</td><td className="px-4 py-2">SMS 발송 (선택)</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">5. 이용자 권리</h2>
          <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>개인정보 열람 및 정정</li>
            <li>개인정보 삭제 요청 (계정 탈퇴)</li>
            <li>개인정보 처리 정지 요청</li>
            <li>개인정보 이동 요청</li>
          </ul>
          <p className="mt-3">
            권리 행사: <strong>yohan73@gmail.com</strong>으로 이메일 문의
          </p>
        </section>

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">6. 쿠키 및 분석 도구</h2>
          <p>
            서비스는 Supabase 인증 세션 관리를 위해 쿠키를 사용합니다.
            Vercel Analytics를 통해 비식별화된 서비스 이용 통계를 수집합니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">7. 문의</h2>
          <p>
            개인정보 관련 문의는 <strong>yohan73@gmail.com</strong>으로 연락해주세요.
          </p>
        </section>

      </div>
    </div>
  )
}
