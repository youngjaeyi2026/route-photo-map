# 동선 사진 기록 앱 배포·운영 안내

## 운영 구성

- 앱 서버: Railway
- 데이터베이스: TiDB Cloud(MySQL)
- 사진 저장소: Cloudflare R2
- 서비스 주소: `https://samwon.site`

운영 환경에서는 TiDB와 R2가 모두 설정되어야 저장 준비가 완료된 것으로 판단합니다.

## Railway 환경 변수

`.env.example`을 기준으로 다음 값을 등록합니다.

```text
NODE_ENV=production
DATABASE_URL=mysql://USER:PASSWORD@HOST:4000/DATABASE
R2_BUCKET=버킷명
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=접근키
R2_SECRET_ACCESS_KEY=비밀키
R2_PUBLIC_BASE_URL=https://files.samwon.site
ADMIN_EMAILS=관리자이메일
MIN_PASSWORD_LENGTH=8
MAX_BODY_BYTES=125829120
MAX_PHOTO_BYTES=12582912
DB_CONNECTION_LIMIT=4
```

`R2_PUBLIC_BASE_URL`은 선택 사항입니다. 비워 두면 앱 서버의 `/api/files/...` 경로를 통해 사진을 제공합니다.

## 상태 점검

프로세스 생존 여부:

```text
https://samwon.site/api/health
```

운영 저장소 준비 여부:

```text
https://samwon.site/api/ready
```

정상 운영 상태의 핵심 응답은 다음과 같습니다.

```json
{
  "ok": true,
  "ready": true,
  "environment": "production",
  "storage": "tidb",
  "files": "cloudflare-r2",
  "issues": []
}
```

`/api/health`는 앱 프로세스가 살아 있으면 HTTP 200을 반환합니다. `/api/ready`는 TiDB 또는 R2 설정이 빠진 경우 HTTP 503을 반환하므로 배포 확인과 모니터링에는 `/api/ready`를 사용합니다.

## 배포 전 점검

```bash
npm install
npm run check
npm start
```

로컬 개발 환경에서는 TiDB/R2가 없어도 `local-json`, `embedded-json` 모드로 동작합니다. 이 모드는 개발·복구용이며 운영 배포용이 아닙니다.

## 사진 저장 방식

운영 환경에서는 프로젝트 전체 JSON을 저장하기 전에 새 사진을 R2에 개별 업로드합니다. 따라서 사진이 많은 현장 기록도 하나의 거대한 요청 본문으로 전송되지 않습니다.

- 사진 한 장 제한: `MAX_PHOTO_BYTES`(기본 12MB)
- 프로젝트 JSON 제한: `MAX_BODY_BYTES`(기본 120MB)
- 제한 초과 시 서버는 HTTP 413을 반환합니다.

## 배포 후 확인 순서

1. `/api/ready`가 `ready: true`인지 확인
2. 로그인 및 프로젝트 생성
3. 기록 시작 후 사진 여러 장 추가
4. 서버 저장
5. 다른 기기에서 같은 프로젝트 불러오기
6. 공유 링크 생성·만료·삭제 확인
7. Railway 로그에서 `server_error`, `request_body_too_large` 반복 여부 확인

## 백업과 장애 대응

- TiDB는 정기 백업 또는 스냅샷 정책을 활성화합니다.
- R2 수명주기 규칙은 프로젝트 사진을 임의 삭제하지 않도록 설정합니다.
- 로컬 `data/projects.json`과 `recovered-photos-from-projects-json/`은 운영 데이터 이전이 끝날 때까지 삭제하지 않습니다.
- 저장 장애가 발생하면 먼저 `/api/ready`의 `issues`와 Railway 로그를 확인합니다.
