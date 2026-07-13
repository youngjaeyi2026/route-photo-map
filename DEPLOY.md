# 동선사진기록 앱 배포 메모

## 현재 목표

내 컴퓨터에서만 실행하던 동선사진기록 앱을 정식 서비스 주소로 전환합니다.

- 서비스 주소: `https://samwon.site`
- 코드 저장: GitHub
- 앱 서버: Railway
- 데이터베이스: TiDB Cloud(MySQL)
- 사진 파일 저장: Cloudflare R2
- 도메인: 가비아 `samwon.site`

## 현재 완료된 것

- 앱 폴더를 독립 Git 저장소로 준비
- Railway 실행 설정 `railway.json` 추가
- 서버 실행 명령 `npm start` 추가
- TiDB/R2 환경변수 대응 서버 구조 추가
- 로컬 개발 모드 유지
- `/api/health` 상태 확인 API 추가

로컬 상태 확인:

```text
http://127.0.0.1:5179/api/health
```

현재 로컬에서는 아래처럼 보이는 것이 정상입니다.

```json
{
  "ok": true,
  "storage": "local-json",
  "files": "embedded-json"
}
```

Railway에 TiDB/R2 환경변수를 넣으면 목표 상태는 아래입니다.

```json
{
  "ok": true,
  "storage": "tidb",
  "files": "cloudflare-r2"
}
```

## 1. GitHub 저장소 만들기

GitHub에서 새 저장소를 만듭니다.

추천 저장소 이름:

```text
route-photo-map
```

권장 설정:

- Public 또는 Private는 자유 선택
- README 생성 체크하지 않음
- `.gitignore` 생성 체크하지 않음
- License 생성 체크하지 않음

저장소를 만든 뒤 GitHub가 알려주는 주소를 확인합니다.

예:

```text
https://github.com/사용자명/route-photo-map.git
```

그 주소를 Codex에 알려주면 아래 명령을 실행하면 됩니다.

```bash
git remote add origin https://github.com/사용자명/route-photo-map.git
git push -u origin main
```

## 2. Railway 프로젝트 만들기

Railway에서 새 프로젝트를 만듭니다.

권장 방식:

```text
New Project -> Deploy from GitHub repo -> route-photo-map 선택
```

Railway가 자동으로 감지해야 하는 항목:

- Root directory: 저장소 루트
- Build: Nixpacks
- Start command: `npm start`

만약 Root Directory를 묻는다면:

```text
/
```

현재 ZIP으로 올리는 경우에는 ZIP 안의 파일들이 바로 루트에 있으므로 별도 하위 폴더를 지정하지 않습니다.

## 3. TiDB Cloud 환경변수

Railway Variables에 아래 값을 추가합니다.

```text
DATABASE_URL=mysql://USER:PASSWORD@HOST:4000/DATABASE
```

TiDB Cloud에서 MySQL 연결 문자열을 복사해 넣으면 됩니다.

주의:

- 비밀번호에 특수문자가 있으면 URL 인코딩이 필요할 수 있습니다.
- TiDB는 SSL 연결을 요구할 수 있습니다.

## 4. Cloudflare R2 환경변수

Railway Variables에 아래 값을 추가합니다.

```text
R2_BUCKET=버킷명
R2_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=R2_ACCESS_KEY
R2_SECRET_ACCESS_KEY=R2_SECRET_KEY
```

선택값:

```text
R2_PUBLIC_BASE_URL=https://files.samwon.site
```

초기에는 `R2_PUBLIC_BASE_URL` 없이도 서버 저장은 가능하지만, 사진을 다른 기기에서 보기 좋게 하려면 R2 공개 도메인 또는 공개 접근 설정을 준비하는 것이 좋습니다.

## 5. 도메인 연결

Railway에서 Custom Domain에 아래 도메인을 추가합니다.

```text
samwon.site
```

Railway가 안내하는 DNS 값을 가비아 DNS에 등록합니다.

일반적으로 둘 중 하나입니다.

```text
CNAME
```

또는

```text
A Record
```

Railway 화면에 표시된 값을 그대로 가비아에 입력합니다.

## 6. 배포 후 확인

아래 주소를 엽니다.

```text
https://samwon.site/api/health
```

정상 목표:

```json
{
  "ok": true,
  "storage": "tidb",
  "files": "cloudflare-r2"
}
```

그 다음 앱 화면:

```text
https://samwon.site
```

확인할 흐름:

1. 새 프로젝트 생성
2. 기록 시작
3. 사진 추가
4. 서버 저장
5. 같은 공유 코드로 불러오기
6. PC와 모바일에서 같은 기록 확인

## 다음 큰 단계

서버 정식화 이후에는 아래 순서가 좋습니다.

1. 로그인 기능
2. 내 프로젝트 목록
3. 주소 표시/주소 검색
4. Android 앱 전환
5. 보고서 작성
