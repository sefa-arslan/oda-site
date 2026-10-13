/* ODA rooms: one scroll listener, one rAF render, one damped clock (PV). */
(() => {
	const d = document, R = d.documentElement, W = window, RC = R.classList;
	const RM = matchMedia('(prefers-reduced-motion: reduce)'), FINE = matchMedia('(hover: hover) and (pointer: fine)');
	const LABEL = { live: 'Live', wip: 'In the works', soon: 'Opening soon', open: 'Open' };
	const L0 = 0.54, D1 = 0.36; // lobby door | next door shows (rest .18)
	const $ = (s, c = d) => c.querySelector(s), $$ = (s, c = d) => [...c.querySelectorAll(s)];
	const { min, max, floor, round, abs, exp, sin, cos, log } = Math;
	const cl = (v, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
	const sm = (a, b, v) => { v = cl((v - a) / (b - a)); return v * v * (3 - 2 * v); };
	const ease = (v) => 1 - (1 - cl(v)) ** 3;
	const mk = (t, c, x) => { const e = d.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
	const hid = (e) => (e.setAttribute('aria-hidden', 'true'), e);
	const pad = (n) => String(n).padStart(2, '0'), n1 = (n) => n.toFixed(1), n3 = (n) => n.toFixed(3);
	const T = (a, ...v) => a.reduce((s, p, i) => s + n1(v[i - 1]) + p);
	const op = (e, v) => (e.style.opacity = n3(v)), sp = (e, k, v) => e.style.setProperty(k, v), on = (e, t, f, o) => e.addEventListener(t, f, o);
	const mix = (a, b, x) => (x <= 0 ? a : x >= 1 ? b : isNaN(a) ? `color-mix(in oklab,${a},${b} ${n1(x * 100)}%)` : +a + (b - a) * x);
	let rmo = false;
	try { rmo = localStorage.getItem('oda-rm') === '1'; } catch {}
	const still = () => RM.matches || rmo;

	const rooms = $$('[data-room]').map((el, i) => {
		const s = el.dataset;
		return { el, i, id: el.id, num: s.num || pad(i + 1), name: s.name || el.id, short: s.short || s.name, st: s.status in LABEL ? s.status : 'soon', line: s.line || '', href: s.href, hl: s.hrefLabel, back: $('.room-back', el), front: $('.room-front', el), copy: $('.room-copy', el), h: $('h2', el), odo: $$('[data-odo]', el), ar: $('[data-ar]', el), stats: [] };
	});
	const N = rooms.length, lab = (r) => LABEL[r.st];

	const appN = $('[data-apps]'), slots = $('[data-slots]');
	if (appN && slots) for (let k = 0; k < (+appN.dataset.apps || 0); k++) {
		const s = mk('i', 'slot');
		sp(s, '--k', k);
		s.append(mk('b', 'slot-o'), mk('b', 'slot-l', pad(k + 1)), mk('b', 'slot-x'), mk('b', 'slot-s', 'Under wraps'));
		slots.append(s);
	}

	const fmt = (v) => { const u = v >= 1e6 ? [1e6, 'M', ' million'] : v >= 1e4 ? [1e3, 'K', ' thousand'] : [1, '', ''], n = String(floor((v / u[0]) * 10) / 10).replace(/\.0$/, ''); return [n + u[1], n + u[2]]; };
	$$('.stat').forEach((s) => {
		const v = +s.dataset.value, l = s.dataset.label || '', r = rooms.find((x) => x.el.contains(s));
		if (!(v > 0)) return;
		const [a, spoken] = fmt(v), n = hid(mk('b', 'stat-n', a));
		s.append(n, hid(mk('span', 'stat-l', l)), mk('span', 'vh', spoken + ' ' + l));
		if (s.dataset.caption) s.append(mk('span', 'stat-c', s.dataset.caption));
		if (r) r.stats.push({ n, v, a });
	});
	let cRaf = 0;
	function countUp(r) {
		cancelAnimationFrame(cRaf);
		if (!r.stats.length) return;
		const t0 = performance.now(), step = (now) => {
			const e = still() ? 1 : ease((now - t0) / 1200);
			r.stats.forEach((s) => { s.n.textContent = e >= 1 ? s.a : fmt(s.v * e)[0]; });
			if (e < 1) cRaf = requestAnimationFrame(step);
		};
		cRaf = requestAnimationFrame(step);
	}

	const dot = (s) => { const i = mk('i', 'dot'); i.dataset.s = s; return i; };
	$$('[data-dir]').forEach((list) => {
		const kind = list.dataset.dir;
		rooms.forEach((r) => {
			const li = mk('li'), a = mk('a');
			a.href = '#' + r.id;
			sp(li, '--i', r.i);
			if (kind === 'index') {
				const sw = hid(mk('span', 'ix-sw')), st = mk('span', 'ix-st');
				li.className = 'ix'; a.className = 'ix-go';
				sp(sw, '--sw', r.el.style.getPropertyValue('--sw') || 'var(--coral)');
				st.append(dot(r.st), lab(r));
				a.append(mk('span', 'ix-n', r.num), sw, mk('span', 'ix-name', r.name), mk('span', 'ix-line', r.line), st);
				li.append(a);
				if (r.href) {
					const x = mk('a', 'ix-ext', (r.hl || r.href) + ' ');
					x.href = r.href; x.target = '_blank'; x.rel = 'noopener';
					x.append(hid(mk('span', null, '↗')), mk('span', 'vh', ' (opens in a new tab)')); li.append(x);
				}
			} else {
				if (kind === 'dock') a.append(dot(r.st), mk('span', 'dk', r.num + ' ' + r.name), mk('span', 'vh', ', ' + lab(r)));
				else { const p = [mk('span', 'n', r.num), mk('span', 'nm', kind === 'menu' ? r.name : r.short), dot(r.st), mk('span', 'vh', ', ' + lab(r))]; if (kind === 'strip') p.unshift(p.splice(2, 1)[0]); a.append(...p); }
				li.append(a);
			}
			list.append(li);
		});
	});
	const dirs = $$('[data-dir]:not([data-dir=index])').map((l) => [...l.children]);
	let cur = -1;
	function setCurrent(i) {
		if (i === cur || !rooms[i]) return;
		cur = i;
		dirs.forEach((items) => items.forEach((li, j) => (j === i ? li.setAttribute('aria-current', 'true') : li.removeAttribute('aria-current'))));
	}

	const corr = $('.corridor'), stage = $('.stage'), lobby = $('.lobby'), hero = $('.hero'), hdr = $('.hdr'), foot = $('.foot');
	const lay = (w) => (w ? $$('.ly', w).map((el) => { const s = el.dataset; return { el, d: +s.d || 1, x: +s.x || 0, y: +s.y || 0, py: +s.py || 0 }; }) : []);
	const lob = { el: lobby, back: lobby && $('.room-back', lobby), i: -1, stats: [] };
	const all = [lob, ...rooms].filter((r) => r.el);
	all.forEach((r) => { r.layers = lay(r.back).concat(lay(r.front)); });
	const portal = $('.portal'), sign = hid(mk('div', 'sign')), lintel = mk('span', 'lintel'), plaque = mk('span', 'plaque');
	const [fl, spl, gl, jb, lf, sh, pn, kn] = $$('.portal path'), jc = $('.portal use');
	sign.append(lintel, plaque);
	if (stage) stage.append(sign);
	let chars = [], typed = -1, dressed = '';
	function dress(host, next, g) {
		const key = host.i + '>' + next.i;
		if (dressed === key) return;
		dressed = key;
		portal.style.cssText = `--pd:${host.tk.door};--lf:${next.tk.sw}`;
		sign.style.cssText = `--pi:${host.tk.text};--pb:${host.tk.paper};--live:${host.tk.lv}`;
		lintel.textContent = '';
		chars = [...`${next.num} — ${next.name}`].map((c) => lintel.appendChild(mk('i', null, c)));
		typed = -1;
		plaque.textContent = lab(next); plaque.dataset.s = next.st;
	}

	const G = {};
	let cx = false, last = null, pending = -1;
	const K = '#181918', HK = ['ink', 'bg', 'acc', 'acc-ink', 'lv'], NK = ['ink', 'bg', 'lv', 'sc'];
	const tokens = (el) => {
		const cs = getComputedStyle(el), p = (n, f) => cs.getPropertyValue(n).trim() || f;
		const ink = p('--hdr-ink', K), paper = p('--bg', '#f2f1ed'), lv = p('--live', '#dc4420'), hb = p('--hdr-bg', paper), h = [ink, hb, p('--cta-bg', '#fa5b3a'), p('--cta-ink', K), lv];
		return { lv, sw: p('--sw', '#fa5b3a'), door: p('--door', K), text: p('--ink', K), paper, h, L: h.map((c) => (sp(hdr, 'color', `color-mix(in oklab,${c},${c})`), parseFloat(getComputedStyle(hdr).color.slice(6)))), n: [ink, hb, lv, 0].map((f, i) => p('--nav-' + NK[i], f)) };
	};
	const docTop = (el) => el.getBoundingClientRect().top + scrollY;
	const layTop = (e) => (e.offsetParent === undefined ? docTop(e) : e.offsetTop + (e.offsetParent ? e.offsetParent.clientTop + layTop(e.offsetParent) : 0)); // no intro/fade transforms
	const doorOf = (ref, base) => { const b = ref.firstChild.getBoundingClientRect(), B = b.bottom - base.top, h = min(b.height, (B - G.hd - G.sg) / 1.046); return { x: b.left - base.left + b.width / 2, y: B - h / 2, w: h / 2.1, h, aw: ref.offsetWidth, ah: ref.offsetHeight }; };
	function measure() {
		cx = !still() && !!lobby;
		RC.toggle('cx', cx);
		sp(R, '--vw', R.clientWidth + 'px');
		G.vh = innerHeight; G.hd = hdr.offsetHeight;
		if (foot) sp(R, '--fh', foot.offsetHeight + 'px');
		G.hero = hero ? hero.offsetHeight : 1; G.heroTk = tokens(hero || R);
		if (!corr) return;
		sp(corr, '--rooms', N);
		const base = stage.getBoundingClientRect();
		G.W = base.width; G.H = cx ? base.height : G.vh;
		const t = max(1, corr.offsetHeight - (cx ? stage.offsetHeight : 0));
		G.top = docTop(corr); G.end = G.top + t; G.travel = cx ? (t * N) / (N + 0.3) : t;
		if (cx) { plaque.textContent ||= lintel.textContent = '0'; G.sg = sign.offsetHeight + 19; G.da = doorOf($('.ref-aa'), base); G.dl = doorOf($('.ref-lobby'), base); }
		all.forEach((r) => { r.tk = tokens(r.el); });
		let m = 0;
		rooms.forEach((r) => { const l = r.copy.lastElementChild, c = l.offsetTop + l.offsetHeight; m = max(m, c); sp(r.el, '--cb', c + 'px'); r.top = docTop(r.el); r.bottom = r.top + r.el.offsetHeight; if (!cx) vars(r, 0.52); });
		sp(stage, '--cbm', m + 'px');
		G.cb = { top: G.top };
		G.bands = [{ top: -1e9, tk: G.heroTk }, ...(cx ? [G.cb] : rooms), ...$$('.index,.studio,.closing').map((s) => ({ top: docTop(s), tk: tokens(s), p: 1 }))];
		G.tx = $$('[data-fit],.ix').filter((e) => !e.closest(cx ? '.menu,.corridor' : '.menu')).map((e, t) => [(t = layTop(e)), t + e.offsetHeight]);
		G.hr = hdr.getBoundingClientRect(); G.dk = $('.dock').getBoundingClientRect();
		dressed = ''; last = null;
	}

	const tf = (x, y, s) => T`translate3d(${x}px,${y}px,0) scale(` + s.toFixed(4) + ')';
	const AR = [[1, 0.5625, '16:9'], [0.5625, 1, '9:16'], [1, 1, '1:1'], [0.8, 1, '4:5']];
	function vars(r, t) {
		sp(r.el, '--t', t.toFixed(4));
		sp(r.el, '--e', ease(t / 0.32).toFixed(4));
		sp(r.el, '--res', (sm(0, 0.3, t) * (1 - sm(0.72, 0.98, t))).toFixed(4));
		r.odo.forEach((o) => {
			const n = o.dataset.odo === 's' ? 1 + floor(t * 24) : 1 + (floor(t * 60) % 9), c = [...o.children];
			c.forEach((e, k) => sp(e, '--d', floor(n / 10 ** (c.length - 1 - k)) % 10));
		});
		if (r.ar) {
			const p = cl((t - 0.08) / 0.78) * 3, k = min(2, floor(p)), f = sm(0.35, 0.85, p - k), A = AR[k], B = AR[k + 1], x = (f < 0.5 ? A : B)[2];
			r.ar.parentNode.style.cssText = `--aw:${n3(A[0] + (B[0] - A[0]) * f)};--ah:${n3(A[1] + (B[1] - A[1]) * f)}`;
			if (r.ar.textContent !== x) r.ar.textContent = x;
		}
	}
	const pick = (r, o) => { if (r.copy && r.click !== o) { r.click = o; r.el.classList.toggle('is-cur', o); } };
	function roles(host, guest, on, g) {
		all.forEach((r) => {
			const h = r === host, gu = r === guest, c = r.el.classList;
			c.toggle('is-host', h); c.toggle('is-guest', gu); c.toggle('is-live', (h || gu) && on);
			if (!h) r.layers.forEach((L) => { L.el.style.transform = L.el.style.opacity = ''; });
			if (!gu) r.el.style.clipPath = '';
			if (!h && !gu) { pick(r, false); if (r.copy) r.copy.style.opacity = ''; }
		});
		sp(host.el, '--ox', g.x + 'px'); sp(host.el, '--oy', g.y + 'px'); sp(stage, '--now', host.tk.paper);
		if (guest) dress(host, guest, g); else portal.style.opacity = sign.style.opacity = 0;
		if (!last || last.host !== host) countUp(host);
		last = { host, guest, on };
	}
	const rr = (l, t, r, b, q) => T`M${l} ${b}V${t + q}A${q} ${q} 0 0 1 ${l + q} ${t}H${r - q}A${q} ${q} 0 0 1 ${r} ${t + q}V${b}Z`;
	const poly = (P) => 'M' + P.map((p) => n1(p[0]) + ' ' + n1(p[1])).join('L') + 'Z';
	const outline = (l, t, r, b, q, n) => { const A = []; for (let i = 0; i <= n; i++) { const f = (i * 1.5708) / n; A.push([l + q - q * cos(f), t + q - q * sin(f)]); } return [[l, b], ...A, ...A.map(([x, y]) => [l + r - x, y]).reverse(), [r, b]]; };
	const at = (el, d, o) => { el.setAttribute('d', d); el.style.opacity = o; };
	function corridorFrame(P, y) {
		let host = lob, guest = rooms[0], v = 0, k = 0, t = P / L0;
		if (P >= L0) {
			const q = P - L0;
			k = min(N - 1, floor(q)); v = q - k; host = rooms[k];
			guest = k < N - 1 && v >= D1 ? rooms[k + 1] : null; t = (v - D1) / (1 - D1);
		}
		const lo = host === lob, g = lo ? G.dl : G.da, on = y + G.H > G.top && y < G.end + G.H;
		if (!last || last.host !== host || last.guest !== guest || last.on !== on) roles(host, guest, on, g);
		const a = lo ? sm(G.top - G.vh * 0.9, G.top - G.vh * 0.1, y) : cl(t / 0.22), o = guest ? sm(lo ? 0.05 : 0.22, lo ? 0.45 : 0.56, t) : 0;
		const p = guest ? cl((t - (lo ? 0.45 : 0.56)) / (lo ? 0.55 : 0.44)) : 0, e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2, ex = guest && !lo ? ease(a) : 0;
		host.layers.forEach((L) => {
			L.el.style.transform = tf((ex * L.x * g.aw) / 100, (ex * L.y * g.ah) / 100 + (0.3 - v) * L.py * G.H * 0.01, 1 + 0.05 * e);
			if (L.d < 1) op(L.el, 1 - 0.6 * ex);
		});
		if (host.copy) {
			const c = 1 - sm(0, 0.3, p);
			op(host.copy, c);
			pick(host, c > 0.6);
			vars(host, 0.3 + 0.7 * v);
		}
		nv = host; hx = null;
		if (guest) {
			const w = g.w, h = g.h, S = p ? (max(G.W / w, G.H / h) * 1.04) ** e : 0.62 + 0.38 * ease(a), m = sm(0, 0.85, p);
			const X = g.x + (G.W / 2 - g.x) * m, Y = (p ? g.y : g.y + (h / 2) * (1 - S)) + (G.H / 2 - g.y) * m, map = (x, z) => [X + x * S, Y + z * S];
			const [l, tp] = map(-w / 2, -h / 2), [r, b] = map(w / 2, h / 2), q = w * 0.2 * S, j = w * 0.06 * S, th = -1.833 * o, D = w * 4.5;
			const leaf = (P) => poly(P.map(([u, z]) => { const s = D / (D + u * sin(th)); return map((-w / 2 + u * cos(th)) * s, (z - h / 2) * s); }));
			op(portal, sm(0, 0.4, a));
			at(fl, T`M${X - 3 * w * S} ${b}H${X + 3 * w * S}`, n3(0.5 * a));
			const f = w * S * (0.2 + 0.8 * o);
			at(spl, poly([[l, b], [r, b], [r + f, b + h * S * 0.5], [l - f, b + h * S * 0.5]]), n3(o));
			at(gl, rr(l, tp, r, b, q), n3(o * (1 - sm(0, 0.35, p))));
			at(jb, rr(l - j, tp - j * 1.6, r + j, b, q + j) + rr(l, tp, r, b, q), 1);
			// smooth corners; closed, the leaf tucks under the frame copy
			const k1 = 1 - sm(0.12, 0.3, o), z = 0.03 * w * k1, nq = (3 + 2 * (q * devicePixelRatio) ** 0.5) | 0, lp = leaf(outline(-z, -1.6 * z, w + z, h, w * 0.2 + z, nq));
			at(lf, lp, 1); at(sh, lp, n3(0.8 * o)); op(jc, k1);
			at(pn, leaf(outline(w * 0.14, h * 0.08, w * 0.86, h * 0.9, w * 0.14, nq)), 1);
			at(kn, leaf([[w * 0.8, h * 0.52], [w * 0.87, h * 0.52], [w * 0.87, h * 0.546], [w * 0.8, h * 0.546]]), 1);
			const n = round(chars.length * sm(0.15, 0.6, a));
			if (n !== typed) { typed = n; chars.forEach((c, i) => c.classList.toggle('on', i < n)); }
			sign.style.transform = T`translate3d(${X}px,${tp - j * 1.6 - 10}px,0) translate(-50%,-100%)`;
			op(sign, sm(0.15, 0.5, a));
			op(plaque, sm(0.4, 0.8, a));
			guest.el.style.clipPath = o > 0 ? T`inset(${tp - j * 0.8}px ${G.W - r - j / 2}px ${G.H - b}px ${l - j / 2}px round ${q + j / 2}px ${q + j / 2}px 0 0)` : 'inset(50%)';
			const gc = sm(0.9, 1, p);
			op(guest.copy, gc);
			pick(guest, gc > 0.6);
			vars(guest, 0.3 * p);
			const cv = (k) => sm(0, 1, cl((min(k.right, r) - max(k.left, l)) / k.width) * cl((min(k.bottom, b) - max(k.top, tp)) / k.height));
			hx = [guest.tk, cv(G.hr), p, cv(G.dk), 0.7 * (sm(0.55, 0.62, t) - sm(0.93, 0.98, t))]; // pill pace, text halo
		}
		setCurrent(k);
		return host;
	}

	let Y = scrollY, raf = 0, nv = null, hx = null, flags = '', PV = 0, PT = 0, T0 = 0;
	const roomAt = (z) => rooms.find((r) => z >= r.top && z < r.bottom);
	W.odaClock = () => [PV, PT];
	function render(now) {
		const y = Y;
		if (cx) {
			// >= 1.1 s per door; 1:1 outside the pin
			const dt = now ? min(0.05, (now - T0) / 1000) : 0.016, q = PV - L0, r = (q < 0 || q % 1 >= D1 ? 0.52 : 1.6) * dt;
			T0 = now || 0; PT = cl((y - G.top) / G.travel) * N;
			if (pending >= 0 || y < G.top || y > G.end) PV = PT;
			else { PV += cl((PT - PV) * (1 - exp(-dt * 12)), -r, r); if (abs(PT - PV) < 2e-4) PV = PT; }
			G.cb.tk = corridorFrame(PV, y).tk;
			if (PV !== PT) kick();
		}
		else if (N) {
			const i = rooms.indexOf(roomAt(y + G.vh / 2));
			if (i >= 0) setCurrent(i);
			nv = roomAt(y + G.vh - 40);
		}
		// header: band A under it, band B rising in, mixed by B's share
		const i = G.bands.findLastIndex((b) => b.top <= y), s = G.bands[i], nx = G.bands[i + 1], A = s.tk, c = nx ? nx.top - y : 1e4, [B, x, xs = x] = s === G.cb && hx ? hx : c < G.hd ? [nx.tk, cl(1 - c / G.hd)] : [A, 0];
		const H = A.h.map((v, j) => mix(v, B.h[j], j > 1 ? xs : x)), lu = (j) => (A.L[j] + (B.L[j] - A.L[j]) * (j > 1 ? xs : x)) ** 3;
		for (const [f, g] of [[0, 1], [3, 2]]) { const q = lu(g); if (abs(log((lu(f) + 0.05) / (q + 0.05))) < 1.53) H[f] = q > 0.18 ? '#000' : '#fff'; } // ink keeps 4.5:1
		HK.forEach((k, j) => sp(R, '--h-' + k, H[j]));
		R.dataset.ui = lu(1) > 0.18 ? 'light' : 'dark';
		hdr.style.cssText = `--h-cut:${n1(c)}px;--h-a:${A.h[1]};--h-b:${nx && nx.p ? nx.tk.h[1] : '#0000'};--hh:hsl(0 0% ${lu(1) > 0.18 ? 100 : 0}%/${hx ? n3(hx[4]) : 0})`; // fade: sections only
		(nv ? nv.tk : A).n.forEach((v, j) => sp(R, '--n-' + NK[j], hx ? mix(v, hx[0].n[j], hx[3]) : v));
		sp(R, '--hx', cx ? n3(sm(0.02, 0.36, y / G.vh)) : '0');
		const o = cx ? 0 : G.vh * 0.5, rv = sm(G.top - o, G.top - o + G.vh * 0.18, y) * (1 - sm(G.end - o - G.vh * 0.2, G.end - o, y));
		sp(R, '--rv', n3(rv));
		const hs = !(cx && y >= G.top && y <= G.end) && ((c > 1 && c < G.vh / 2) || (s === G.cb && y > G.end) || G.tx.some(([a, b]) => a < y + G.hd && b > y)), fl = (rv > 0.01 ? 'r' : '') + (y < G.hero ? 'h' : '') + (hs ? 's' : '');
		if (fl !== flags) { flags = fl; RC.toggle('in-rooms', rv > 0.01); RC.toggle('hero-on', y < G.hero); sp(R, '--h-scrim', hs ? 1 : 0); }
	}
	function kick() { if (d.hidden) render(); else if (!raf) raf = requestAnimationFrame((n) => { raf = 0; render(n); }); }

	const live = () => RC.toggle('live', !still() && !d.hidden);
	on(d, 'visibilitychange', live);
	on(W, 'scroll', () => { Y = scrollY; kick(); }, { passive: true });
	if (FINE.matches) {
		$$('.cta').forEach((c) => {
			on(c, 'pointermove', (e) => {
				if (still()) return;
				const r = c.getBoundingClientRect();
				c.style.translate = T`${cl((e.clientX - r.left) / r.width) * 12 - 6}px ${cl((e.clientY - r.top) / r.height) * 8 - 4}px`;
			});
			on(c, 'pointerleave', () => { c.style.translate = ''; });
		});
	}

	const byHash = (h) => rooms.find((r) => '#' + r.id === h), roomY = (i) => (cx ? G.top + ((L0 + i + 0.18) * G.travel) / N : rooms[i].top);
	function go(i, smooth, focus) {
		pending = i;
		scrollTo({ top: round(roomY(i)), behavior: smooth && !still() ? 'smooth' : 'auto' });
		if (!smooth) { Y = scrollY; render(); }
		if (focus) { const h = rooms[i].h; h.tabIndex = -1; h.focus({ preventScroll: true }); }
		setTimeout(() => { pending = -1; }, 900);
	}
	on(d, 'click', (e) => {
		const a = e.target.closest('a[href^="#"]');
		if (!a) return;
		if (RC.contains('menu-open')) setMenu(false, false);
		const r = byHash(a.getAttribute('href'));
		if (r && cx) { e.preventDefault(); history.pushState(null, '', '#' + r.id); go(r.i, true, true); }
	});
	if (corr) on(corr, 'focusin', (e) => {
		const el = e.target.closest('[data-room]'), r = el && rooms.find((x) => x.el === el);
		if (cx && r && r.i !== pending && !r.click) requestAnimationFrame(() => go(r.i, false));
	});

	const burger = $('.burger'), menu = $('#menu'), outside = [$('main'), foot, $('.dock')].filter(Boolean);
	function setMenu(open, restore = true) {
		if (!burger || !menu) return;
		RC.toggle('menu-open', open);
		burger.setAttribute('aria-expanded', String(open));
		burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
		menu.inert = !open;
		outside.forEach((el) => { el.inert = open; });
		if (open) { const f = $('a', menu); if (f) f.focus(); } else if (restore) burger.focus();
	}
	if (burger) on(burger, 'click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
	on(d, 'keydown', (e) => { if (e.key === 'Escape' && RC.contains('menu-open')) setMenu(false); });

	const rmBtn = $('[data-rm]');
	const syncRm = () => { RC.toggle('rmo', rmo); if (rmBtn) rmBtn.setAttribute('aria-pressed', String(rmo)); live(); };
	if (rmBtn) on(rmBtn, 'click', () => {
		rmo = !rmo;
		try { localStorage.setItem('oda-rm', rmo ? '1' : '0'); } catch {}
		syncRm(); remeasure();
	});

	let rz = 0;
	function remeasure() { measure(); Y = scrollY; flags = ''; render(); }
	on(W, 'resize', () => {
		if (!rz) rz = requestAnimationFrame(() => { rz = 0; if (innerWidth > 767 && RC.contains('menu-open')) setMenu(false, false); remeasure(); });
	});
	RM.onchange = () => { live(); remeasure(); };
	syncRm(); remeasure();
	d.fonts.ready.then(remeasure);
	$$('img').forEach((i) => i.decode().then(remeasure, () => 0));
	on(W, 'load', remeasure);
	const hashRoom = byHash(location.hash);
	if (hashRoom && cx) requestAnimationFrame(() => go(hashRoom.i, false));
})();
