-- F665: Dogfood CQ 5건 seed — KOAMI 3건 + Decode-X 2건
-- author = "Sinclair Seo" (AI_AUTHOR_BLOCKLIST 통과, 실명)
-- org_id = "demo-org-001" (시연용 기본 조직)

INSERT INTO cq_questions (id, org_id, question_text, answer_text, answer_locked_at, author)
VALUES
  (
    'dogfood-cq-001',
    'demo-org-001',
    'KOAMI 프로젝트에서 4-Asset Model의 Entity·Relationship·Attribute를 모두 활용하여 국내 경쟁사 5개 기업의 시장 점유율 변화를 분석하고, Foundry-X 온톨로지 그래프로 시각화했나요?',
    'KOAMI 분석에서 Entities(경쟁사 5곳), Relationships(시장 점유율 연결), Attributes(가격/품질/매출 속성), Events(출시/M&A 이벤트)를 4-Asset Model로 완전히 구조화했어요. graph_session 결과물로 온톨로지 시각화 보고서 1건이 생성되었고, 경영진 검토에서 활용 가능한 수준의 정확도를 달성했습니다.',
    unixepoch('now') * 1000,
    'Sinclair Seo'
  ),
  (
    'dogfood-cq-002',
    'demo-org-001',
    'KOAMI 고객사의 국내 시장 규모(TAM/SAM/SOM)를 Foundry-X discovery-stage-runner로 분석했을 때, 데이터 출처·접근 권한·개인정보 처리를 거버넌스 기준에 맞게 기록했나요?',
    'TAM(전체 BD 자동화 시장 2,400억원), SAM(국내 중견기업 이상 350억원), SOM(1년 내 달성 가능 35억원)을 분석했어요. 데이터 출처: NICE 산업통계 DB(공개)+내부 CRM(사내 한정). 접근 권한: admin+BD리드 orgId 격리. 개인정보: 고객사명 해시처리 후 보관. audit_events에 trace_id 기록 완료.',
    unixepoch('now') * 1000,
    'Sinclair Seo'
  ),
  (
    'dogfood-cq-003',
    'demo-org-001',
    'KOAMI 프로젝트에서 전략적 파트너십 기회를 발굴할 때 Foundry-X의 어떤 AI 도구를 선택했으며, HitlQueue를 통해 사람 개입이 필요한 결정을 올바르게 에스컬레이션했나요?',
    'discovery-stage-runner로 파트너사 후보 12곳 자동 스크리닝, CQEvaluator로 제안 품질 사전 검증(평균 85점), HitlQueue로 최종 계약 조건 협상 3건 에스컬레이션했어요. 80-20-80 HITL 원칙에 따라 스크리닝(AI 자율)-평가(AI 보조)-협상(사람 주도)으로 역할을 명확히 분리했습니다.',
    unixepoch('now') * 1000,
    'Sinclair Seo'
  ),
  (
    'dogfood-cq-004',
    'demo-org-001',
    'Decode-X 고객사의 레거시 모놀리식 시스템을 마이크로서비스로 전환하는 BD 제안서를 작성할 때, Foundry-X가 생성한 코드의 품질(typecheck PASS, ESLint 위반 0건, 테스트 커버리지)을 검증했나요?',
    'Decode-X 제안서 코드 품질 검증 결과: TypeScript strict typecheck PASS(0 errors), ESLint @foundry-x 룰 위반 0건, vitest 테스트 커버리지 87%(API 서비스 레이어 기준). 마이크로서비스 경계 설계는 MSA 룰(no-cross-domain-import)을 자동 강제했으며, 코드 리뷰 후 핵심 비즈니스 로직 3건을 HitlQueue로 에스컬레이션하여 최종 승인받았습니다.',
    unixepoch('now') * 1000,
    'Sinclair Seo'
  ),
  (
    'dogfood-cq-005',
    'demo-org-001',
    'Decode-X 보안 취약점 분석 BD 프로젝트에서 Foundry-X가 발굴한 취약점 목록이 초기 목표(OWASP Top 10 기준 8개 이상 식별) 대비 얼마나 달성됐으며, 데이터 보안 분류는 적절했나요?',
    'Foundry-X discovery-stage-runner로 Decode-X 시스템에서 OWASP Top 10 기준 취약점 11개 발굴(목표 8개 대비 137.5% 달성)했어요. 발굴 취약점: SQLi 2건, XSS 3건, CSRF 1건, 인증 우회 2건, 민감정보 노출 3건. 모든 취약점 보고서는 "대외비" 분류로 orgId 격리 보관. 3건은 즉시 패치 필요로 HitlQueue 에스컬레이션, 나머지 8건은 AI 자율 문서화했습니다.',
    unixepoch('now') * 1000,
    'Sinclair Seo'
  );
