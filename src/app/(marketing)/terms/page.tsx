export const metadata = {
  title: 'ProductCraft AI — 이용약관',
}

export default function TermsPage() {
  return (
    <div
      className="max-w-3xl mx-auto px-6 py-20"
      style={{ fontFamily: "'Instrument Serif', 'Noto Serif KR', Georgia, serif" }}
    >
      <h1 className="text-4xl tracking-tight mb-2">이용약관</h1>
      <p className="text-sm font-sans text-stone-500 mb-10">최종 수정일: 2026년 4월 19일</p>

      <div className="prose prose-stone max-w-none space-y-8 font-sans text-sm leading-relaxed text-stone-700">

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">제1조 (목적)</h2>
          <p>
            이 약관은 ProductCraft AI (이하 &ldquo;서비스&rdquo;)가 제공하는 AI 기반 상품 콘텐츠 자동 생성 서비스의
            이용 조건 및 절차, 이용자와 서비스 제공자의 권리·의무 사항을 규정함을 목적으로 합니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">제2조 (서비스 내용)</h2>
          <p>서비스는 다음의 기능을 제공합니다.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>제품 이미지 AI 분석 및 상품명·홍보문구·상세설명 자동 생성</li>
            <li>AI 이미지 생성 (Nano Banana 2 / Google Gemini 기반)</li>
            <li>SMS·카카오톡 공유 기능</li>
            <li>생성 콘텐츠 저장 및 이력 관리</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">제3조 (AI 생성 콘텐츠 고지)</h2>
          <p>서비스를 통해 생성되는 모든 콘텐츠(텍스트, 이미지)는 AI가 자동 생성합니다. 이용자는 다음 사항에 동의합니다.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>AI 생성 이미지에는 Google SynthID 워터마크가 포함되며, AI 생성 콘텐츠임을 식별할 수 있습니다.</li>
            <li>생성된 콘텐츠를 상업적으로 이용할 경우 AI 생성 콘텐츠임을 명시할 책임이 있습니다.</li>
            <li>서비스는 생성 결과의 정확성, 완전성, 적합성을 보증하지 않습니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">제4조 (이용 요금)</h2>
          <p>
            서비스는 크레딧 기반 과금 방식을 사용합니다. 무료 플랜은 월 3크레딧을 제공하며,
            유료 플랜은 결제 시 해당 플랜의 크레딧을 즉시 지급합니다. 크레딧은 다음 결제일에 초기화됩니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">제5조 (금지 행위)</h2>
          <p>이용자는 다음 행위를 해서는 안 됩니다.</p>
          <ul className="list-disc pl-5 space-y-1 mt-2">
            <li>타인의 지식재산권을 침해하는 이미지 업로드</li>
            <li>서비스의 API를 무단으로 크롤링하거나 자동화 도구로 이용</li>
            <li>허위 상품 정보 생성 및 소비자 기만 목적 사용</li>
            <li>제3자 개인정보를 포함한 이미지 업로드</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">제6조 (책임 제한)</h2>
          <p>
            서비스는 AI 생성 콘텐츠의 상업적 이용으로 발생하는 법적 분쟁, 저작권 침해, 광고 심의 관련 문제에
            대해 책임을 지지 않습니다. 이용자는 생성된 콘텐츠를 최종 검토 후 사용할 책임이 있습니다.
          </p>
        </section>

        <section>
          <h2 className="text-xl tracking-tight text-stone-900 mb-3">제7조 (약관 변경)</h2>
          <p>
            서비스는 약관을 변경할 경우 변경 7일 전에 서비스 내 공지합니다.
            변경 후에도 서비스를 계속 이용하면 변경된 약관에 동의한 것으로 간주합니다.
          </p>
        </section>

      </div>
    </div>
  )
}
