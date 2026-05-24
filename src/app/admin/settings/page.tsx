/**
 * Admin 설정 페이지 — 플랜별 이미지 해상도 관리
 * /admin/settings
 */

import { requireAdmin } from '@/lib/auth/admin-guard'
import { getPlanResolutions } from '@/lib/plan-settings'
import { PLAN_LABELS, PLANS } from '@/lib/plan-settings-shared'
import type { Plan, Resolution } from '@/lib/plan-settings-shared'
import { PlanResolutionForm } from '@/components/admin/plan-resolution-form'

export default async function AdminSettingsPage() {
  await requireAdmin()
  const resolutions = await getPlanResolutions()

  const rows: { plan: Plan; resolution: Resolution; label: string }[] = PLANS.map((plan) => ({
    plan,
    resolution: resolutions[plan],
    label: PLAN_LABELS[plan],
  }))

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-[20px] font-bold text-[#111111]">설정</h1>
        <p className="text-[13px] text-[#707072] mt-1">
          플랜별 이미지 생성 해상도를 설정합니다. 변경 즉시 모든 신규 생성 요청에 적용됩니다.
        </p>
      </div>

      {/* 플랜별 해상도 */}
      <section>
        <h2 className="text-[13px] font-bold text-[#111111] uppercase tracking-widest mb-4">
          플랜별 이미지 해상도
        </h2>

        {/* 비용 참고 */}
        <div
          className="mb-6 p-4 text-[12px] text-[#707072] leading-relaxed"
          style={{ backgroundColor: '#f5f5f5', border: '1px solid #e5e5e5' }}
        >
          <span className="font-bold text-[#111111]">Gemini 이미지 생성 단가 참고</span>
          <br />
          1K = $0.067/장 · 2K = $0.10/장 · 4K = $0.151/장
          <br />
          해상도를 낮출수록 API 비용이 절감됩니다.
        </div>

        <PlanResolutionForm initialRows={rows} />
      </section>
    </div>
  )
}
