import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import net from "node:net"
import { setTimeout as delay } from "node:timers/promises"
import { startMockDrupal } from "./mock-drupal.mjs"

function npmCmd() {
  return process.platform === "win32" ? "npm.cmd" : "npm"
}

async function run(cmd, args, options = {}) {
  await new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit", ...options })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${cmd} ${args.join(" ")} exited with code ${code}`))
    })
  })
}

async function waitForHttpOk(url, timeoutMs = 20000) {
  const deadline = Date.now() + timeoutMs
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      const res = await fetch(url, { redirect: "manual" })
      if (res.ok || (res.status >= 300 && res.status < 500)) {
        return
      }
    } catch {
      // ignore
    }
    if (Date.now() > deadline) {
      throw new Error(`Timed out waiting for ${url}`)
    }
    await delay(250)
  }
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const s = net.createServer()
    s.unref()
    s.on("error", reject)
    s.listen(0, "127.0.0.1", () => {
      const addr = s.address()
      const port = typeof addr === "object" && addr ? addr.port : 0
      s.close(() => resolve(port))
    })
  })
}

async function startNextServer(port, env) {
  const child = spawn(npmCmd(), ["run", "start", "--", "-p", String(port)], {
    stdio: "inherit",
    env: { ...process.env, ...env },
  })
  await waitForHttpOk(`http://127.0.0.1:${port}/`)
  return child
}

async function stop(child) {
  if (!child || child.killed) return
  child.kill("SIGTERM")
  await Promise.race([
    new Promise((resolve) => child.on("exit", resolve)),
    delay(8000),
  ])
  if (!child.killed) {
    child.kill("SIGKILL")
  }
}

async function fetchText(url, init) {
  const res = await fetch(url, init)
  const text = await res.text()
  return { res, text }
}

async function scenarioSplitRouting(mock) {
  const baseUrl = mock.baseUrl
  mock.requests.length = 0
  console.log("\n[smoke] Next.js split_routing")
  const env = {
    NEXT_TELEMETRY_DISABLED: "1",
    DEPLOYMENT_MODE: "split_routing",
    DRUPAL_BASE_URL: baseUrl,
  }

  await run(npmCmd(), ["run", "build"], { env: { ...process.env, ...env } })
  mock.requests.length = 0

  const port = await getFreePort()
  const server = await startNextServer(port, env)
  try {
    {
      const { res, text } = await fetchText(`http://127.0.0.1:${port}/about-us`)
      assert.equal(res.status, 200)
      assert.match(text, /About Us/)
      assert.match(text, /Hello from Drupal JSON:API/)

      const resolverCalled = mock.requests.some((r) => r.pathname === "/jsonapi/resolve" && r.resolvePath === "/about-us")
      if (!resolverCalled) {
        throw new Error(`Expected resolver call for /about-us. Seen: ${JSON.stringify(mock.requests, null, 2)}`)
      }

      const jsonapiCalled = mock.requests.some((r) => r.pathname === `/jsonapi/node/page/${mock.uuid}`)
      if (!jsonapiCalled) {
        throw new Error(`Expected JSON:API entity fetch. Seen: ${JSON.stringify(mock.requests, null, 2)}`)
      }
    }

    {
      const { res } = await fetchText(`http://127.0.0.1:${port}/does-not-exist`)
      assert.equal(res.status, 404)
    }

    {
      const { res } = await fetchText(`http://127.0.0.1:${port}/non-headless`, {
        redirect: "manual",
      })
      // Next's `redirect()` usually returns 307 in app-router routes.
      assert.ok(res.status === 307 || res.status === 308)
      assert.equal(res.headers.get("location"), `${baseUrl}/non-headless`)
    }
  } finally {
    await stop(server)
  }
}

async function scenarioFrontendFirst(mock) {
  const baseUrl = mock.baseUrl
  const proxySecret = mock.proxySecret
  mock.requests.length = 0
  console.log("\n[smoke] Next.js nextjs_first")
  const env = {
    NEXT_TELEMETRY_DISABLED: "1",
    DEPLOYMENT_MODE: "nextjs_first",
    DRUPAL_BASE_URL: baseUrl,
    DRUPAL_ORIGIN_URL: baseUrl,
    DRUPAL_PROXY_SECRET: proxySecret,
  }

  await run(npmCmd(), ["run", "build"], { env: { ...process.env, ...env } })
  mock.requests.length = 0

  const port = await getFreePort()
  const server = await startNextServer(port, env)
  try {
    {
      const { res, text } = await fetchText(`http://127.0.0.1:${port}/non-headless`)
      assert.equal(res.status, 200)
      assert.match(text, /Drupal HTML \(non-headless\)/)
    }

    {
      const { res, text } = await fetchText(`http://127.0.0.1:${port}/sites/default/files/test.txt`)
      assert.equal(res.status, 200)
      assert.equal(text, "TEST FILE")
    }

    {
      const { res, text } = await fetchText(`http://127.0.0.1:${port}/about-us`)
      assert.equal(res.status, 200)
      assert.match(text, /About Us/)
      assert.match(text, /Hello from Drupal JSON:API/)
    }

    // Ensure proxy secret was used when hitting Drupal origin.
    assert.ok(mock.requests.some((r) => r.pathname === "/non-headless" && r.proxySecretOk))
    assert.ok(mock.requests.some((r) => r.pathname === "/sites/default/files/test.txt" && r.proxySecretOk))
  } finally {
    await stop(server)
  }
}

const mock = await startMockDrupal()
try {
  await scenarioSplitRouting(mock)
  await scenarioFrontendFirst(mock)
  console.log("\n[smoke] OK")
} finally {
  await mock.close()
}
