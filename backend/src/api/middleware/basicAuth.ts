import type { RequestHandler } from "express";
import { timingSafeEqual } from "crypto";

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function basicAuth(opts: {
  user: string;
  pass: string;
  realm?: string;
}): RequestHandler {
  const realm = opts.realm ?? "restricted";

  return (req, res, next) => {
    const h = req.header("authorization") ?? "";
    const [scheme, encoded] = h.split(" ");
    if (scheme !== "Basic" || !encoded) {
      res.setHeader("WWW-Authenticate", `Basic realm="${realm}"`);
      return res.status(401).json({ error: "unauthorized" });
    }

    let decoded = "";
    try {
      decoded = Buffer.from(encoded, "base64").toString("utf8");
    } catch {
      res.setHeader("WWW-Authenticate", `Basic realm="${realm}"`);
      return res.status(401).json({ error: "unauthorized" });
    }

    const i = decoded.indexOf(":");
    const user = i >= 0 ? decoded.slice(0, i) : "";
    const pass = i >= 0 ? decoded.slice(i + 1) : "";

    if (!safeEqual(user, opts.user) || !safeEqual(pass, opts.pass)) {
      res.setHeader("WWW-Authenticate", `Basic realm="${realm}"`);
      return res.status(401).json({ error: "unauthorized" });
    }

    next();
  };
}

