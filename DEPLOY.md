# 동선사진기록 앱 배포 메모

## 목표 구조

- 도메인: `https://samwon.site`
- 앱 서버: Railway
- DB: TiDB Cloud(MySQL)
- 사진 파일: Cloudflare R2
- 코드 저장/배포 트리거: GitHub

## Railway 환경변수

필수:

```text
DATABASE_URL=mysql://USER:PASSWORD@HOST:4000/DATABASE
R2_BUCKET=버킷명
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=R2_ACCESS_KEY
R2_SECRET_ACCESS_KEY=R2_SECRET_KEY
```

선택:

```text
R2_PUBLIC_BASE_URL=https://files.samwon.site
MAX_BODY_BYTES=125829120
DB_CONNECTION_LIMIT=4
```

## 동작 방식

- `DATABASE_URL`이 있으면 프로젝트/기록은 TiDB에 저장됩니다.
- `DATABASE_URL`이 없으면 기존처럼 `data/projects.json`에 저장됩니다.
- R2 환경변수가 모두 있으면 사진 data URL을 R2 파일로 업로드하고, 앱 데이터에는 파일 URL만 저장합니다.
- R2 환경변수가 없으면 기존처럼 사진이 JSON 안에 포함됩니다.

## 배포 확인

Railway 배포 후 아래 주소를 확인합니다.

```text
https://samwon.site/api/health
```

정상 예:

```json
{
  "ok": true,
  "storage": "tidb",
  "files": "cloudflare-r2"
}
```

## 도메인 연결

Railway에서 커스텀 도메인으로 `samwon.site`를 연결한 뒤, 가비아 DNS에 Railway가 안내하는 CNAME 또는 A 레코드를 등록합니다.
