"use client";

import { useEffect, useRef, useState } from "react";

const TRIES = 3;

/** The same URL with a retry marker, so the browser asks again instead of reusing the failed response. */
const bust = (url: string, n: number) => (n ? `${url}${url.includes("?") ? "&" : "?"}r=${n}` : url);

/**
 * A product photo that tries again when it fails. The photo store occasionally
 * refuses a request when a phone asks for many photos at once; without this the
 * shopper sees the browser's broken-image icon for good. Up to three quiet retries
 * (after 0.6s, 1.2s, 1.8s); the srcset follows so the retry fetches the same size.
 */
export function RetryImg(props: React.ImgHTMLAttributes<HTMLImageElement> & { src: string }) {
  const { src, srcSet, onError, ...rest } = props;
  const [attempt, setAttempt] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // a new photo (colour switch) starts fresh
  useEffect(() => {
    setAttempt(0);
  }, [src]);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img
      {...rest}
      src={bust(src, attempt)}
      srcSet={srcSet?.split(", ").map((part) => {
        const [url, w] = part.split(" ");
        return `${bust(url!, attempt)} ${w}`;
      }).join(", ")}
      onError={(e) => {
        onError?.(e);
        if (attempt >= TRIES) return;
        timer.current = setTimeout(() => setAttempt((a) => a + 1), 600 * (attempt + 1));
      }}
    />
  );
}
