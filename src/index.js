/**
 * 주소를 대표 주소 하나로 모은다.
 *
 * 왜 필요한가 — 2026-08-24 확인
 *   http://shinsegaeeye.co.kr/       200   ← 그대로 열렸다
 *   http://www.shinsegaeeye.co.kr/   200
 *   https://www.shinsegaeeye.co.kr/  200
 *   https://shinsegaeeye.co.kr/      200
 *
 * 네 주소가 전부 열리면 네이버는 이것을 **서로 다른 사이트**로 본다. 색인이
 * 흩어지고, 서치어드바이저에 등록한 것은 https 하나뿐이라 http 주소를 조회하면
 * '수집 제한' 으로 나온다. favicon.ico 가 수집 제한으로 잡힌 것이 이 때문이었다.
 *
 * 레퍼런스(7dental.co.kr)는 네 주소가 전부 301 로 한 곳에 모인다. 그것이
 * 우리와의 눈에 띄는 차이였다.
 *
 * 슬래시도 여기서 함께 처리한다. Workers 의 자동 trailing-slash 는 **307(임시)**
 * 을 쓰는데, 검색엔진에게 임시 이동은 "원래 주소가 정본이니 목적지를 색인하지
 * 말라" 는 뜻이다. `_redirects` 파일로 고치려 했으나 자동 처리가 먼저 걸려
 * 먹지 않았다. Worker 는 그보다 앞에서 돌아 확실하다.
 *
 * ⚠ 정적 자산은 반드시 env.ASSETS 로 넘긴다. 이 바인딩이 없으면 사이트가
 *   통째로 죽는다. wrangler.toml 의 [assets] binding 과 이름이 같아야 한다.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    let moved = false;

    // Cloudflare 는 원래 스킴을 CF-Visitor 헤더로 알려 준다.
    // url.protocol 은 엣지에서 이미 https 로 바뀌어 있을 수 있어 믿지 않는다.
    const visitor = request.headers.get('CF-Visitor') || '';
    if (visitor.includes('"scheme":"http"') || url.protocol === 'http:') {
      url.protocol = 'https:';
      moved = true;
    }

    if (url.hostname.startsWith('www.')) {
      url.hostname = url.hostname.slice(4);
      moved = true;
    }

    // 슬래시로 끝나지 않는 경로에 슬래시를 붙인다.
    // 파일(.css·.xml·.ico…)과 루트는 건드리지 않는다.
    const last = url.pathname.split('/').pop();
    if (url.pathname !== '/' && !url.pathname.endsWith('/') && !last.includes('.')) {
      url.pathname += '/';
      moved = true;
    }

    if (moved) {
      return Response.redirect(url.toString(), 301);
    }

    return env.ASSETS.fetch(request);
  },
};
