import * as React from "react";

export const Logo = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9" />
    <path d="M16 3h5v5" />
    <path d="M12 3v9" />
    <rect x="15" y="6" width="6" height="6" fill="currentColor" filter="url(#blur)" />
    <defs>
        <filter id="blur">
            <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" />
        </filter>
    </defs>
  </svg>
);
