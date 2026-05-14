// ===== API 封装层 =====
// 统一管理 fetch 请求、auth header、token 刷新

const API_BASE = '';

let accessToken = localStorage.getItem('feynman_token') || '';
let refreshToken = localStorage.getItem('feynman_refresh_token') || '';

function setTokens(access, refresh) {
    accessToken = access;
    refreshToken = refresh;
    if (access) localStorage.setItem('feynman_token', access);
    else localStorage.removeItem('feynman_token');
    if (refresh) localStorage.setItem('feynman_refresh_token', refresh);
    else localStorage.removeItem('feynman_refresh_token');
}

function isLoggedIn() {
    return !!accessToken;
}

async function refreshAccessToken() {
    if (!refreshToken) return false;
    try {
        const resp = await fetch(API_BASE + '/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken })
        });
        if (resp.ok) {
            const data = await resp.json();
            setTokens(data.access_token, refreshToken);
            return true;
        }
    } catch (e) { /* ignore */ }
    return false;
}

async function apiGet(path) {
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = 'Bearer ' + accessToken;

    let resp = await fetch(API_BASE + path, { headers });
    if (resp.status === 401 && refreshToken) {
        const ok = await refreshAccessToken();
        if (ok) {
            headers['Authorization'] = 'Bearer ' + accessToken;
            resp = await fetch(API_BASE + path, { headers });
        }
    }
    return resp;
}

async function apiPost(path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = 'Bearer ' + accessToken;

    let resp = await fetch(API_BASE + path, {
        method: 'POST', headers, body: JSON.stringify(body)
    });
    if (resp.status === 401 && refreshToken) {
        const ok = await refreshAccessToken();
        if (ok) {
            headers['Authorization'] = 'Bearer ' + accessToken;
            resp = await fetch(API_BASE + path, {
                method: 'POST', headers, body: JSON.stringify(body)
            });
        }
    }
    return resp;
}

async function apiPatch(path, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = 'Bearer ' + accessToken;

    let resp = await fetch(API_BASE + path, {
        method: 'PATCH', headers, body: JSON.stringify(body)
    });
    if (resp.status === 401 && refreshToken) {
        const ok = await refreshAccessToken();
        if (ok) {
            headers['Authorization'] = 'Bearer ' + accessToken;
            resp = await fetch(API_BASE + path, {
                method: 'PATCH', headers, body: JSON.stringify(body)
            });
        }
    }
    return resp;
}

async function apiDelete(path) {
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = 'Bearer ' + accessToken;

    let resp = await fetch(API_BASE + path, { method: 'DELETE', headers });
    if (resp.status === 401 && refreshToken) {
        const ok = await refreshAccessToken();
        if (ok) {
            headers['Authorization'] = 'Bearer ' + accessToken;
            resp = await fetch(API_BASE + path, { method: 'DELETE', headers });
        }
    }
    return resp;
}

function apiStream(path, body, signal) {
    const headers = { 'Content-Type': 'application/json' };
    if (accessToken) headers['Authorization'] = 'Bearer ' + accessToken;
    return fetch(API_BASE + path, {
        method: 'POST', headers, body: JSON.stringify(body), signal
    });
}

function logout() {
    setTokens('', '');
    localStorage.removeItem('feynman_current');
}
